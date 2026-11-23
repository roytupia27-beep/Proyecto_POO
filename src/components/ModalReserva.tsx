/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - RF-06, RF-08, RF-09, RF-10: Modal de Reserva con Retención Temporal y Pago QR (50% / 100%)
 */

import React, { useState, useEffect } from 'react';
import { Cancha, Sede } from '../domain/Sede.ts';
import { HorarioSlot } from '../domain/Disponibilidad.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { Usuario, Propietario } from '../domain/Usuario.ts';
import { procesarImagenDispositivo } from '../utils/imageUtils.ts';
import confetti from 'canvas-confetti';
import { PukllayLogo } from './PukllayLogo.tsx';
import { 
  X, Calendar, Clock, DollarSign, QrCode, ShieldAlert, ShieldCheck, CheckCircle2, 
  AlertCircle, Copy, Check, Lock, ArrowRight, ArrowLeft, Trophy, CreditCard, Sparkles,
  Upload, Camera, Image as ImageIcon, Trash2, Eye
} from 'lucide-react';

interface ModalReservaProps {
  cancha: Cancha;
  sede: Sede;
  usuarioActual: Usuario | null;
  onCerrar: () => void;
  onReservaExitosa: () => void;
  onPedirLogin: () => void;
}

export const ModalReserva: React.FC<ModalReservaProps> = ({
  cancha,
  sede,
  usuarioActual,
  onCerrar,
  onReservaExitosa,
  onPedirLogin,
}) => {
  const service = PukllayService.getInstance();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(service.obtenerFechaHoyISO());
  const [slots, setSlots] = useState<HorarioSlot[]>([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState<HorarioSlot | null>(null);

  // RF-08: Estado de retención temporal
  const [slotRetenidoId, setSlotRetenidoId] = useState<string | null>(null);
  const [tiempoRestanteSegundos, setTiempoRestanteSegundos] = useState<number>(0);
  const [mensajeRetencion, setMensajeRetencion] = useState<string | null>(null);
  const [errorRetencion, setErrorRetencion] = useState<string | null>(null);

  // Paso del wizard: 1 = Elegir horario, 2 = Pago y QR, 3 = Confirmado
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // Opciones de pago: 50% o 100%
  const [tipoPago, setTipoPago] = useState<'ADELANTO_50' | 'TOTAL_100'>('ADELANTO_50');
  const [metodoPago, setMetodoPago] = useState<'YAPE' | 'PLIN' | 'TRANSFERENCIA'>('YAPE');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [comprobanteArchivo, setComprobanteArchivo] = useState<string | null>(null);
  const [cargandoComprobante, setCargandoComprobante] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reservaConfirmadaId, setReservaConfirmadaId] = useState<string | null>(null);

  // Datos del propietario para el QR
  const propietario = service.obtenerTodosUsuarios().find(
    u => u.id === sede.propietarioId
  ) as Propietario | undefined;
  const datosPago = propietario?.datosPago || {
    tipoBilletera: 'YAPE',
    numeroTelefono: sede.telefonoContacto || '987112233',
    titular: sede.nombre,
    bancoNombre: 'BCP',
    numeroCuenta: '193-98765432-0-12',
    numeroCci: '002-193-009876543201-14',
    qrImagenUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YAPE_PUKLLAY_SPORT_PAGO',
  };

  // Cargar slots al cambiar fecha
  const recargarSlots = () => {
    const list = service.obtenerSlotsCancha(cancha.id, fechaSeleccionada);
    setSlots(list);
  };

  useEffect(() => {
    recargarSlots();
  }, [cancha.id, fechaSeleccionada]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const unsub = service.suscribir(() => {
      recargarSlots();
    });
    return () => unsub();
  }, [cancha.id, fechaSeleccionada]);

  // RF-08: Contador de retención temporal (5-10 min)
  useEffect(() => {
    if (!slotRetenidoId) return;

    const interval = setInterval(() => {
      const ret = service.obtenerRetencion(slotRetenidoId);
      if (!ret || ret.expira <= Date.now()) {
        // Expiró
        setSlotRetenidoId(null);
        setSlotSeleccionado(null);
        setTiempoRestanteSegundos(0);
        setErrorRetencion('El tiempo de retención (7 min) ha expirado y el horario se ha liberado.');
        setPaso(1);
        recargarSlots();
        clearInterval(interval);
      } else {
        const seg = Math.max(0, Math.floor((ret.expira - Date.now()) / 1000));
        setTiempoRestanteSegundos(seg);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [slotRetenidoId]);

  // RF-08 y RF-09: Seleccionar y Retener Slot
  const handleSeleccionarSlot = (slot: HorarioSlot) => {
    setErrorRetencion(null);
    setMensajeRetencion(null);

    if (!usuarioActual) {
      onPedirLogin();
      return;
    }

    if (slot.estado === 'RESERVADO') {
      setErrorRetencion('Este horario ya se encuentra reservado y confirmado.');
      return;
    }
    if (slot.estado === 'BLOQUEADO') {
      setErrorRetencion(`Horario bloqueado por el administrador: "${slot.motivoBloqueo || 'Mantenimiento'}"`);
      return;
    }

    // Si ya teníamos otro slot retenido, liberarlo primero
    if (slotRetenidoId && slotRetenidoId !== slot.id) {
      service.liberarRetencion(slotRetenidoId, usuarioActual.id);
    }

    // RF-09: Intentar retención atómica
    const res = service.intentarRetenerSlot(
      cancha.id,
      fechaSeleccionada,
      slot.horaInicio,
      usuarioActual.id,
      7 // 7 minutos de retención
    );

    if (!res.exito) {
      setErrorRetencion(res.mensaje);
      recargarSlots();
      return;
    }

    setSlotRetenidoId(res.slotId);
    setSlotSeleccionado(slot);
    setMensajeRetencion(res.mensaje);
    setTiempoRestanteSegundos(7 * 60);
    recargarSlots();
  };

  const handleCopiarTexto = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleSubirComprobante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargandoComprobante(true);
      const dataUrl = await procesarImagenDispositivo(file, 1200, 0.85);
      setComprobanteArchivo(dataUrl);
    } catch (err: any) {
      setErrorRetencion(err.message || 'Error al procesar el comprobante');
    } finally {
      setCargandoComprobante(false);
    }
  };

  const handleConfirmarPagoYReserva = () => {
    if (!usuarioActual) {
      onPedirLogin();
      return;
    }
    if (!slotSeleccionado) {
      setErrorRetencion('Debes seleccionar un horario.');
      return;
    }

    setProcesandoPago(true);

    try {
      const nuevaReserva = service.crearReservaConPago({
        clienteId: usuarioActual.id,
        canchaId: cancha.id,
        fecha: fechaSeleccionada,
        horaInicio: slotSeleccionado.horaInicio,
        tipoPago: tipoPago,
        metodoPago: metodoPago,
        numeroOperacion: numeroOperacion.trim() || `OP-${Math.floor(10000 + Math.random() * 90000)}`,
        comprobanteUrl: comprobanteArchivo || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
      });

      setReservaConfirmadaId(nuevaReserva.id);
      setPaso(3);
      setSlotRetenidoId(null);
      setProcesandoPago(false);

      // Disparar confetti festivo
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      onReservaExitosa();
    } catch (e: any) {
      setProcesandoPago(false);
      setErrorRetencion(e.message || 'Error al procesar la reserva.');
    }
  };

  const precioTotal = cancha.precioBaseHora;
  const montoPagar = tipoPago === 'ADELANTO_50' ? Math.round(precioTotal * 0.5) : precioTotal;
  const saldoPendiente = precioTotal - montoPagar;

  const formatoTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header con foto de césped e info */}
        <div className="relative bg-slate-900 text-white p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                  <PukllayLogo size="xs" transparent={true} className="w-3.5 h-3.5" />
                  Pukllay Sport
                </span>
                <span className="text-xs text-slate-300">
                  {sede.nombre}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {cancha.nombre}
              </h2>
              <p className="text-xs text-emerald-300 font-mono mt-0.5">
                S/. {cancha.precioBaseHora} / hora • Reserva con solo el 50%
              </p>
            </div>

            <button
              onClick={() => {
                if (slotRetenidoId && usuarioActual) {
                  service.liberarRetencion(slotRetenidoId, usuarioActual.id);
                }
                onCerrar();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de progreso de Pasos */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-xs font-semibold">
            <span className={`flex items-center gap-1.5 ${paso >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                paso >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>1</span>
              Horarios
            </span>
            <span className="w-6 h-0.5 bg-slate-800"></span>
            <span className={`flex items-center gap-1.5 ${paso >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                paso >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>2</span>
              Pago QR (50% / 100%)
            </span>
            <span className="w-6 h-0.5 bg-slate-800"></span>
            <span className={`flex items-center gap-1.5 ${paso === 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                paso === 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>3</span>
              Ticket Digital
            </span>
          </div>
        </div>

        {/* ALERTA DE RETENCIÓN ACTIVA (RF-08) */}
        {slotRetenidoId && paso < 3 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <Lock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Horario retenido temporalmente: <strong>{slotSeleccionado?.horaInicio} a {slotSeleccionado?.horaFin}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-500/20 px-2.5 py-1 rounded-lg text-amber-900 font-mono font-black">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatoTiempo(tiempoRestanteSegundos)}</span>
            </div>
          </div>
        )}

        {/* Notificación de Error */}
        {errorRetencion && (
          <div className="m-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{errorRetencion}</p>
          </div>
        )}

        {/* CUERPO PRINCIPAL SEGÚN PASO */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
          
          {/* PASO 1: SELECCIÓN DE HORARIOS (RF-06) */}
          {paso === 1 && (
            <div>
              {/* Selector de Fecha */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Selecciona Fecha para el Partido
                  </label>
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    min={service.obtenerFechaHoyISO()}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="text-sm font-bold px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                {/* Leyenda de Disponibilidad */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span> Libre
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-3 h-3 rounded bg-amber-400"></span> Retenido (En Pago)
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-3 h-3 rounded bg-rose-500"></span> Reservado
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="w-3 h-3 rounded bg-slate-300"></span> Bloqueado
                  </span>
                </div>
              </div>

              {/* Grilla de Slots de Horario */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Horarios Disponibles para el {fechaSeleccionada}:
                </h4>

                {slots.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                    <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-sm">No hay horarios configurados para este día.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {slots.map((slot) => {
                      const esMioRetenido = slotRetenidoId === slot.id;
                      const estaLibre = slot.estado === 'LIBRE';
                      const estaRetenido = slot.estado === 'RETENIDO' && !esMioRetenido;
                      const estaReservado = slot.estado === 'RESERVADO';
                      const estaBloqueado = slot.estado === 'BLOQUEADO';

                      return (
                        <button
                          key={slot.id}
                          disabled={estaReservado || estaBloqueado || estaRetenido}
                          onClick={() => handleSeleccionarSlot(slot)}
                          className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                            esMioRetenido
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                              : estaLibre
                              ? 'bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200'
                              : estaRetenido
                              ? 'bg-amber-50 text-amber-900 border-amber-300 opacity-80 cursor-not-allowed'
                              : estaReservado
                              ? 'bg-rose-50 text-rose-900 border-rose-200 opacity-70 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm font-mono">
                              {slot.horaInicio}
                            </span>
                            <span className="text-[10px] font-bold">
                              {slot.horaFin}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 text-[10px] font-bold">
                            <span>S/. {slot.precio}</span>
                            <span>
                              {esMioRetenido
                                ? '✓ Retenido'
                                : estaLibre
                                ? 'Libre'
                                : estaRetenido
                                ? 'En pago'
                                : estaReservado
                                ? 'Ocupado'
                                : 'Bloqueado'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botón para avanzar a Pago */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {slotSeleccionado ? (
                    <p className="text-xs text-slate-700 font-semibold">
                      Horario seleccionado: <strong className="text-emerald-700">{slotSeleccionado.horaInicio} - {slotSeleccionado.horaFin}</strong> (S/. {slotSeleccionado.precio})
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Selecciona un horario libre para continuar.
                    </p>
                  )}
                </div>

                <button
                  disabled={!slotSeleccionado || !slotRetenidoId}
                  onClick={() => setPaso(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Continuar a Pago QR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: MODALIDAD DE PAGO (50% O 100%) Y CÓDIGO QR */}
          {paso === 2 && slotSeleccionado && (
            <div>
              {/* Sello de Confianza Antifraude / Protección */}
              {sede.esVerificada ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 mb-5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5 flex-wrap">
                        <span>✓ Sede Verificada por el Administrador • Check Oficial</span>
                        <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-md font-bold">
                          {sede.selloSeguridad || 'PUKLLAY-CHECK-ADMIN'}
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Complejo deportivo auditado y verificado directamente por el Administrador. Sede oficial para pagos de adelanto con comprobante.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-300 text-emerald-950 mb-5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5 flex-wrap">
                        <span>Reserva con Adelanto Protegido • Pukllay Sport</span>
                        <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold">
                          ADELANTO PROTEGIDO
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Asegura tu cancha con el 50% de adelanto o el 100% total. La plataforma audita y registra tu transacción con comprobante verificado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Modalidad: 50% Adelanto o 100% Total */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Modalidad de Pago para asegurar la cancha:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setTipoPago('ADELANTO_50')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      tipoPago === 'ADELANTO_50'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs uppercase text-emerald-800">
                        Pagar Adelanto 50%
                      </span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      S/. {Math.round(precioTotal * 0.5)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Saldo restante de S/. {Math.round(precioTotal * 0.5)} se abona en la cancha antes de jugar.
                    </p>
                  </div>

                  <div
                    onClick={() => setTipoPago('TOTAL_100')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      tipoPago === 'TOTAL_100'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs uppercase text-slate-800">
                        Pago Total 100%
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 font-mono">
                      S/. {precioTotal}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pagas la totalidad del turno. Cero trámites pendientes al llegar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Caja de Pago con QR Oficial del Propietario */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 mb-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-sm">
                      QR de Pago Oficial - {datosPago.tipoBilletera} / Plin
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Monto a transferir: S/. {montoPagar}.00
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Imagen del Código QR */}
                  <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-lg flex items-center justify-center flex-shrink-0">
                    <img
                      src={datosPago.qrImagenUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=YAPE_PUKLLAY_${datosPago.numeroTelefono}`}
                      alt="QR de Pago"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Datos del Propietario / Cuenta */}
                  <div className="flex-1 text-xs space-y-1.5 w-full">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Titular:</span>
                      <p className="font-bold text-white text-sm">{datosPago.titular}</p>
                    </div>

                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block font-bold">Celular Yape / Plin:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">{datosPago.numeroTelefono}</span>
                      </div>
                      <button
                        onClick={() => handleCopiarTexto(datosPago.numeroTelefono || '', 'celular')}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiado === 'celular' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiado === 'celular' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    {datosPago.numeroCuenta && (
                      <div className="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block font-bold">{datosPago.bancoNombre} Cuenta:</span>
                          <span className="font-mono text-slate-200">{datosPago.numeroCuenta}</span>
                        </div>
                        <button
                          onClick={() => handleCopiarTexto(datosPago.numeroCuenta || '', 'cuenta')}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiado === 'cuenta' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiado === 'cuenta' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Registro de Comprobante / Número de Operación y Carga desde Dispositivo */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Ingresa tu Número de Operación o Referencia:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. OP-49201 ó 987123"
                      value={numeroOperacion}
                      onChange={(e) => setNumeroOperacion(e.target.value)}
                      className="flex-1 text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setNumeroOperacion(`OP-${Math.floor(10000 + Math.random() * 90000)}`)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Genera un código de referencia bancaria automáticamente"
                    >
                      Autogenerar Código
                    </button>
                  </div>
                </div>

                {/* Carga de Comprobante Directo desde el Dispositivo */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      Captura o Foto del Comprobante (Desde tu Dispositivo):
                    </span>
                    {comprobanteArchivo && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Foto Cargada
                      </span>
                    )}
                  </label>

                  <input
                    type="file"
                    id="comprobanteFileInput"
                    accept="image/*"
                    onChange={handleSubirComprobante}
                    className="hidden"
                  />

                  {comprobanteArchivo ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-300">
                      <img
                        src={comprobanteArchivo}
                        alt="Comprobante cargado"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-slate-800">Comprobante de pago listo</p>
                        <p className="text-[11px] text-slate-500">Se enviará al dueño del grass para verificar tu abono.</p>
                        <div className="flex items-center gap-2 mt-1">
                          <label
                            htmlFor="comprobanteFileInput"
                            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Cambiar imagen
                          </label>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setComprobanteArchivo(null)}
                            className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="comprobanteFileInput"
                      className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        cargandoComprobante
                          ? 'bg-slate-100 border-slate-300 text-slate-400'
                          : 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950">
                          {cargandoComprobante ? 'Procesando imagen...' : 'Subir captura o foto desde tu celular / PC'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        Toma foto de tu app de Yape/Plin o selecciona de tu galería de fotos.
                      </p>
                    </label>
                  )}

                  <p className="text-[11px] text-slate-500 mt-2">
                    🔔 El propietario recibirá una notificación en su panel con tu comprobante y confirmará el pago para asegurar tu turno.
                  </p>
                </div>
              </div>

              {/* POLÍTICA DE CANCELACIÓN VISIBLE */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs mb-5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                  <ShieldAlert className="w-4 h-4 text-emerald-700" />
                  <span>Política Oficial de Cancelación y Reembolso</span>
                </div>
                <ul className="text-[11px] space-y-0.5 text-emerald-800 list-disc list-inside">
                  <li><strong>Reembolso total (100%):</strong> Si cancelas con más de 24 horas de anticipación.</li>
                  <li><strong>Reembolso del 50%:</strong> Si cancelas entre 12 y 24 horas antes del partido.</li>
                  <li><strong>Sin reembolso (0%):</strong> Con menos de 12 horas de antelación.</li>
                </ul>
              </div>

              {/* Botones de Navegación */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPaso(1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a horarios</span>
                </button>

                <button
                  disabled={procesandoPago}
                  onClick={handleConfirmarPagoYReserva}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {procesandoPago ? (
                    <span>Confirmando...</span>
                  ) : (
                    <>
                      <span>
                        {tipoPago === 'ADELANTO_50'
                          ? `Confirmar Reserva con Adelanto (S/. ${montoPagar}.00)`
                          : `Confirmar Reserva Total (S/. ${montoPagar}.00)`}
                      </span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: TICKET DIGITAL DE CONFIRMACIÓN */}
          {paso === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider">
                {tipoPago === 'ADELANTO_50' ? '¡Reserva con Adelanto Enviada!' : '¡Reserva Total Enviada!'}
              </span>

              <h3 className="text-xl font-black text-slate-900 mt-2">
                ¡Solicitud de Reserva y Comprobante Enviados!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                El propietario ha recibido la notificación con tu comprobante para verificar tu abono de <strong>S/. {montoPagar}.00</strong>. Tu horario queda bloqueado y se confirmará oficialmente en breves minutos.
              </p>

              {/* Ticket Digital */}
              <div className="bg-slate-50 border-2 border-dashed border-emerald-300 rounded-3xl p-5 my-5 max-w-md mx-auto text-left shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <PukllayLogo size="xs" transparent={true} className="w-5 h-5 flex-shrink-0" />
                    <span>Pukllay Sport Voucher</span>
                  </div>
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {reservaConfirmadaId || 'RES-PUKLLAY'}
                  </span>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sede:</span>
                    <strong className="text-slate-800">{sede.nombre}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cancha:</span>
                    <strong className="text-slate-800">{cancha.nombre}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha y Hora:</span>
                    <strong className="text-emerald-700 font-mono">
                      {fechaSeleccionada} • {slotSeleccionado?.horaInicio} a {slotSeleccionado?.horaFin}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monto Abonado:</span>
                    <strong className="text-slate-900 font-mono text-emerald-700">
                      S/. {montoPagar}.00 ({tipoPago === 'ADELANTO_50' ? 'Adelanto 50%' : 'Pago Total 100%'})
                    </strong>
                  </div>
                  {saldoPendiente > 0 && (
                    <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded-xl font-bold">
                      <span>Saldo restante a pagar en cancha:</span>
                      <span className="font-mono">S/. {saldoPendiente}.00</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Jugador: {usuarioActual?.nombre}</span>
                  <span>Cel: {usuarioActual?.telefono}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onCerrar}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Cerrar y Ver Mis Reservas
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
