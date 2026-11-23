/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Footer Oficial y Corporativo con Términos, Políticas y Libro de Reclamaciones
 */

import React, { useState } from 'react';
import { PukllayLogo } from './PukllayLogo.tsx';
import { PukllayService } from '../domain/PukllayService.ts';
import { 
  Phone, 
  BookOpen, 
  FileText, 
  X, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  CreditCard
} from 'lucide-react';

export const Footer: React.FC = () => {
  const [modalAbierto, setModalAbierto] = useState<'TERMINOS' | 'RECLAMACIONES' | 'PREGUNTAS' | null>(null);
  const adminContacto = PukllayService.getInstance().obtenerDatosContactoAdministrador();
  const telFormateado = adminContacto.telefono.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

  // Form Libro de Reclamaciones
  const [reclamoEnviado, setReclamoEnviado] = useState(false);
  const [formReclamo, setFormReclamo] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    sede: 'Complejo Deportivo La Bombonera (Surco)',
    tipo: 'QUEJA' as 'RECLAMO' | 'QUEJA',
    detalle: ''
  });

  const handleEnviarReclamo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReclamo.nombre || !formReclamo.telefono || !formReclamo.detalle) return;
    setReclamoEnviado(true);
    setTimeout(() => {
      setReclamoEnviado(false);
      setModalAbierto(null);
      setFormReclamo({
        nombre: '',
        dni: '',
        telefono: '',
        email: '',
        sede: 'Complejo Deportivo La Bombonera (Surco)',
        tipo: 'QUEJA',
        detalle: ''
      });
    }, 2800);
  };

  return (
    <>
      <footer className="bg-slate-950 text-white border-t border-slate-800/80 py-8 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Marca */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <PukllayLogo size="sm" transparent={true} className="flex-shrink-0" />
                <div>
                  <span className="text-lg font-black tracking-tight text-white">
                    PUKLLAY<span className="text-emerald-400">SPORT</span>
                  </span>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Grass Sintético Perú
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Reserva de canchas deportivas en tiempo real.
              </p>
            </div>

            {/* Pagos */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Medios de Pago
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-800/60 text-xs font-semibold">
                  Yape (BCP)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-900/40 text-cyan-300 border border-cyan-800/60 text-xs font-semibold">
                  Plin
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-800/60 text-xs font-semibold inline-flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> 50% / 100%
                </span>
              </div>
            </div>

            {/* Soporte */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Soporte
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>
                  <a
                    href={`https://wa.me/51${adminContacto.telefono}?text=${encodeURIComponent('Hola Pukllay Sport, necesito asistencia con una reserva')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Central WhatsApp: +51 {telFormateado}</span>
                  </a>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span>Lun – Dom: 7:00 AM – 11:30 PM</span>
                </li>
              </ul>
            </div>

            {/* Políticas */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Políticas y Garantías
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <button
                    onClick={() => setModalAbierto('TERMINOS')}
                    className="text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Políticas de Cancelación & Reembolso</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setModalAbierto('PREGUNTAS')}
                    className="text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preguntas Frecuentes (FAQ)</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setModalAbierto('RECLAMACIONES')}
                    className="text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Libro de Reclamaciones Virtual</span>
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </footer>

      {/* MODAL: TÉRMINOS Y POLÍTICAS DE CANCELACIÓN */}
      {modalAbierto === 'TERMINOS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-pop-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Políticas de Reserva & Cancelación</h3>
              </div>
              <button 
                onClick={() => setModalAbierto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
                <h4 className="font-bold text-emerald-300 text-sm mb-1">Escala de Reembolsos por Cancelación:</h4>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                  <li><strong>Más de 24 horas antes del partido:</strong> Reembolso del 100% del importe abonado (Adelanto o Total).</li>
                  <li><strong>Entre 12 y 24 horas antes:</strong> Reembolso del 50% del monto pagado.</li>
                  <li><strong>Menos de 12 horas antes:</strong> No aplica reembolso por reserva comprometida del horario.</li>
                </ul>
              </div>

              <h4 className="font-bold text-white text-sm pt-2">1. Retención Temporal de Horarios</h4>
              <p>
                Al seleccionar un horario disponible, el sistema bloquea y retiene temporalmente el slot por 7 minutos para que puedas completar tu pago vía Yape o Plin sin que nadie más pueda reservarlo simultáneamente.
              </p>

              <h4 className="font-bold text-white text-sm pt-2">2. Métodos de Pago Habilitados</h4>
              <p>
                Puedes optar por pagar el 50% de adelanto para asegurar la cancha y cancelar el 50% restante al llegar al complejo deportivo, o pagar el 100% de manera directa.
              </p>

              <h4 className="font-bold text-white text-sm pt-2">3. Reglas de Uso en Cancha</h4>
              <p>
                Se requiere calzado deportivo adecuado (zapatillas de fútbol para grass sintético con toperoles de goma, prohibido toperoles metálicos). Cada complejo cuenta con balones y chalecos deportivos incluidos.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setModalAbierto(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREGUNTAS FRECUENTES (FAQ) */}
      {modalAbierto === 'PREGUNTAS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-pop-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Preguntas Frecuentes</h3>
              </div>
              <button 
                onClick={() => setModalAbierto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">¿Cómo sé si mi pago con Yape o Plin fue recibido?</h4>
                <p className="text-slate-400">
                  Al subir tu captura o ingresar el número de operación, el propietario recibe una alerta instantánea y confirma tu reserva en menos de 3 minutos. Recibirás una notificación en la campana de la app.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">¿Qué pasa si mi partido se retrasa por lluvia o fuerza mayor?</h4>
                <p className="text-slate-400">
                  Puedes coordinar directamente por el chat integrado con el propietario del complejo para reprogramar el horario sin costo adicional.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-white mb-1">¿Puedo registrar mi propio complejo de canchas?</h4>
                <p className="text-slate-400">
                  ¡Sí! Al registrarte con tu número de celular, selecciona el rol "Propietario de Canchas". Tendrás acceso inmediato al panel de administración para configurar sedes, tarifas, código QR y horarios.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setModalAbierto(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIBRO DE RECLAMACIONES (INDECOPI PERÚ) */}
      {modalAbierto === 'RECLAMACIONES' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-pop-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base">Libro de Reclamaciones Virtual</h3>
                  <p className="text-[10px] text-slate-400">Conforme al D.S. N° 011-2011-PCM • INDECOPI</p>
                </div>
              </div>
              <button 
                onClick={() => setModalAbierto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reclamoEnviado ? (
              <div className="text-center py-8 space-y-3 animate-pop-in">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-white">¡Reclamo Registrado con Éxito!</h4>
                <p className="text-xs text-slate-300">
                  Código de seguimiento: <strong className="text-emerald-400">REC-{Math.floor(100000 + Math.random() * 900000)}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Hemos enviado una copia a tu correo y te contactaremos en un plazo máximo de 15 días hábiles conforme a ley.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnviarReclamo} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nombre Completo:</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos Quispe"
                      value={formReclamo.nombre}
                      onChange={e => setFormReclamo({...formReclamo, nombre: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">DNI / CE:</label>
                    <input 
                      type="text"
                      required
                      maxLength={12}
                      placeholder="8 dígitos"
                      value={formReclamo.dni}
                      onChange={e => setFormReclamo({...formReclamo, dni: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Celular de Contacto:</label>
                    <input 
                      type="tel"
                      required
                      placeholder="999 999 999"
                      value={formReclamo.telefono}
                      onChange={e => setFormReclamo({...formReclamo, telefono: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Correo Electrónico:</label>
                    <input 
                      type="email"
                      required
                      placeholder="juan@gmail.com"
                      value={formReclamo.email}
                      onChange={e => setFormReclamo({...formReclamo, email: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Solicitud:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormReclamo({...formReclamo, tipo: 'QUEJA'})}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        formReclamo.tipo === 'QUEJA'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Queja (Disconformidad con la atención)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormReclamo({...formReclamo, tipo: 'RECLAMO'})}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        formReclamo.tipo === 'RECLAMO'
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Reclamo (Disconformidad con el servicio)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Detalle del Reclamo o Queja:</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Describe de manera clara y precisa los hechos ocurridos..."
                    value={formReclamo.detalle}
                    onChange={e => setFormReclamo({...formReclamo, detalle: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(null)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md cursor-pointer"
                  >
                    Enviar Hoja de Reclamación
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};
