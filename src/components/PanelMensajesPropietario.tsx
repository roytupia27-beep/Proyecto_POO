/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Panel de Mensajería y Chat en Tiempo Real para el Propietario
 */

import React, { useState, useEffect, useRef } from 'react';
import { PukllayService } from '../domain/PukllayService.ts';
import { Usuario } from '../domain/Usuario.ts';
import { MensajeChat } from '../domain/Mensaje.ts';
import { 
  MessageCircle, Send, Check, CheckCheck, Phone, 
  ExternalLink, Search, Clock, User, ShieldCheck, Sparkles 
} from 'lucide-react';

interface PanelMensajesPropietarioProps {
  usuarioActual: Usuario;
}

export const PanelMensajesPropietario: React.FC<PanelMensajesPropietarioProps> = ({
  usuarioActual
}) => {
  const service = PukllayService.getInstance();
  const [conversaciones, setConversaciones] = useState(
    service.obtenerTodasConversacionesUsuario(usuarioActual.id)
  );
  const [convSeleccionadaId, setConvSeleccionadaId] = useState<string | null>(
    conversaciones[0]?.conversacionId || null
  );
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  const recargar = () => {
    const list = service.obtenerTodasConversacionesUsuario(usuarioActual.id);
    setConversaciones(list);
    if (!convSeleccionadaId && list.length > 0) {
      setConvSeleccionadaId(list[0].conversacionId);
    }
    if (convSeleccionadaId) {
      service.marcarMensajesComoLeidos(convSeleccionadaId, usuarioActual.id);
    }
  };

  useEffect(() => {
    recargar();
    const unsub = service.suscribir(() => {
      recargar();
    });
    return () => unsub();
  }, [usuarioActual.id, convSeleccionadaId]);

  // Mensajes de la conversación activa
  const convActiva = conversaciones.find(c => c.conversacionId === convSeleccionadaId);
  const mensajesActivos = convActiva
    ? service.obtenerMensajesConversacion(usuarioActual.id, convActiva.otroUsuarioId)
    : [];

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajesActivos.length]);

  const handleEnviarRespuesta = () => {
    if (!textoRespuesta.trim() || !convActiva) return;

    service.enviarMensajeChat({
      remitenteId: usuarioActual.id,
      remitenteNombre: usuarioActual.nombre,
      remitenteRol: usuarioActual.rol,
      destinatarioId: convActiva.otroUsuarioId,
      sedeId: convActiva.sedeId,
      sedeNombre: convActiva.sedeNombre,
      canchaId: convActiva.canchaId,
      canchaNombre: convActiva.canchaNombre,
      texto: textoRespuesta.trim(),
    });

    setTextoRespuesta('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnviarRespuesta();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in flex flex-col md:flex-row h-[620px] max-h-[85vh]">
      
      {/* LISTA LATERAL DE CLIENTES / CONVERSACIONES */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/70">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Mensajes de Clientes</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Responde preguntas y dudas en tiempo real a los peloteros.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversaciones.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-xs text-slate-600">No hay mensajes aún</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Cuando los clientes consulten dudas desde las canchas publicadas, aparecerán aquí.
              </p>
            </div>
          ) : (
            conversaciones.map(conv => {
              const estaSeleccionada = conv.conversacionId === convSeleccionadaId;
              const hora = new Date(conv.ultimoMensaje.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={conv.conversacionId}
                  onClick={() => {
                    setConvSeleccionadaId(conv.conversacionId);
                    service.marcarMensajesComoLeidos(conv.conversacionId, usuarioActual.id);
                  }}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    estaSeleccionada
                      ? 'bg-emerald-50/90 border-l-4 border-emerald-600'
                      : 'hover:bg-white bg-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                    {conv.otroUsuarioNombre.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {conv.otroUsuarioNombre}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {hora}
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                      {conv.canchaNombre || conv.sedeNombre}
                    </p>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.ultimoMensaje.remitenteId === usuarioActual.id ? 'Tú: ' : ''}
                      {conv.ultimoMensaje.texto}
                    </p>
                  </div>

                  {conv.noLeidos > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center animate-pulse flex-shrink-0 mt-1">
                      {conv.noLeidos}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ÁREA DE CHAT DERECHA */}
      <div className="flex-1 flex flex-col bg-white">
        {convActiva ? (
          <>
            {/* Header del Chat */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                  {convActiva.otroUsuarioNombre.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>{convActiva.otroUsuarioNombre}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      Cliente Pelotero
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Consulta sobre: <strong className="text-emerald-800">{convActiva.canchaNombre || convActiva.sedeNombre}</strong>
                  </p>
                </div>
              </div>

              {convActiva.otroUsuarioTelefono && (
                <a
                  href={`https://wa.me/51${convActiva.otroUsuarioTelefono}?text=Hola%20${encodeURIComponent(convActiva.otroUsuarioNombre)},%20te%20escribo%20del%20complejo%20deportivo.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Hilo de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 text-xs">
              {mensajesActivos.map(msg => {
                const esMio = msg.remitenteId === usuarioActual.id;
                const hora = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${esMio ? 'items-end' : 'items-start'} animate-fade-in`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          esMio
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {!esMio && (
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">
                            {msg.remitenteNombre}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.texto}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${esMio ? 'text-emerald-200' : 'text-slate-400'}`}>
                          <span>{hora}</span>
                          {esMio && (
                            msg.leido ? <CheckCheck className="w-3 h-3 text-emerald-200" /> : <Check className="w-3 h-3 text-emerald-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={mensajesEndRef} />
            </div>

            {/* Barra de Envío */}
            <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={textoRespuesta}
                onChange={(e) => setTextoRespuesta(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Responder a ${convActiva.otroUsuarioNombre}...`}
                className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />

              <button
                type="button"
                onClick={handleEnviarRespuesta}
                disabled={!textoRespuesta.trim()}
                className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                  textoRespuesta.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                    : 'bg-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">Selecciona una conversación</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Elige una consulta de la lista para responder dudas en tiempo real a los peloteros.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
