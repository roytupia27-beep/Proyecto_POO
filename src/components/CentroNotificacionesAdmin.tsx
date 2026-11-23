/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Centro de Notificaciones y Control de Verificaciones del Administrador
 */

import React, { useState } from 'react';
import { NotificacionAdmin, PukllayService } from '../domain/PukllayService.ts';
import { 
  ShieldCheck, ShieldAlert, Bell, MessageSquare, Mail, 
  CheckCircle2, Clock, Check, X, Phone, UserCheck, 
  Sparkles, ExternalLink, MapPin, Building2, User, RefreshCw
} from 'lucide-react';

interface CentroNotificacionesAdminProps {
  adminId: string;
  isOpen: boolean;
  onClose: () => void;
  onSedeAprobada?: (sedeId: string) => void;
}

export const CentroNotificacionesAdmin: React.FC<CentroNotificacionesAdminProps> = ({
  adminId,
  isOpen,
  onClose,
  onSedeAprobada,
}) => {
  const service = PukllayService.getInstance();
  const [filtro, setFiltro] = useState<'TODAS' | 'CUENTAS' | 'SOLICITUDES' | 'VERIFICADAS'>('TODAS');
  const [observacionTemp, setObservacionTemp] = useState<{ [id: string]: string }>({});
  const [abrirObsId, setAbrirObsId] = useState<string | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);

  if (!isOpen) return null;

  const todasNotificaciones = service.obtenerNotificacionesAdmin();
  const pendientesCount = service.contarNotificacionesAdminPendientes();

  const notificacionesFiltradas = todasNotificaciones.filter(n => {
    if (filtro === 'CUENTAS') {
      return n.tipo === 'NUEVA_CUENTA_PROPIETARIO' || n.tipo === 'NUEVA_CUENTA_CLIENTE';
    }
    if (filtro === 'SOLICITUDES') {
      return n.tipo === 'SOLICITUD_VERIFICACION' || n.tipo === 'NUEVA_SEDE_REGISTRADA';
    }
    if (filtro === 'VERIFICADAS') {
      return n.estado === 'VERIFICADO';
    }
    return true;
  });

  const handleOtorgarCheck = (sedeId: string, notifId: string) => {
    try {
      const res = service.aprobarVerificacionSede(sedeId, adminId, 'Aprobado y verificado por el Administrador de Pukllay Sport');
      service.marcarNotificacionAdminLeida(notifId);
      setMensajeAlerta(`✓ ¡Sede aprobada con Check Verificado Oficial! Sello: ${res.sello}`);
      if (onSedeAprobada) onSedeAprobada(sedeId);
      setTimeout(() => setMensajeAlerta(null), 4000);
    } catch (err: any) {
      setMensajeAlerta(err.message || 'Error al aprobar sede');
      setTimeout(() => setMensajeAlerta(null), 3000);
    }
  };

  const handleObservar = (sedeId: string, notifId: string) => {
    const motivo = observacionTemp[notifId]?.trim() || 'Se requiere coordinar por WhatsApp o validar fotos del grass';
    try {
      service.observarVerificacionSede(sedeId, motivo);
      service.marcarNotificacionAdminLeida(notifId);
      setAbrirObsId(null);
      setMensajeAlerta('⚠️ Sede marcada como observada. El propietario verá la observación.');
      setTimeout(() => setMensajeAlerta(null), 4000);
    } catch (err: any) {
      setMensajeAlerta(err.message || 'Error al observar');
      setTimeout(() => setMensajeAlerta(null), 3000);
    }
  };

  const handleMarcarLeida = (notifId: string) => {
    service.marcarNotificacionAdminLeida(notifId);
  };

  const handleCrearNotificacionPrueba = () => {
    const telRandom = `9${Math.floor(10000000 + Math.random() * 90000000)}`;
    const idTemp = `user_test_${Date.now()}`;
    const sedes = service.obtenerSedes();
    const sede = sedes[Math.floor(Math.random() * sedes.length)];

    service.solicitarVerificacionSede(sede.id, {
      tipoDocumento: 'COORDINACION_WHATSAPP',
      fechaSolicitud: new Date().toISOString(),
      nombreContacto: 'Roberto Carlos Silva (Grass La Bombonera)',
      contactoWhatsApp: telRandom,
      contactoEmail: 'roberto.silva@grasslima.pe',
      titularYape: 'Roberto Silva',
      numeroYape: telRandom,
    });

    setMensajeAlerta('🔔 ¡Notificación de prueba enviada al Administrador con WhatsApp directo!');
    setTimeout(() => setMensajeAlerta(null), 3500);
  };

  const formatearTiempo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const min = Math.floor(diffMs / 60000);
      if (min < 1) return 'Hace un momento';
      if (min < 60) return `Hace ${min} min`;
      const horas = Math.floor(min / 60);
      if (horas < 24) return `Hace ${horas} h`;
      const dias = Math.floor(horas / 24);
      return `Hace ${dias} d`;
    } catch {
      return 'Reciente';
    }
  };

  const generarEnlaceWhatsApp = (telefono: string, nombre: string, sedeNombre?: string) => {
    const telLimpio = telefono.replace(/\D/g, '');
    const msg = `Hola ${nombre}, te saluda el Administrador de Pukllay Sport respecto a tu cuenta ${sedeNombre ? `y tu complejo "${sedeNombre}"` : ''}. ¿Cómo estás? Te escribo para coordinar la verificación oficial en la plataforma.`;
    return `https://wa.me/51${telLimpio}?text=${encodeURIComponent(msg)}`;
  };

  const generarEnlaceEmail = (email: string, nombre: string, sedeNombre?: string) => {
    const asunto = `Pukllay Sport - Verificación y Contacto Oficial: ${sedeNombre || nombre}`;
    const cuerpo = `Estimado(a) ${nombre},\n\nLe saluda la Administración General de Pukllay Sport.\n\nNos comunicamos respecto a su registro en la plataforma para coordinar la verificación oficial de su cuenta y otorgarle el Check Verificado en la página web.\n\nQuedamos a su disposición.`;
    return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-pop-in">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white animate-slide-down-bounce mt-12 sm:mt-14"
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Centro de Notificaciones del Administrador
                </h3>
                {pendientesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 shadow-sm animate-pulse">
                    {pendientesCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Nuevas cuentas creadas, solicitudes de contacto directo (WhatsApp/Correo) y otorgamiento de Check Verificado.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de alerta temporal */}
        {mensajeAlerta && (
          <div className="px-4 py-2.5 bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{mensajeAlerta}</span>
          </div>
        )}

        {/* Filtros y acciones rápidas */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => setFiltro('TODAS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filtro === 'TODAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todas ({todasNotificaciones.length})
            </button>
            <button
              onClick={() => setFiltro('CUENTAS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filtro === 'CUENTAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Nuevas Cuentas
            </button>
            <button
              onClick={() => setFiltro('SOLICITUDES')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filtro === 'SOLICITUDES' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Sedes / Solicitudes
            </button>
            <button
              onClick={() => setFiltro('VERIFICADAS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filtro === 'VERIFICADAS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Verificadas
            </button>
          </div>

          <button
            type="button"
            onClick={handleCrearNotificacionPrueba}
            className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-400 hover:bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
            title="Simular nueva solicitud de verificación entrante"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Simular Solicitud</span>
          </button>
        </div>

        {/* Lista de Notificaciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/60">
          {notificacionesFiltradas.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-white">No hay notificaciones en este filtro</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Cuando nuevos dueños o jugadores creen una cuenta o registren una cancha, aparecerán aquí con sus accesos directos de WhatsApp y Correo.
              </p>
            </div>
          ) : (
            notificacionesFiltradas.map((notif) => {
              const esCuenta = notif.tipo === 'NUEVA_CUENTA_PROPIETARIO' || notif.tipo === 'NUEVA_CUENTA_CLIENTE';
              const sedeAsociada = notif.sedeId ? service.obtenerSedePorId(notif.sedeId) : null;
              const yaVerificada = sedeAsociada?.esVerificada || notif.estado === 'VERIFICADO';

              return (
                <div 
                  key={notif.id}
                  className={`pt-3 first:pt-0 rounded-2xl p-3.5 transition-all ${
                    !notif.leida
                      ? 'bg-slate-800/60 border border-emerald-500/30 shadow-md'
                      : 'bg-slate-800/20 border border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                        yaVerificada 
                          ? 'bg-emerald-600 text-white' 
                          : esCuenta 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        {yaVerificada ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : esCuenta ? (
                          <UserCheck className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-white">
                            {notif.titulo}
                          </h4>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            yaVerificada
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : notif.estado === 'OBSERVADO'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {yaVerificada ? '✓ VERIFICADO' : notif.estado}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.mensaje}
                        </p>

                        {/* Tarjeta de Contacto del Creador de la Cuenta */}
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-300 truncate">
                              <strong>Contacto:</strong> {notif.usuarioNombre}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="font-mono text-emerald-400 font-bold truncate">
                              +51 {notif.usuarioTelefono}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:col-span-2">
                            <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-300 truncate">
                              {notif.usuarioEmail}
                            </span>
                          </div>

                          {notif.sedeNombre && (
                            <div className="flex items-center gap-2 sm:col-span-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="truncate">
                                Sede: <strong className="text-white">{notif.sedeNombre}</strong> ({notif.distrito || 'Lima'})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Enlaces de comunicación directa WhatsApp y Email */}
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <a
                            href={generarEnlaceWhatsApp(notif.usuarioTelefono, notif.usuarioNombre, notif.sedeNombre)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Abrir WhatsApp</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>

                          <a
                            href={generarEnlaceEmail(notif.usuarioEmail, notif.usuarioNombre, notif.sedeNombre)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Enviar Correo</span>
                          </a>

                          {/* Botón para Otorgar Check Verificado Oficial */}
                          {notif.sedeId && !yaVerificada && (
                            <button
                              type="button"
                              onClick={() => handleOtorgarCheck(notif.sedeId!, notif.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>✓ Otorgar Check Verificado</span>
                            </button>
                          )}

                          {notif.sedeId && yaVerificada && (
                            <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-bold text-[11px]">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Check Verificado Activo</span>
                            </span>
                          )}
                        </div>

                        {/* Caja para agregar observaciones si se requiere */}
                        {notif.sedeId && !yaVerificada && (
                          <div className="pt-2">
                            {abrirObsId === notif.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={observacionTemp[notif.id] || ''}
                                  onChange={(e) => setObservacionTemp({ ...observacionTemp, [notif.id]: e.target.value })}
                                  placeholder="Motivo de observación (ej. coordinar fotos de grass)..."
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleObservar(notif.sedeId!, notif.id)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                >
                                  Enviar Obs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAbrirObsId(null)}
                                  className="p-1 text-slate-400 hover:text-white text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAbrirObsId(notif.id)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                              >
                                ¿Necesitas observar o pedir documentos adicionales?
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatearTiempo(notif.fecha)}
                      </span>
                      {!notif.leida && (
                        <button
                          type="button"
                          onClick={() => handleMarcarLeida(notif.id)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                          title="Marcar como leída"
                        >
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Conectado como: <strong className="text-white">Administrador ({service.obtenerDatosContactoAdministrador().email})</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
