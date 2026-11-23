/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Chat Directo en Tiempo Real (Cliente <-> Dueño del Grass)
 */

import React, { useState, useEffect, useRef } from 'react';
import { PukllayService } from '../domain/PukllayService.ts';
import { Usuario } from '../domain/Usuario.ts';
import { Sede, Cancha } from '../domain/Sede.ts';
import { MensajeChat } from '../domain/Mensaje.ts';
import { 
  X, Send, MessageCircle, Sparkles, Check, CheckCheck, 
  Phone, ArrowRight, ShieldCheck, Clock, ExternalLink, HelpCircle
} from 'lucide-react';

interface ModalChatDirectoProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioActual: Usuario | null;
  sede: Sede;
  cancha?: Cancha;
  onReservarGrass?: (cancha: Cancha) => void;
  onSolicitarLogin?: () => void;
}

const PREGUNTAS_RAPIDAS = [
  "⚽ ¿Cuentan con balones oficiales y chalecos?",
  "👟 ¿Se juega con toperoles o zapatillas de pasto?",
  "🚗 ¿Tienen estacionamiento propio vigilado?",
  "🚿 ¿Tienen vestuarios y duchas con agua caliente?",
  "🌧️ ¿La cancha es techada contra lluvia o sol?",
  "🏷️ ¿Hay descuento si reservamos 2 horas seguidas?",
  "🥤 ¿Venden bebidas hidratantes y rehidratantes?"
];

export const ModalChatDirecto: React.FC<ModalChatDirectoProps> = ({
  isOpen,
  onClose,
  usuarioActual,
  sede,
  cancha,
  onReservarGrass,
  onSolicitarLogin
}) => {
  const service = PukllayService.getInstance();
  const [textoMensaje, setTextoMensaje] = useState('');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  // Identificar al propietario de la sede
  const propietarioId = sede.propietarioId;
  const propietarioUsuario = service.obtenerSedes().length > 0 
    ? (service as any)._usuarios?.get(propietarioId) 
    : null;
  const propietarioNombre = propietarioUsuario ? propietarioUsuario.nombre : 'Dueño del Complejo';

  // Cargar y sincronizar mensajes
  const recargarMensajes = () => {
    if (!usuarioActual) return;
    const msgs = service.obtenerMensajesConversacion(usuarioActual.id, propietarioId);
    setMensajes(msgs);

    // Marcar mensajes del propietario como leídos por el usuario actual
    const convId = [usuarioActual.id, propietarioId].sort().join('_');
    service.marcarMensajesComoLeidos(convId, usuarioActual.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    recargarMensajes();

    // Suscribirse a cambios en el servicio para tiempo real
    const desuscribir = service.suscribir(() => {
      recargarMensajes();
    });

    return () => {
      desuscribir();
    };
  }, [isOpen, usuarioActual?.id, propietarioId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  if (!isOpen) return null;

  const handleEnviarMensaje = (texto: string) => {
    if (!texto.trim()) return;
    if (!usuarioActual) {
      if (onSolicitarLogin) onSolicitarLogin();
      return;
    }

    service.enviarMensajeChat({
      remitenteId: usuarioActual.id,
      remitenteNombre: usuarioActual.nombre,
      remitenteRol: usuarioActual.rol,
      destinatarioId: propietarioId,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      canchaId: cancha?.id,
      canchaNombre: cancha?.nombre,
      texto: texto.trim()
    });

    setTextoMensaje('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnviarMensaje(textoMensaje);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px] max-h-[92vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        
        {/* HEADER DEL CHAT */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={propietarioUsuario?.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'}
                alt={propietarioNombre}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-500/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white leading-tight">
                  {propietarioNombre}
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> Dueño
                </span>
              </div>
              
              <p className="text-[11px] text-slate-300 truncate max-w-[240px]">
                {sede.nombre} {cancha ? `• ${cancha.nombre}` : ''}
              </p>
              
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-0.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>En línea • Responde al instante</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {sede.telefonoContacto && (
              <a
                href={`https://wa.me/51${sede.telefonoContacto}?text=Hola%20${encodeURIComponent(propietarioNombre)},%20te%20escribo%20desde%20Pukllay%20Sport%20para%20consultar%20sobre%20${encodeURIComponent(cancha?.nombre || sede.nombre)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="Abrir WhatsApp"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUBHEADER: ACCIÓN RÁPIDA DE RESERVA */}
        {cancha && (
          <div className="bg-emerald-50/90 px-4 py-2 border-b border-emerald-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
              <span>{cancha.nombre}</span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                S/. {cancha.precioBaseHora}/hr
              </span>
            </div>
            {onReservarGrass && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReservarGrass(cancha);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span>Reservar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* CUERPO DEL CHAT: HILO DE MENSAJES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 text-xs">
          
          {/* Mensaje de bienvenida inicial */}
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold">
              Mensajería oficial en tiempo real de Pukllay Sport
            </span>
          </div>

          {mensajes.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-500">
              <MessageCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
              <p className="font-bold text-slate-800">¡Escríbele directamente al dueño!</p>
              <p className="text-xs text-slate-500 mt-1">
                Pregunta por horarios, descuentos, pelotas, chalecos o cualquier duda antes de reservar.
              </p>
            </div>
          ) : (
            mensajes.map((msg) => {
              const esMio = msg.remitenteId === usuarioActual?.id;
              const hora = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${esMio ? 'items-end' : 'items-start'} animate-fade-in`}
                >
                  <div className="flex items-end gap-1.5 max-w-[85%]">
                    {!esMio && (
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-emerald-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mb-1">
                        D
                      </span>
                    )}

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
            })
          )}

          <div ref={mensajesEndRef} />
        </div>

        {/* CHIPS DE PREGUNTAS RÁPIDAS (1-CLICK) */}
        <div className="bg-white border-t border-slate-100 p-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 pl-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" /> Consultas frecuentes:
          </span>
          {PREGUNTAS_RAPIDAS.map((pregunta, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleEnviarMensaje(pregunta)}
              className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-slate-200/80 cursor-pointer flex-shrink-0"
            >
              {pregunta}
            </button>
          ))}
        </div>

        {/* BARRA DE ENTRADA DE TEXTO */}
        <div className="p-3 bg-white border-t border-slate-200">
          {!usuarioActual ? (
            <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              <span className="text-amber-800 font-bold">Inicia sesión para chatear con el dueño</span>
              {onSolicitarLogin && (
                <button
                  type="button"
                  onClick={onSolicitarLogin}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textoMensaje}
                onChange={(e) => setTextoMensaje(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje o duda sobre el grass..."
                className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              />

              <button
                type="button"
                onClick={() => handleEnviarMensaje(textoMensaje)}
                disabled={!textoMensaje.trim()}
                className={`p-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center cursor-pointer ${
                  textoMensaje.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                    : 'bg-slate-300 opacity-60 cursor-not-allowed'
                }`}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
