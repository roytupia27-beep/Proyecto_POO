/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Centro de Notificaciones & Alertas en Tiempo Real para el Cliente
 */

import React, { useState } from 'react';
import { NotificacionCliente, PukllayService } from '../domain/PukllayService.ts';
import { 
  Bell, Clock, MessageCircle, CheckCircle2, AlertTriangle, 
  X, Check, ArrowRight, Sparkles, Filter, ExternalLink, RefreshCw 
} from 'lucide-react';

interface CentroNotificacionesClienteProps {
  clienteId: string;
  isOpen: boolean;
  onClose: () => void;
  onAbrirChat: (sedeId?: string, canchaId?: string, remitenteId?: string) => void;
  onVerReserva: (reservaId?: string) => void;
}

export const CentroNotificacionesCliente: React.FC<CentroNotificacionesClienteProps> = ({
  clienteId,
  isOpen,
  onClose,
  onAbrirChat,
  onVerReserva,
}) => {
  const service = PukllayService.getInstance();
  const [filtro, setFiltro] = useState<'TODAS' | 'RESERVAS' | 'CHAT'>('TODAS');
  const [mensajeSimulacion, setMensajeSimulacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const todas = service.obtenerNotificacionesCliente(clienteId);
  const noLeidasCount = todas.filter(n => !n.leida).length;

  const notificacionesFiltradas = todas.filter(n => {
    if (filtro === 'RESERVAS') {
      return n.tipo === 'RESERVA_PROXIMA' || n.tipo === 'RESERVA_RETENCION_VENCE' || n.tipo === 'RESERVA_CONFIRMADA' || n.tipo === 'RESERVA_RECHAZADA';
    }
    if (filtro === 'CHAT') {
      return n.tipo === 'CHAT_RESPUESTA_PROPIETARIO';
    }
    return true;
  });

  const handleMarcarLeida = (notif: NotificacionCliente) => {
    service.marcarNotificacionClienteLeida(notif.id);
  };

  const handleMarcarTodasLeidas = () => {
    service.marcarTodasNotificacionesClienteLeidas(clienteId);
  };

  const handleAccion = (notif: NotificacionCliente) => {
    service.marcarNotificacionClienteLeida(notif.id);
    if (notif.accion?.tipo === 'ABRIR_CHAT') {
      onAbrirChat(notif.sedeId, notif.canchaId);
      onClose();
    } else if (notif.accion?.tipo === 'VER_RESERVA' || notif.accion?.tipo === 'PAGAR_RESERVA') {
      onVerReserva(notif.reservaId);
      onClose();
    }
  };

  const handleSimularChat = () => {
    service.simularRespuestaPropietario(clienteId);
    setMensajeSimulacion('¡Se envió un mensaje simulado del propietario con alerta sonora!');
    setTimeout(() => setMensajeSimulacion(null), 3000);
  };

  const handleSimularReserva = () => {
    service.simularAlertaReservaProxima(clienteId);
    setMensajeSimulacion('¡Se generó una alerta de reserva próxima a iniciar con sonido!');
    setTimeout(() => setMensajeSimulacion(null), 3000);
  };

  const formatearTiempoRelativo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diffMs / 60000);
      if (min < 1) return 'Hace un momento';
      if (min < 60) return `Hace ${min} min`;
      const horas = Math.floor(min / 60);
      if (horas < 24) return `Hace ${horas} h`;
      return 'Hoy';
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white animate-slide-down-bounce mt-12 sm:mt-14"
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/30">
              <Bell className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Alertas & Notificaciones</h3>
                {noLeidasCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black animate-pulse">
                    {noLeidasCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Avisos de vencimiento de reservas y respuestas de propietarios
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros y Acción rápida de marcar leídas */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFiltro('TODAS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filtro === 'TODAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({todas.length})
            </button>
            <button
              onClick={() => setFiltro('RESERVAS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filtro === 'RESERVAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⏰ Reservas
            </button>
            <button
              onClick={() => setFiltro('CHAT')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filtro === 'CHAT' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
          </div>

          {noLeidasCount > 0 && (
            <button
              onClick={handleMarcarTodasLeidas}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marcar todas</span>
            </button>
          )}
        </div>

        {/* Mensaje de simulación interactiva */}
        {mensajeSimulacion && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/70 border border-emerald-600/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-pop-in">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{mensajeSimulacion}</span>
          </div>
        )}

        {/* Lista de Notificaciones */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {notificacionesFiltradas.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto" />
              <p className="text-xs font-semibold text-white">¡Estás al día con tus reservas!</p>
              <p className="text-[11px] text-slate-500">
                Cuando tu reserva esté por vencer o el dueño te responda, lo verás aquí en tiempo real.
              </p>
            </div>
          ) : (
            notificacionesFiltradas.map((notif) => {
              const esChat = notif.tipo === 'CHAT_RESPUESTA_PROPIETARIO';
              const esProxima = notif.tipo === 'RESERVA_PROXIMA';
              const esVencimiento = notif.tipo === 'RESERVA_RETENCION_VENCE';

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all text-xs relative ${
                    !notif.leida
                      ? esChat
                        ? 'bg-sky-950/40 border-sky-600/60 shadow-md shadow-sky-950/30'
                        : esVencimiento
                          ? 'bg-amber-950/40 border-amber-600/60 shadow-md shadow-amber-950/30'
                          : 'bg-emerald-950/40 border-emerald-600/60 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Punto no leído */}
                  {!notif.leida && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}

                  <div className="flex items-start gap-2.5">
                    {/* Icono temático */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      esChat 
                        ? 'bg-sky-500/20 text-sky-400' 
                        : esVencimiento 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {esChat && <MessageCircle className="w-4 h-4" />}
                      {esProxima && <Clock className="w-4 h-4" />}
                      {esVencimiento && <AlertTriangle className="w-4 h-4" />}
                      {notif.tipo === 'RESERVA_CONFIRMADA' && <CheckCircle2 className="w-4 h-4" />}
                      {notif.tipo === 'RESERVA_RECHAZADA' && <X className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between pr-3">
                        <span className="font-black text-white text-xs leading-snug">
                          {notif.titulo}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {notif.mensaje}
                      </p>

                      {/* Detalles de sede o tiempo */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        {notif.sedeNombre && (
                          <span className="px-1.5 py-0.5 bg-slate-800 rounded-md text-slate-300 border border-slate-700">
                            🏟️ {notif.sedeNombre}
                          </span>
                        )}
                        {notif.tiempoRestanteTexto && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 font-semibold font-mono">
                            ⏰ {notif.tiempoRestanteTexto}
                          </span>
                        )}
                        <span className="text-slate-500 ml-auto font-mono text-[9px]">
                          {formatearTiempoRelativo(notif.timestamp)}
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 pt-2">
                        {notif.accion && (
                          <button
                            onClick={() => handleAccion(notif)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-[11px] shadow-sm flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            <span>{notif.accion.texto}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {!notif.leida && (
                          <button
                            onClick={() => handleMarcarLeida(notif)}
                            className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Marcar leída
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra de Pruebas Rápidas e Interactivas */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Probar Alertas en Tiempo Real (Simulador):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSimularChat}
              className="py-1.5 px-2 bg-sky-950/70 hover:bg-sky-900 border border-sky-700/60 rounded-xl text-sky-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Dueño responde chat</span>
            </button>
            <button
              onClick={handleSimularReserva}
              className="py-1.5 px-2 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reserva próxima a vencer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
