/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Aplicación Principal de Reserva de Grass Sintético
 */

import React, { useState, useEffect } from 'react';
import { PukllayService, FiltrosBusquedaCanchas } from './domain/PukllayService.ts';
import { Usuario, RolUsuario } from './domain/Usuario.ts';
import { Sede, Cancha } from './domain/Sede.ts';
import { Navbar } from './components/Navbar.tsx';
import { GoogleMapView } from './components/GoogleMapView.tsx';
import { FiltrosBusqueda } from './components/FiltrosBusqueda.tsx';
import { CanchaCard } from './components/CanchaCard.tsx';
import { ModalReserva } from './components/ModalReserva.tsx';
import { PanelPropietario } from './components/PanelPropietario.tsx';
import { PanelCliente } from './components/PanelCliente.tsx';
import { ModalAuth } from './components/ModalAuth.tsx';
import { AuthGateScreen } from './components/AuthGateScreen.tsx';
import { PooArchitectureViewer } from './components/PooArchitectureViewer.tsx';
import { ModalChatDirecto } from './components/ModalChatDirecto.tsx';
import { CentroNotificacionesCliente } from './components/CentroNotificacionesCliente.tsx';
import { CentroNotificacionesAdmin } from './components/CentroNotificacionesAdmin.tsx';
import { ToastNotificacionCliente } from './components/ToastNotificacionCliente.tsx';
import { VentanaUsuariosRegistrados } from './components/VentanaUsuariosRegistrados.tsx';
import { ModalReporteFormalAdmin } from './components/ModalReporteFormalAdmin.tsx';
import { Footer } from './components/Footer.tsx';
import { PukllayLogo } from './components/PukllayLogo.tsx';
import { NotificacionCliente } from './domain/PukllayService.ts';
import { 
  MapPin, ListFilter, Map as MapIcon, Sparkles, Navigation, 
  Trophy, ShieldCheck, Phone, CheckCircle2, AlertCircle, ArrowUpRight 
} from 'lucide-react';

