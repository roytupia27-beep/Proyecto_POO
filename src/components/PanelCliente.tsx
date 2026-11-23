/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - RF-10 & RF-11: Panel del Cliente, Historial de Reservas y Cancelación con Política
 */

import React, { useState, useEffect } from 'react';
import { Usuario } from '../domain/Usuario.ts';
import { Reserva, ResultadoCalculoCancelacion } from '../domain/Reserva.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { 
  Calendar, Clock, DollarSign, AlertTriangle, ShieldCheck, 
  MapPin, CheckCircle2, XCircle, ArrowRight, Trophy, Sparkles 
} from 'lucide-react';

interface PanelClienteProps {
  usuarioActual: Usuario;
  onExplorarCanchas: () => void;
}

export const PanelCliente: React.FC<PanelClienteProps> = ({
  usuarioActual,
  onExplorarCanchas,
}) => {
  const service = PukllayService.getInstance();
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = service.suscribir(() => setTick(t => t + 1));
    return () => unsub();
  }, [service]);

  const reservas = service.obtenerReservasCliente(usuarioActual.id);
  const hoyISO = service.obtenerFechaHoyISO();
  const reservasHoy = reservas.filter(r => r.fecha === hoyISO && r.estado === 'CONFIRMADA');
  const reservasPendientes = reservas.filter(r => r.estado === 'PENDIENTE_PAGO');

  // Estado para el modal de cancelación (RF-10)
  const [reservaACancelar, setReservaACancelar] = useState<Reserva | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('Cambio de horario con el equipo');
  const [resultadoCancelacion, setResultadoCancelacion] = useState<ResultadoCalculoCancelacion | null>(null);
  const [mensajeNotificacion, setMensajeNotificacion] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const handleAbrirCancelacion = (reserva: Reserva) => {
    setReservaACancelar(reserva);
    const calculo = reserva.precalcularCancelacion(new Date());
    setResultadoCancelacion(calculo);
  };

  const handleConfirmarCancelacion = () => {
    if (!reservaACancelar) return;

    try {
      const resultado = service.cancelarReserva(reservaACancelar.id, motivoCancelacion);
      setReservaACancelar(null);
      setMensajeError(null);
      setMensajeNotificacion(`Reserva cancelada exitosamente. ${resultado.explicacion}`);
      setTimeout(() => setMensajeNotificacion(null), 6000);
    } catch (e: any) {
      setReservaACancelar(null);
      setMensajeError(e.message || 'Error al cancelar la reserva');
      setTimeout(() => setMensajeError(null), 5000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
              Mi Cuenta Pelotero Pukllay
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Hola, {usuarioActual.nombre} ⚽
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Aquí puedes ver tus partidos programados, saldos pendientes y gestionar cancelaciones con política oficial de reembolso.
            </p>
          </div>

          <button
            onClick={onExplorarCanchas}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all self-start sm:self-center"
          >
            <span>Reservar Nueva Cancha</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerta de Error de Cancelación */}
      {mensajeError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Alerta de Notificación de Cancelación */}
      {mensajeNotificacion && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{mensajeNotificacion}</span>
        </div>
      )}

      {/* Alerta Destacada: Partido Próximo para Hoy */}
      {reservasHoy.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-2 border-emerald-500/80 text-white shadow-xl shadow-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> ¡Alerta de Partido Próximo!
              </span>
              <h4 className="text-sm font-black text-white">
                Tienes partido HOY a las {reservasHoy[0].horaInicio} en {reservasHoy[0].sedeNombre}
              </h4>
              <p className="text-[11px] text-slate-300">
                {reservasHoy[0].canchaNombre} • Recuerda llegar 15 minutos antes con tu equipo.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold self-start sm:self-center">
            Hoy {reservasHoy[0].horaInicio} - {reservasHoy[0].horaFin}
          </span>
        </div>
      )}

      {/* Alerta Destacada: Retención Temporal por Vencer */}
      {reservasPendientes.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500/80 text-amber-200 shadow-lg flex items-center gap-3 animate-slide-down-bounce">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">
              Retención de reserva pendiente en {reservasPendientes[0].sedeNombre}
            </h4>
            <p className="text-[11px] text-amber-300/90">
              {reservasPendientes[0].canchaNombre} • Tienes 15 minutos para subir el comprobante de pago o el cupo se liberará automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Reservas (RF-11) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
          <span>Historial de Reservas ({reservas.length})</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Actualizado en tiempo real</span>
        </h3>

        {reservas.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No tienes reservas activas todavía</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Encuentra las mejores canchas de grass sintético con ubicación en Google Maps y reserva tu turno hoy mismo.
            </p>
            <button
              onClick={onExplorarCanchas}
              className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              Explorar Grass Cercano
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reservas.map((res) => {
              const esCancelada = res.estado === 'CANCELADA';
              return (
                <div
                  key={res.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    esCancelada
                      ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-70'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          res.estado === 'CONFIRMADA'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : esCancelada
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                        }`}>
                          {res.estado === 'CONFIRMADA'
                            ? '✓ Confirmada por el Dueño'
                            : esCancelada
                            ? '✕ Cancelada'
                            : '⏳ Pendiente Confirmación del Dueño'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Código: {res.id}
                        </span>
                      </div>
                      {res.estado === 'PENDIENTE_PAGO' && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mb-1">
                          🔔 Hemos enviado una notificación al dueño del grass con tu número de comprobante para su confirmación.
                        </p>
                      )}
                      <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                        {res.canchaNombre}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{res.sedeNombre}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{res.fecha}</span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{res.horaInicio} - {res.horaFin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles Económicos (50% Adelanto / Saldo en Cancha) */}
                  <div className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Precio Total:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">S/. {res.precioTotal}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Abonado:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        S/. {res.montoPagado} ({res.tipoPagoModalidad === 'ADELANTO_50' ? '50%' : '100%'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo en Cancha:</span>
                      <span className={`font-mono font-bold ${res.saldoPendiente > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                        {res.saldoPendiente > 0 ? `S/. ${res.saldoPendiente}` : 'Completado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Comprobante:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {res.transacciones[0]?.numeroOperacion || 'Verificado'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones y Cancelación con Política (RF-10) */}
                  {!esCancelada && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        ✓ Presenta tu DNI o celular al ingresar
                      </div>

                      <button
                        onClick={() => handleAbrirCancelacion(res)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  )}

                  {esCancelada && res.montoReembolsado !== undefined && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-rose-700 font-medium">
                      Cancelada. Reembolso calculado según política: <strong>S/. {res.montoReembolsado}</strong>
                      {res.motivoCancelacion && ` • Motivo: ${res.motivoCancelacion}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CANCELACIÓN CON CÁLCULO DE REEMBOLSO */}
      {reservaACancelar && resultadoCancelacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Cancelar Reserva</span>
              </div>
              <button
                onClick={() => setReservaACancelar(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              ¿Estás seguro de cancelar tu reserva en <strong>{reservaACancelar.canchaNombre}</strong> para el <strong>{reservaACancelar.fecha} ({reservaACancelar.horaInicio})</strong>?
            </p>

            {/* Cálculo de la Política RF-10 */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Antelación al partido:</span>
                <strong className="text-slate-800">{resultadoCancelacion.horasDeAntelacion} horas</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto total pagado:</span>
                <strong className="text-slate-800 font-mono">S/. {reservaACancelar.montoPagado}</strong>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Porcentaje de Reembolso:</span>
                <span className="bg-emerald-100 px-2 py-0.5 rounded">{resultadoCancelacion.porcentajeReembolso}%</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                <span>Monto a Devolver:</span>
                <span className="text-emerald-700 font-mono">S/. {resultadoCancelacion.montoReembolso}.00</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {resultadoCancelacion.explicacion}
              </p>
            </div>

            {/* Motivo */}
            <div className="mb-4 text-xs">
              <label className="block font-bold text-slate-700 mb-1">Motivo de la cancelación:</label>
              <input
                type="text"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setReservaACancelar(null)}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelacion}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
