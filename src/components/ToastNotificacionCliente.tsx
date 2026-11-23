/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Toast Flotante en Tiempo Real para Alertas de Cliente (Chat y Reservas Próximas)
 */

import React, { useEffect, useState } from 'react';
import { NotificacionCliente } from '../domain/PukllayService.ts';
import { Clock, MessageCircle, CheckCircle2, AlertTriangle, X, ArrowRight, Bell, Sparkles } from 'lucide-react';
import { reproducirSonidoNotificacionSMS } from '../utils/audioNotification.ts';

interface ToastNotificacionClienteProps {
  notificacion: NotificacionCliente | null;
  onCerrar: () => void;
  onAccion: (notificacion: NotificacionCliente) => void;
}

export const ToastNotificacionCliente: React.FC<ToastNotificacionClienteProps> = ({
  notificacion,
  onCerrar,
  onAccion,
}) => {
  const [progreso, setProgreso] = useState(100);

  useEffect(() => {
    if (!notificacion) return;

    // Reproducir chime suave
    reproducirSonidoNotificacionSMS();

    // Contador regresivo para autocierre en 7 segundos
    const duracion = 7000;
    const intervaloMs = 50;
    const paso = (intervaloMs / duracion) * 100;

    setProgreso(100);

    const timer = setInterval(() => {
      setProgreso((prev) => {
        if (prev <= paso) {
          clearInterval(timer);
          onCerrar();
          return 0;
        }
        return prev - paso;
      });
    }, intervaloMs);

    return () => clearInterval(timer);
  }, [notificacion]);

  if (!notificacion) return null;

  const getIcono = () => {
    switch (notificacion.tipo) {
      case 'CHAT_RESPUESTA_PROPIETARIO':
        return <MessageCircle className="w-5 h-5 text-sky-400" />;
      case 'RESERVA_PROXIMA':
        return <Clock className="w-5 h-5 text-emerald-400" />;
      case 'RESERVA_RETENCION_VENCE':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'RESERVA_CONFIRMADA':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'RESERVA_RECHAZADA':
        return <X className="w-5 h-5 text-rose-400" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getColorBorde = () => {
    switch (notificacion.tipo) {
      case 'CHAT_RESPUESTA_PROPIETARIO':
        return 'border-sky-500/60 shadow-sky-500/20';
      case 'RESERVA_PROXIMA':
        return 'border-emerald-500/60 shadow-emerald-500/25';
      case 'RESERVA_RETENCION_VENCE':
        return 'border-amber-500/60 shadow-amber-500/25';
      default:
        return 'border-emerald-500/60 shadow-emerald-500/20';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[95] max-w-sm w-full pointer-events-none px-2 sm:px-0">
      <div 
        className={`pointer-events-auto bg-slate-900/95 backdrop-blur-xl border-2 ${getColorBorde()} rounded-2xl shadow-2xl p-4 text-white animate-slide-down-bounce select-none overflow-hidden relative`}
      >
        {/* Barra de progreso de auto-cierre */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-75"
          style={{ width: `${progreso}%` }}
        />

        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              {getIcono()}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {notificacion.tipo === 'CHAT_RESPUESTA_PROPIETARIO' && 'Mensaje de Propietario'}
                {notificacion.tipo === 'RESERVA_PROXIMA' && 'Reserva Próxima a Iniciar'}
                {notificacion.tipo === 'RESERVA_RETENCION_VENCE' && 'Retención por Vencer'}
                {notificacion.tipo === 'RESERVA_CONFIRMADA' && 'Reserva Confirmada'}
                {notificacion.tipo === 'RESERVA_RECHAZADA' && 'Aviso de Reserva'}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">Ahora mismo</span>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-1.5 mb-3">
          <h4 className="text-xs font-bold text-white leading-snug">
            {notificacion.titulo}
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {notificacion.mensaje}
          </p>
          {(notificacion.sedeNombre || notificacion.canchaNombre) && (
            <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 pt-0.5">
              {notificacion.sedeNombre && (
                <span className="px-1.5 py-0.5 bg-slate-800/80 rounded-md border border-slate-700/60">
                  🏟️ {notificacion.sedeNombre}
                </span>
              )}
              {notificacion.tiempoRestanteTexto && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/30 font-semibold font-mono">
                  ⏰ {notificacion.tiempoRestanteTexto}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botón de Acción Directa */}
        {notificacion.accion && (
          <button
            onClick={() => {
              onAccion(notificacion);
              onCerrar();
            }}
            className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{notificacion.accion.texto}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

      </div>
    </div>
  );
};
