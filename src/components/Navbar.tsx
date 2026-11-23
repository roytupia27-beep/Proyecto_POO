/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Barra de Navegación y Control de Sesión
 */

import React from 'react';
import { Usuario } from '../domain/Usuario.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { PukllayLogo } from './PukllayLogo.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { ShieldCheck, User, LogOut, Sparkles, MapPin, Calendar, LayoutDashboard, Code2, Trophy, Bell, BarChart3, MessageCircle, Plus, Building2, Users, FileText } from 'lucide-react';

interface NavbarProps {
  usuarioActual: Usuario | null;
  vistaActiva: 'EXPLORAR' | 'PANEL_PROPIETARIO' | 'MIS_RESERVAS' | 'ARQUITECTURA_POO';
  onCambiarVista: (vista: 'EXPLORAR' | 'PANEL_PROPIETARIO' | 'MIS_RESERVAS' | 'ARQUITECTURA_POO') => void;
  onAbrirAuthModal: () => void;
  onLogout: () => void;
  onAbrirNotificacionesCliente?: () => void;
  onAbrirNotificacionesAdmin?: () => void;
  onAbrirUsuariosRegistrados?: () => void;
  onAbrirReporteFormal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  usuarioActual,
  vistaActiva,
  onCambiarVista,
  onAbrirAuthModal,
  onLogout,
  onAbrirNotificacionesCliente,
  onAbrirNotificacionesAdmin,
  onAbrirUsuariosRegistrados,
  onAbrirReporteFormal,
}) => {
  const service = PukllayService.getInstance();
  const esPropietario = usuarioActual?.rol === 'PROPIETARIO' || usuarioActual?.rol === 'ENCARGADO';
  const esAdmin = usuarioActual?.rol === 'ADMINISTRADOR';
  const esCliente = usuarioActual?.rol === 'CLIENTE';

  const totalUsuarios = service.obtenerTodosUsuarios().length;

  // Conteo de notificaciones pendientes y mensajes no leídos
  const notificacionesPendientes = usuarioActual
    ? service.contarNotificacionesPendientes(usuarioActual.id)
    : 0;
  const mensajesNoLeidos = usuarioActual
    ? service.contarMensajesNoLeidosTotal(usuarioActual.id)
    : 0;

  // Conteo de alertas para el cliente (reservas próximas y respuestas de propietarios)
  const notificacionesClientePendientes = (esCliente || esAdmin) && usuarioActual
    ? service.contarNotificacionesClienteNoLeidas(usuarioActual.id)
    : 0;

  // Conteo de notificaciones para el Administrador (nuevas cuentas y solicitudes de verificación)
  const notificacionesAdminPendientes = esAdmin
    ? service.contarNotificacionesAdminPendientes()
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-emerald-900/40 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Pukllay Sport */}
          <div 
            onClick={() => {
              if (esPropietario) onCambiarVista('PANEL_PROPIETARIO');
              else onCambiarVista('EXPLORAR');
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <PukllayLogo 
              size="sm" 
              transparent={true} 
              className="flex-shrink-0 group-hover:scale-105 transition-transform" 
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  PUKLLAY<span className="text-emerald-400">SPORT</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                  {esPropietario ? 'PANEL PROPIETARIO' : esAdmin ? 'ADMIN' : 'CLIENTE'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium -mt-0.5">
                {esPropietario ? 'Gestión de Canchas & Reservas' : 'Reserva de Canchas Sintéticas'}
              </p>
            </div>
          </div>

          {/* Navegación Central (Desktop) Segregada Estrictamente por Rol */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
            
            {/* Si es PROPIETARIO: Interfaz especializada sólo de gestión */}
            {esPropietario && (
              <button
                onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  vistaActiva === 'PANEL_PROPIETARIO'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-300" />
                <span>Panel Propietario (Ingresos & Horarios)</span>
                {notificacionesPendientes > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                    {notificacionesPendientes}
                  </span>
                )}
                {mensajesNoLeidos > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[10px] font-black rounded-full animate-pulse flex items-center gap-0.5" title="Mensajes nuevos de clientes">
                    <MessageCircle className="w-2.5 h-2.5" />
                    {mensajesNoLeidos}
                  </span>
                )}
              </button>
            )}

            {/* Si es CLIENTE o ADMIN: Explorar Grass y Mapa */}
            {(esCliente || esAdmin) && (
              <button
                onClick={() => onCambiarVista('EXPLORAR')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  vistaActiva === 'EXPLORAR'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-300" />
                <span>Explorar Grass & Mapa</span>
              </button>
            )}

            {/* Si es ADMIN: También accede a Panel de Canchas */}
            {esAdmin && (
              <button
                onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  vistaActiva === 'PANEL_PROPIETARIO'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-300" />
                <span>Gestión Complejos</span>
              </button>
            )}

            {/* Si es CLIENTE o ADMIN: Mis Reservas */}
            {(esCliente || esAdmin) && (
              <button
                onClick={() => onCambiarVista('MIS_RESERVAS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  vistaActiva === 'MIS_RESERVAS'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-300" />
                <span>Mis Reservas</span>
              </button>
            )}

            {/* Acceso para Registrar / Administrar Complejo Deportivo */}
            {esCliente && (
              <button
                onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  vistaActiva === 'PANEL_PROPIETARIO'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                    : 'text-amber-400 hover:text-white hover:bg-slate-700/50 border border-amber-500/30'
                }`}
                title="Registrar mi propio complejo deportivo o canchas de grass"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ Registrar Complejo</span>
              </button>
            )}

            {/* ÚNICAMENTE PARA ADMINISTRADOR: DISEÑO POO */}
            {esAdmin && (
              <button
                onClick={() => onCambiarVista('ARQUITECTURA_POO')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  vistaActiva === 'ARQUITECTURA_POO'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-amber-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Diseño POO (Admin)</span>
              </button>
            )}
          </nav>

          {/* Selector de Rol y Perfil de Usuario */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Botón de Acceso al Directorio de Usuarios Registrados (EXCLUSIVO ADMINISTRADOR) */}
            {esAdmin && usuarioActual && (
              <button
                type="button"
                onClick={onAbrirUsuariosRegistrados}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 hover:text-white border border-purple-500/40 rounded-2xl transition-all cursor-pointer shadow-sm group"
                title="Gestión de Usuarios Registrados (Exclusivo Administrador)"
              >
                <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-xs font-bold">Usuarios</span>
                <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-black rounded-full">
                  {totalUsuarios}
                </span>
              </button>
            )}

            {/* Botón de Reporte Formal (EXCLUSIVO ADMINISTRADOR) */}
            {esAdmin && usuarioActual && (
              <button
                type="button"
                onClick={onAbrirReporteFormal}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-2xl transition-all cursor-pointer shadow-sm group"
                title="Generar Reporte Formal del Sistema (Reservas, Pagos, Atenciones y Auditoría)"
              >
                <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-xs font-bold">Reporte Formal</span>
              </button>
            )}

            {/* Botón de Dashboard KPIs Recharts (EXCLUSIVO ADMINISTRADOR) */}
            {esAdmin && usuarioActual && (
              <button
                type="button"
                onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 hover:text-white border border-cyan-500/40 rounded-2xl transition-all cursor-pointer shadow-sm group"
                title="Dashboard de Métricas Clave y KPIs con Gráficos Recharts (Exclusivo Administrador)"
              >
                <BarChart3 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-xs font-bold">KPIs</span>
              </button>
            )}

            {/* Campana de Notificaciones para el Administrador (Nuevas cuentas y verificaciones) */}
            {esAdmin && usuarioActual && (
              <button
                type="button"
                onClick={onAbrirNotificacionesAdmin}
                className="relative p-2.5 text-amber-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-amber-500/40 rounded-2xl transition-all cursor-pointer group shadow-sm flex items-center justify-center"
                title="Centro de Notificaciones del Administrador (Nuevas cuentas, sedes y verificaciones)"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                {notificacionesAdminPendientes > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full shadow-lg shadow-amber-500/50 animate-pulse">
                    {notificacionesAdminPendientes}
                  </span>
                )}
              </button>
            )}

            {/* Campana de Notificaciones para Cliente (Alertas de vencimiento y chat de dueños) */}
            {(esCliente || esAdmin) && usuarioActual && (
              <button
                type="button"
                onClick={onAbrirNotificacionesCliente}
                className="relative p-2.5 text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/90 rounded-2xl transition-all cursor-pointer group shadow-sm flex items-center justify-center"
                title="Alertas de Reservas y Respuestas de Propietarios"
              >
                <Bell className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                {notificacionesClientePendientes > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/50 animate-pulse">
                    {notificacionesClientePendientes}
                  </span>
                )}
              </button>
            )}

            {/* Selector de Tema Claro / Oscuro / Sistema */}
            <ThemeToggle variant="dropdown" />

            {usuarioActual ? (
              <div className="flex items-center gap-2 bg-slate-800/90 pl-2 pr-3 py-1 rounded-2xl border border-slate-700">
                <img
                  src={usuarioActual.avatarUrl}
                  alt={usuarioActual.nombre}
                  className="w-8 h-8 rounded-xl object-cover border border-emerald-500/40"
                />
                <div className="text-left hidden sm:block max-w-[130px]">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {usuarioActual.nombre}
                  </p>
                  <span className="inline-block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    {usuarioActual.rol}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAbrirAuthModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Ingresar / Registrarse</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar Segregada */}
        <div className="md:hidden flex items-center justify-between gap-1 py-2 border-t border-slate-800 overflow-x-auto text-xs">
          {esPropietario && (
            <button
              onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                vistaActiva === 'PANEL_PROPIETARIO' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Ingresos & Canchas</span>
              {notificacionesPendientes > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full">
                  {notificacionesPendientes}
                </span>
              )}
            </button>
          )}

          {(esCliente || esAdmin) && (
            <button
              onClick={() => onCambiarVista('EXPLORAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                vistaActiva === 'EXPLORAR' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Grass & Mapa</span>
            </button>
          )}

          {(esCliente || esAdmin) && (
            <button
              onClick={() => onCambiarVista('MIS_RESERVAS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                vistaActiva === 'MIS_RESERVAS' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mis Reservas</span>
            </button>
          )}

          {esCliente && (
            <button
              onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                vistaActiva === 'PANEL_PROPIETARIO' ? 'bg-amber-500 text-slate-950' : 'text-amber-400'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Complejo</span>
            </button>
          )}

          {(esCliente || esAdmin) && usuarioActual && (
            <button
              onClick={onAbrirNotificacionesCliente}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer relative"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alertas</span>
              {notificacionesClientePendientes > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full">
                  {notificacionesClientePendientes}
                </span>
              )}
            </button>
          )}

          {/* Botón Móvil de Usuarios Registrados (EXCLUSIVO ADMINISTRADOR) */}
          {esAdmin && (
            <button
              onClick={onAbrirUsuariosRegistrados}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Gestión de usuarios registrados en la plataforma (Exclusivo Administrador)"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Usuarios ({totalUsuarios})</span>
            </button>
          )}

          {/* Botón Móvil de Reporte Formal (EXCLUSIVO ADMINISTRADOR) */}
          {esAdmin && (
            <button
              onClick={onAbrirReporteFormal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Generar Reporte Formal"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reporte</span>
            </button>
          )}

          {/* Botón Móvil de Dashboard KPIs (EXCLUSIVO ADMINISTRADOR) */}
          {esAdmin && (
            <button
              onClick={() => onCambiarVista('PANEL_PROPIETARIO')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dashboard de Métricas Clave y KPIs Recharts"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>KPIs</span>
            </button>
          )}

          {esAdmin && (
            <button
              onClick={() => onCambiarVista('ARQUITECTURA_POO')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-amber-400 cursor-pointer ${
                vistaActiva === 'ARQUITECTURA_POO' ? 'bg-slate-800' : ''
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>POO Admin</span>
            </button>
          )}

          {/* Selector de tema móvil */}
          <div className="pl-1 border-l border-slate-700/80 flex-shrink-0">
            <ThemeToggle variant="button" className="p-1.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