export default function App() {
  const service = PukllayService.getInstance();

  // Estados principales
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(service.usuarioActual);
  const [vistaActiva, setVistaActiva] = useState<'EXPLORAR' | 'PANEL_PROPIETARIO' | 'MIS_RESERVAS' | 'ARQUITECTURA_POO'>('EXPLORAR');
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

  // Chat directo en tiempo real con el dueño del grass
  const [chatActivo, setChatActivo] = useState<{ sede: Sede; cancha?: Cancha } | null>(null);

  // Reserva activa
  const [reservaCancha, setReservaCancha] = useState<{ cancha: Cancha; sede: Sede } | null>(null);

  // Alertas y Notificaciones del Cliente (Vencimientos y Chat de Propietario)
  const [notificacionesClienteAbiertas, setNotificacionesClienteAbiertas] = useState(false);
  const [notificacionesAdminAbiertas, setNotificacionesAdminAbiertas] = useState(false);
  const [modalUsuariosAbierto, setModalUsuariosAbierto] = useState(false);
  const [modalReporteFormalAbierto, setModalReporteFormalAbierto] = useState(false);
  const [toastNotificacionCliente, setToastNotificacionCliente] = useState<NotificacionCliente | null>(null);
  const [alertaAcceso, setAlertaAcceso] = useState<string | null>(null);

  // Ubicación del usuario (por defecto Lima: Miraflores/Surco)
  const [ubicacionUsuario, setUbicacionUsuario] = useState<{ lat: number; lng: number }>({
    lat: -12.122150,
    lng: -77.036880,
  });

  // Filtros de búsqueda (RF-07)
  const [filtros, setFiltros] = useState<FiltrosBusquedaCanchas>({
    deporte: 'TODOS',
    superficie: 'TODOS',
    fecha: service.obtenerFechaHoyISO(),
    precioMax: 200,
    soloDisponiblesHoy: false,
    ubicacionUsuario: ubicacionUsuario,
    distanciaMaximaKm: 5, // Radio cercano por defecto: 5 km
    ordenPor: 'cercania',
  });

  // Sede enfocada en el mapa
  const [sedeEnfocadaId, setSedeEnfocadaId] = useState<string | null>(null);

  // Vista móvil: Mapa o Lista
  const [vistaMovilTab, setVistaMovilTab] = useState<'LISTA' | 'MAPA'>('LISTA');

  // Canchas filtradas
  const [canchasFiltradas, setCanchasFiltradas] = useState(service.buscarCanchas(filtros));

  // Suscribirse al servicio singleton para reactividad total
  useEffect(() => {
    const unsub = service.suscribir(() => {
      setUsuarioActual(service.usuarioActual);
      setCanchasFiltradas(service.buscarCanchas(filtros));
    });
    return () => unsub();
  }, [filtros]);

  // Suscribirse a nuevas notificaciones en tiempo real para el cliente (Toast)
  useEffect(() => {
    const unsubNotif = service.suscribirNuevaNotificacionCliente((notif) => {
      if (usuarioActual && (usuarioActual.id === notif.clienteId || usuarioActual.rol === 'ADMINISTRADOR')) {
        setToastNotificacionCliente(notif);
      }
    });
    return () => unsubNotif();
  }, [usuarioActual]);

  const handleAbrirChatDesdeNotificacion = (sedeId?: string, canchaId?: string) => {
    const sedes = service.obtenerSedes();
    const sede = (sedeId ? service.obtenerSedePorId(sedeId) : null) || sedes[0];
    if (sede) {
      const cancha = canchaId ? sede.canchas.find(c => c.id === canchaId) : sede.canchas[0];
      setChatActivo({ sede, cancha });
    }
  };

  // Actualizar filtros cuando cambia la ubicación o el radio de cercanía
  const handleUbicacionUsuarioChange = (coords: { lat: number; lng: number }, nuevoRadioKm?: number) => {
    setUbicacionUsuario(coords);
    const radio = nuevoRadioKm !== undefined ? nuevoRadioKm : (filtros.distanciaMaximaKm || 5);
    setFiltros(prev => ({
      ...prev,
      ubicacionUsuario: coords,
      distanciaMaximaKm: radio === 0 ? undefined : radio,
    }));
  };

  const handleRadioKmChange = (nuevoRadioKm: number) => {
    setFiltros(prev => ({
      ...prev,
      distanciaMaximaKm: nuevoRadioKm === 0 ? undefined : nuevoRadioKm,
    }));
  };

  // Configuración de vista según rol inicial
  useEffect(() => {
    if (usuarioActual?.rol === 'PROPIETARIO') {
      setVistaActiva('PANEL_PROPIETARIO');
    } else if (usuarioActual?.rol === 'CLIENTE') {
      if (vistaActiva === 'ARQUITECTURA_POO') {
        setVistaActiva('EXPLORAR');
      }
    }
  }, [usuarioActual]);

  const handleFiltrosChange = (nuevosFiltros: FiltrosBusquedaCanchas) => {
    setFiltros(nuevosFiltros);
    setCanchasFiltradas(service.buscarCanchas(nuevosFiltros));
  };

  const sedes = service.obtenerSedes();

  // Si no ha iniciado sesión, mostrar primero la pantalla de inicio de sesión / acceso
  if (!usuarioActual) {
    return (
      <AuthGateScreen
        onLoginExitoso={(rol) => {
          setUsuarioActual(service.usuarioActual);
          if (rol === 'PROPIETARIO' || rol === 'ADMINISTRADOR') {
            setVistaActiva('PANEL_PROPIETARIO');
          } else {
            setVistaActiva('EXPLORAR');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Barra de Navegación Principal */}
      <Navbar
        usuarioActual={usuarioActual}
        vistaActiva={vistaActiva}
        onCambiarVista={(v) => {
          // RF-02: Criterio: un usuario no puede acceder a pantallas de otro rol
          if (usuarioActual?.rol === 'PROPIETARIO' && v !== 'PANEL_PROPIETARIO') {
            return;
          }
          if (v === 'PANEL_PROPIETARIO' && usuarioActual?.rol === 'CLIENTE') {
            setAlertaAcceso('Acceso restringido: Esta sección requiere rol de Propietario o Administrador (RF-02).');
            setTimeout(() => setAlertaAcceso(null), 4000);
            return;
          }
          if (v === 'ARQUITECTURA_POO' && usuarioActual?.rol !== 'ADMINISTRADOR') {
            setAlertaAcceso('El diseño de arquitectura POO es exclusivo para el perfil de Administrador.');
            setTimeout(() => setAlertaAcceso(null), 4000);
            return;
          }
          setVistaActiva(v);
        }}
        onAbrirAuthModal={() => {
          setModalAuthAbierto(true);
        }}
        onLogout={() => {
          service.logout();
          setUsuarioActual(null);
        }}
        onAbrirNotificacionesCliente={() => setNotificacionesClienteAbiertas(true)}
        onAbrirNotificacionesAdmin={() => setNotificacionesAdminAbiertas(true)}
        onAbrirUsuariosRegistrados={() => setModalUsuariosAbierto(true)}
        onAbrirReporteFormal={() => setModalReporteFormalAbierto(true)}
      />

      {/* Alerta no bloqueante de control de acceso */}
      {alertaAcceso && (
        <div className="fixed top-22 right-4 z-50 max-w-sm bg-rose-950/95 text-rose-100 border border-rose-700/80 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-pop-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{alertaAcceso}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1">
        
        {/* VISTA 1: EXPLORAR CANCHAS Y MAPA INTERACTIVO */}
        {vistaActiva === 'EXPLORAR' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* Hero Banner Móvil & Desktop */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Grass Sintético al Instante
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Reserva tu Cancha de Grass con Ubicación en Tiempo Real
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Encuentra el césped más cercano a ti con <strong>Google Maps</strong>, asegura tu horario con <strong>retención temporal</strong> y abona solo el <strong>50% de adelanto</strong> mediante <strong>Yape o Plin</strong>.
                </p>
              </div>

              {/* Logo Oficial Pukllay Sport en Hero */}
              <div className="hidden lg:flex items-center justify-center p-2 relative z-10 flex-shrink-0">
                <PukllayLogo size="xl" transparent={true} className="drop-shadow-2xl hover:scale-105 transition-transform max-w-[150px]" />
              </div>

              {/* Botón Flotante para Alternar en Celulares */}
              <div className="lg:hidden mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Ver formato:</span>
                <div className="flex bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setVistaMovilTab('LISTA')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      vistaMovilTab === 'LISTA' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Lista ({canchasFiltradas.length})</span>
                  </button>
                  <button
                    onClick={() => setVistaMovilTab('MAPA')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      vistaMovilTab === 'MAPA' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Mapa GPS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filtros de Búsqueda Avanzados (RF-07) */}
            <FiltrosBusqueda
              filtros={filtros}
              onFiltrosChange={handleFiltrosChange}
              totalResultados={canchasFiltradas.length}
            />

            {/* Layout Híbrido: Mapa de Google Maps + Grid de Canchas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Columna Izquierda: Mapa de Google Maps (Sticky en Desktop) */}
              <div
                id="seccion-mapa-google"
                className={`lg:col-span-5 lg:sticky lg:top-24 ${
                vistaMovilTab === 'MAPA' ? 'block' : 'hidden lg:block'
              }`}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-md border border-slate-200 dark:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between px-2 py-1 mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Google Maps en Vivo
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                      API Oficial Integrada
                    </span>
                  </div>

                  <GoogleMapView
                    sedes={sedes}
                    sedeSeleccionadaId={sedeEnfocadaId}
                    onSeleccionarSede={(s) => setSedeEnfocadaId(s.id)}
                    onReservarCancha={(c, s) => setReservaCancha({ cancha: c, sede: s })}
                    onAbrirChat={(s) => setChatActivo({ sede: s })}
                    ubicacionUsuario={ubicacionUsuario}
                    onUbicacionUsuarioChange={handleUbicacionUsuarioChange}
                    radioKm={filtros.distanciaMaximaKm || 5}
                    onRadioKmChange={handleRadioKmChange}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Haz clic en los marcadores verdes ⚽ para ver fotos, precios y reservar al instante.
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Tarjetas de Canchas Disponibles */}
              <div className={`lg:col-span-7 ${
                vistaMovilTab === 'LISTA' ? 'block' : 'hidden lg:block'
              }`}>
                {canchasFiltradas.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      No encontramos canchas con estos filtros
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Intenta seleccionar "Todos los deportes", ampliar el rango de precio o cambiar la fecha seleccionada.
                    </p>
                    <button
                      onClick={() => handleFiltrosChange({
                        deporte: 'TODOS',
                        superficie: 'TODOS',
                        fecha: service.obtenerFechaHoyISO(),
                        precioMax: 250,
                        soloDisponiblesHoy: false,
                        ordenPor: 'cercania',
                      })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Restablecer Filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {canchasFiltradas.map(({ cancha, sede, distanciaKm, slotsLibresCount }) => (
                      <CanchaCard
                        key={cancha.id}
                        cancha={cancha}
                        sede={sede}
                        distanciaKm={distanciaKm}
                        slotsLibresCount={slotsLibresCount}
                        esSedeEnfocada={sedeEnfocadaId === sede.id}
                        onReservar={() => setReservaCancha({ cancha, sede })}
                        onAbrirChat={() => setChatActivo({ sede, cancha })}
                        onVerEnMapa={() => {
                          setSedeEnfocadaId(sede.id);
                          setVistaMovilTab('MAPA');
                          const mapEl = document.getElementById('seccion-mapa-google');
                          if (mapEl) {
                            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          } else {
                            window.scrollTo({ top: 150, behavior: 'smooth' });
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* VISTA 2: PANEL DEL PROPIETARIO / ADMIN GRASS */}
        {vistaActiva === 'PANEL_PROPIETARIO' && usuarioActual && (
          <PanelPropietario
            usuarioActual={usuarioActual}
            onVerCanchaEnExplorador={() => setVistaActiva('EXPLORAR')}
          />
        )}

        {/* VISTA 3: MIS RESERVAS DEL CLIENTE (RF-10 y RF-11) */}
        {vistaActiva === 'MIS_RESERVAS' && (
          usuarioActual ? (
            <PanelCliente
              usuarioActual={usuarioActual}
              onExplorarCanchas={() => setVistaActiva('EXPLORAR')}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg transition-colors">
              <Trophy className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Inicia sesión para ver tus reservas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Accede con tu número de celular o correo registrado para consultar y gestionar tus reservas activas.
              </p>
              <button
                onClick={() => setModalAuthAbierto(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Ingresar / Registrarme
              </button>
            </div>
          )
        )}

        {/* VISTA 4: ARQUITECTURA POO Y MATRIZ DE REQUERIMIENTOS */}
        {vistaActiva === 'ARQUITECTURA_POO' && (
          <PooArchitectureViewer />
        )}

      </main>

      {/* MODAL DE RESERVA CON RETENCIÓN TEMPORAL Y PAGO QR */}
      {reservaCancha && (
        <ModalReserva
          cancha={reservaCancha.cancha}
          sede={reservaCancha.sede}
          usuarioActual={usuarioActual}
          onCerrar={() => setReservaCancha(null)}
          onReservaExitosa={() => {
            // Actualizar lista
            setCanchasFiltradas(service.buscarCanchas(filtros));
          }}
          onPedirLogin={() => {
            setModalAuthAbierto(true);
          }}
        />
      )}

      {/* MODAL DE AUTENTICACIÓN (LOGIN / REGISTRO / VERIFICACIÓN RF-01 / RF-02) */}
      {modalAuthAbierto && (
        <ModalAuth
          onCerrar={() => setModalAuthAbierto(false)}
          onLoginExitoso={(rol) => {
            setUsuarioActual(service.usuarioActual);
            if (rol === 'PROPIETARIO' || rol === 'ADMINISTRADOR') {
              setVistaActiva('PANEL_PROPIETARIO');
            } else {
              setVistaActiva('EXPLORAR');
            }
          }}
        />
      )}

      {/* MODAL DE CHAT DIRECTO EN TIEMPO REAL CON EL DUEÑO DEL GRASS */}
      {chatActivo && (
        <ModalChatDirecto
          isOpen={true}
          onClose={() => setChatActivo(null)}
          usuarioActual={usuarioActual}
          sede={chatActivo.sede}
          cancha={chatActivo.cancha}
          onReservarGrass={(c) => {
            setChatActivo(null);
            setReservaCancha({ cancha: c, sede: chatActivo.sede });
          }}
          onSolicitarLogin={() => {
            setChatActivo(null);
            setModalAuthAbierto(true);
          }}
        />
      )}

      {/* TOAST FLOTANTE DE ALERTA EN TIEMPO REAL */}
      {toastNotificacionCliente && (
        <ToastNotificacionCliente
          notificacion={toastNotificacionCliente}
          onCerrar={() => setToastNotificacionCliente(null)}
          onAccion={(notif) => {
            if (notif.accion?.tipo === 'ABRIR_CHAT') {
              handleAbrirChatDesdeNotificacion(notif.sedeId, notif.canchaId);
            } else if (notif.accion?.tipo === 'VER_RESERVA' || notif.accion?.tipo === 'PAGAR_RESERVA') {
              setVistaActiva('MIS_RESERVAS');
            }
          }}
        />
      )}

      {/* CENTRO DE NOTIFICACIONES Y ALERTAS DEL CLIENTE */}
      {notificacionesClienteAbiertas && usuarioActual && (
        <CentroNotificacionesCliente
          clienteId={usuarioActual.id}
          isOpen={true}
          onClose={() => setNotificacionesClienteAbiertas(false)}
          onAbrirChat={handleAbrirChatDesdeNotificacion}
          onVerReserva={() => setVistaActiva('MIS_RESERVAS')}
        />
      )}

      {/* CENTRO DE NOTIFICACIONES Y GESTIÓN DEL ADMINISTRADOR */}
      {notificacionesAdminAbiertas && usuarioActual?.rol === 'ADMINISTRADOR' && (
        <CentroNotificacionesAdmin
          adminId={usuarioActual.id}
          isOpen={true}
          onClose={() => setNotificacionesAdminAbiertas(false)}
          onSedeAprobada={(_sedeId) => {
            setCanchasFiltradas(service.buscarCanchas(filtros));
          }}
        />
      )}

      {/* VENTANA DE USUARIOS REGISTRADOS EN LA PLATAFORMA (EXCLUSIVO ADMINISTRADOR) */}
      {usuarioActual?.rol === 'ADMINISTRADOR' && (
        <VentanaUsuariosRegistrados
          isOpen={modalUsuariosAbierto}
          onClose={() => setModalUsuariosAbierto(false)}
          usuarioActual={usuarioActual}
        />
      )}

      {/* REPORTE FORMAL DEL SISTEMA (EXCLUSIVO ADMINISTRADOR) */}
      {usuarioActual?.rol === 'ADMINISTRADOR' && (
        <ModalReporteFormalAdmin
          isOpen={modalReporteFormalAbierto}
          onClose={() => setModalReporteFormalAbierto(false)}
          usuarioActual={usuarioActual}
        />
      )}

      {/* FOOTER OFICIAL Y CORPORATIVO */}
      <Footer />

    </div>
  );
}
