/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - RF-03, RF-04, RF-05, RF-11: Panel del Propietario / Administrador de Grass
 */

import React, { useState, useEffect } from 'react';
import { PukllayService, NotificacionPropietario } from '../domain/PukllayService.ts';
import { Usuario, Propietario, IDatosPagoPropietario } from '../domain/Usuario.ts';
import { Sede, Cancha, DeporteTipo, SuperficieTipo, IUbicacionGeo, IDocumentoVerificacionSede } from '../domain/Sede.ts';
import { Reserva } from '../domain/Reserva.ts';
import { PukllayAntiFraudEngine } from '../domain/SecurityEngine.ts';
import { procesarImagenDispositivo } from '../utils/imageUtils.ts';
import { PanelIngresosYHorarios } from './PanelIngresosYHorarios.tsx';
import { PanelMensajesPropietario } from './PanelMensajesPropietario.tsx';
import { SelectorUbicacionGrass } from './SelectorUbicacionGrass.tsx';
import { VentanaUsuariosRegistrados } from './VentanaUsuariosRegistrados.tsx';
import { ModalReporteFormalAdmin } from './ModalReporteFormalAdmin.tsx';
import { DashboardKPIAdmin } from './DashboardKPIAdmin.tsx';
import { 
  Building2, Plus, QrCode, Power, ShieldCheck, ShieldAlert, Clock, Calendar, 
  Settings2, Ban, DollarSign, Image, CheckCircle2, AlertTriangle, 
  Eye, EyeOff, Save, Trash2, Edit3, Bell, Check, XCircle, FileText, Phone, User,
  Upload, Camera, ImageIcon, X, ExternalLink, BarChart3, TrendingUp, MessageCircle,
  MapPin, Compass, Navigation, Crosshair, Sparkles, UserCheck, Mail, MessageSquare,
  Crown, Search, Users, KeyRound, Filter, Download
} from 'lucide-react';

interface PanelPropietarioProps {
  usuarioActual: Usuario;
  onVerCanchaEnExplorador?: (canchaId: string) => void;
}

export const PanelPropietario: React.FC<PanelPropietarioProps> = ({
  usuarioActual,
}) => {
  const service = PukllayService.getInstance();
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = service.suscribir(() => {
      setTick(t => t + 1);
    });
    return () => unsub();
  }, [service]);

  const sedes = service.obtenerSedes();

  const esAdmin = usuarioActual.rol === 'ADMINISTRADOR';

  // Si el usuario es propietario, filtrar sus sedes o mostrar todas si es admin
  const sedesPropietario = esAdmin
    ? sedes
    : sedes.filter(s => s.propietarioId === usuarioActual.id || (usuarioActual as any).sedesIds?.includes(s.id));

  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState<string | null>(sedesPropietario[0]?.id || null);
  const sedeSeleccionada: Sede | null = 
    sedesPropietario.find(s => s.id === sedeSeleccionadaId) || 
    sedesPropietario[0] || 
    null;
  const setSedeSeleccionada = (s: Sede | null) => setSedeSeleccionadaId(s?.id || null);

  const [tabActiva, setTabActiva] = useState<'DASHBOARD' | 'CANCHAS' | 'NOTIFICACIONES' | 'MENSAJES' | 'REGLAS_HORARIOS' | 'BLOQUEOS' | 'CONFIG_QR' | 'RESERVAS' | 'VERIFICACION_ANTIFRAUDE' | 'CONTROL_ADMIN'>(esAdmin ? 'CONTROL_ADMIN' : 'DASHBOARD');

  // Estados para Control Maestro & Usuarios (Super-Admin)
  const [subtabAdmin, setSubtabAdmin] = useState<'DASHBOARD_KPI' | 'USUARIOS' | 'SEDES_CANCHAS' | 'RESERVAS' | 'CONFIGURACION'>('DASHBOARD_KPI');
  const [filtroRolAdmin, setFiltroRolAdmin] = useState<'TODOS' | 'CLIENTE' | 'PROPIETARIO' | 'ADMINISTRADOR'>('TODOS');
  const [filtroReservaAdmin, setFiltroReservaAdmin] = useState<'TODAS' | 'CONFIRMADA' | 'PENDIENTE_PAGO' | 'CANCELADA' | 'EXPIRADA'>('TODAS');
  const [busquedaUsuarioAdmin, setBusquedaUsuarioAdmin] = useState('');
  const [busquedaSedeAdmin, setBusquedaSedeAdmin] = useState('');
  const [busquedaReservaAdmin, setBusquedaReservaAdmin] = useState('');
  const [canchaAEliminar, setCanchaAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [sedeAEliminar, setSedeAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [anuncioAdminGlobal, setAnuncioAdminGlobal] = useState('¡Bienvenidos a Pukllay Sport! Reserva tu cancha de grass en línea con adelanto seguro del 50%.');
  const [mostrarModalAdminEditarSede, setMostrarModalAdminEditarSede] = useState<Sede | null>(null);
  const [mostrarModalUsuariosDirectorio, setMostrarModalUsuariosDirectorio] = useState(false);
  const [mostrarModalReporteFormal, setMostrarModalReporteFormal] = useState(false);
  const [confirmarEliminarUsuarioId, setConfirmarEliminarUsuarioId] = useState<string | null>(null);
  const [confirmarCancelarReservaId, setConfirmarCancelarReservaId] = useState<string | null>(null);

  // Estados para Pukllay Shield: Verificación de Legitimidad & Antifraude (KYC)
  const [verifTipoPersona, setVerifTipoPersona] = useState<'NATURAL' | 'JURIDICA'>('JURIDICA');
  const [verifRuc, setVerifRuc] = useState('');
  const [verifRazonSocial, setVerifRazonSocial] = useState('');
  const [verifDni, setVerifDni] = useState('');
  const [verifNumeroYape, setVerifNumeroYape] = useState(usuarioActual.telefono || '');
  const [verifTitularYape, setVerifTitularYape] = useState(usuarioActual.nombre || '');
  const [verifTipoDoc, setVerifTipoDoc] = useState<'LICENCIA_MUNICIPAL' | 'RECIBO_SERVICIOS' | 'CONTRATO_ARRENDAMIENTO' | 'TITULO_PROPIEDAD' | 'FOTO_FACHADA'>('LICENCIA_MUNICIPAL');
  const [verifDocUrl, setVerifDocUrl] = useState<string | null>(null);
  const [verifDeclaracion, setVerifDeclaracion] = useState(false);
  const [cargandoDocVerif, setCargandoDocVerif] = useState(false);
  const [motivoObsAdmin, setMotivoObsAdmin] = useState('');
  const [sedeAObservarId, setSedeAObservarId] = useState<string | null>(null);

  // Notificaciones para este propietario
  const notificaciones = service.obtenerNotificacionesPropietario(usuarioActual.id);
  const countPendientes = service.contarNotificacionesPendientes(usuarioActual.id);
  const countMensajesNoLeidos = service.contarMensajesNoLeidosTotal(usuarioActual.id);
  const datosAdmin = service.obtenerDatosContactoAdministrador();

  // Estados de carga de imágenes desde el dispositivo
  const [cargandoFotoNueva, setCargandoFotoNueva] = useState(false);
  const [cargandoFotoEdit, setCargandoFotoEdit] = useState(false);
  const [cargandoQr, setCargandoQr] = useState(false);
  const [comprobanteAmpliadoUrl, setComprobanteAmpliadoUrl] = useState<string | null>(null);

  // Estado para crear Cancha (RF-03)
  const [mostrarModalNuevaCancha, setMostrarModalNuevaCancha] = useState(false);
  const [nombreNuevaCancha, setNombreNuevaCancha] = useState('');
  const [deporteNuevaCancha, setDeporteNuevaCancha] = useState<DeporteTipo>('FUTBOL_7');
  const [superficieNuevaCancha, setSuperficieNuevaCancha] = useState<SuperficieTipo>('GRASS_PREMIUM_CAUCHO');
  const [techadaNuevaCancha, setTechadaNuevaCancha] = useState(false);
  const [precioNuevaCancha, setPrecioNuevaCancha] = useState(100);
  const [dimensionesNuevaCancha, setDimensionesNuevaCancha] = useState('30m x 50m');
  const [fotoUrlNuevaCancha, setFotoUrlNuevaCancha] = useState('https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=800&q=80');

  // Estado para EDITAR Cancha publicada
  const [canchaAEditar, setCanchaAEditar] = useState<Cancha | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDeporte, setEditDeporte] = useState<DeporteTipo>('FUTBOL_7');
  const [editSuperficie, setEditSuperficie] = useState<SuperficieTipo>('GRASS_PREMIUM_CAUCHO');
  const [editTechada, setEditTechada] = useState(false);
  const [editPrecio, setEditPrecio] = useState(100);
  const [editDimensiones, setEditDimensiones] = useState('');
  const [editFotoUrl, setEditFotoUrl] = useState('');

  // Estado para la ubicación al crear cancha / grass
  const [ubicacionGrassNueva, setUbicacionGrassNueva] = useState<IUbicacionGeo | null>(null);

  // Estado para EDITAR Sede
  const [mostrarModalEditarSede, setMostrarModalEditarSede] = useState(false);
  const [editSedeNombre, setEditSedeNombre] = useState('');
  const [editSedeDesc, setEditSedeDesc] = useState('');
  const [editSedeTel, setEditSedeTel] = useState('');
  const [editSedeUbicacion, setEditSedeUbicacion] = useState<IUbicacionGeo | null>(null);

  // Estado para crear NUEVA Sede / Complejo de Grass
  const [mostrarModalNuevaSede, setMostrarModalNuevaSede] = useState(false);
  const [nuevaSedeNombre, setNuevaSedeNombre] = useState('');
  const [nuevaSedeDesc, setNuevaSedeDesc] = useState('');
  const [nuevaSedeTel, setNuevaSedeTel] = useState(usuarioActual.telefono || '987112233');
  const [nuevaSedeUbicacion, setNuevaSedeUbicacion] = useState<IUbicacionGeo | null>(null);
  const [nuevaSedePrimeraCanchaNombre, setNuevaSedePrimeraCanchaNombre] = useState('Cancha 1: Principal Fútbol 7');
  const [nuevaSedeDeporte, setNuevaSedeDeporte] = useState<DeporteTipo>('FUTBOL_7');
  const [nuevaSedeSuperficie, setNuevaSedeSuperficie] = useState<SuperficieTipo>('GRASS_PREMIUM_CAUCHO');
  const [nuevaSedePrecio, setNuevaSedePrecio] = useState(100);

  // Estado para Regla Recurrente (RF-04)
  const [canchaReglaId, setCanchaReglaId] = useState<string>('');
  const [diasRegla, setDiasRegla] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [horaInicioRegla, setHoraInicioRegla] = useState('08:00');
  const [horaFinRegla, setHoraFinRegla] = useState('23:00');
  const [duracionRegla, setDuracionRegla] = useState(60);
  const [precioEspecialRegla, setPrecioEspecialRegla] = useState<number | undefined>(undefined);

  // Estado para Bloqueo Manual (RF-05)
  const [canchaBloqueoId, setCanchaBloqueoId] = useState<string>('');
  const [fechaBloqueo, setFechaBloqueo] = useState<string>(service.obtenerFechaHoyISO());
  const [horaInicioBloqueo, setHoraInicioBloqueo] = useState('14:00');
  const [horaFinBloqueo, setHoraFinBloqueo] = useState('16:00');
  const [motivoBloqueo, setMotivoBloqueo] = useState('Mantenimiento del césped sintético y caucho');

  // Estado para QR de Pago (RF Propietario QR)
  const datosPagoActuales: IDatosPagoPropietario = (usuarioActual as any).datosPago || {
    tipoBilletera: 'YAPE',
    numeroTelefono: usuarioActual.telefono,
    titular: usuarioActual.nombre,
    bancoNombre: 'BCP',
    numeroCuenta: '193-98765432-0-12',
    numeroCci: '002-193-009876543201-14',
    qrImagenUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YAPE_PUKLLAY_SPORT_PAGO',
  };

  const [formQr, setFormQr] = useState<IDatosPagoPropietario>(datosPagoActuales);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Reservas de esta sede (RF-11)
  const reservasSede = sedeSeleccionada ? service.obtenerReservasPorSede(sedeSeleccionada.id) : [];

  // Handlers para cargar fotos directamente desde el dispositivo (Galería / Cámara)
  const handleSubirFotoNueva = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargandoFotoNueva(true);
      const dataUrl = await procesarImagenDispositivo(file, 1200, 0.85);
      setFotoUrlNuevaCancha(dataUrl);
      mostrarAlerta('Foto cargada desde tu dispositivo correctamente.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al procesar la foto');
    } finally {
      setCargandoFotoNueva(false);
    }
  };

  const handleSubirFotoEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargandoFotoEdit(true);
      const dataUrl = await procesarImagenDispositivo(file, 1200, 0.85);
      setEditFotoUrl(dataUrl);
      mostrarAlerta('Foto actualizada desde tu dispositivo.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al procesar la foto');
    } finally {
      setCargandoFotoEdit(false);
    }
  };

  const handleSubirQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargandoQr(true);
      const dataUrl = await procesarImagenDispositivo(file, 800, 0.90);
      setFormQr(prev => ({ ...prev, qrImagenUrl: dataUrl }));
      mostrarAlerta('Imagen de Código QR cargada desde tu dispositivo. Haz clic en "Guardar Configuración" para confirmar.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al procesar el QR');
    } finally {
      setCargandoQr(false);
    }
  };

  const handleCrearCancha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeSeleccionada) return;

    service.registrarCancha(sedeSeleccionada.id, {
      nombre: nombreNuevaCancha,
      deporte: deporteNuevaCancha,
      superficie: superficieNuevaCancha,
      techada: techadaNuevaCancha,
      precioBaseHora: Number(precioNuevaCancha),
      dimensiones: dimensionesNuevaCancha,
      fotos: [fotoUrlNuevaCancha],
    });

    // Si el propietario configuró o actualizó la ubicación real del grass, actualizar la sede
    if (ubicacionGrassNueva) {
      service.editarSede(sedeSeleccionada.id, {
        ubicacion: ubicacionGrassNueva,
      });
    }

    setMostrarModalNuevaCancha(false);
    setNombreNuevaCancha('');
    setUbicacionGrassNueva(null);
    mostrarAlerta('¡Cancha de grass registrada exitosamente con su ubicación fijada!');
  };

  // Handler para crear NUEVO COMPLEJO / SEDE desde cero
  const handleCrearNuevaSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaSedeNombre.trim()) {
      mostrarAlerta('Por favor ingresa el nombre del complejo deportivo');
      return;
    }

    try {
      const ubicacionFinal = nuevaSedeUbicacion || {
        lat: -12.122150,
        lng: -77.036880,
        direccion: 'Av. Principal',
        distrito: 'Santiago de Surco',
        ciudad: 'Lima'
      };

      const nuevaSedeCreada = service.registrarSede(usuarioActual.id, {
        nombre: nuevaSedeNombre.trim(),
        descripcion: nuevaSedeDesc.trim() || 'Complejo deportivo con canchas de grass sintético de primera calidad.',
        direccion: ubicacionFinal.direccion,
        distrito: ubicacionFinal.distrito,
        ciudad: ubicacionFinal.ciudad,
        lat: ubicacionFinal.lat,
        lng: ubicacionFinal.lng,
        telefono: nuevaSedeTel.trim() || usuarioActual.telefono || '987112233',
        amenidades: ['Estacionamiento', 'Vestuarios', 'Iluminación LED', 'Bebidas'],
        fotos: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80']
      });

      // Registrar automáticamente la primera cancha de grass
      service.registrarCancha(nuevaSedeCreada.id, {
        nombre: nuevaSedePrimeraCanchaNombre.trim() || 'Cancha 1: Principal Fútbol 7',
        deporte: nuevaSedeDeporte || 'FUTBOL_7',
        superficie: nuevaSedeSuperficie || 'GRASS_PREMIUM_CAUCHO',
        techada: false,
        precioBaseHora: Number(nuevaSedePrecio) || 100,
        dimensiones: '30m x 50m',
        fotos: [fotoUrlNuevaCancha || 'https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=800&q=80']
      });

      setSedeSeleccionadaId(nuevaSedeCreada.id);
      setTabActiva('CANCHAS');
      setMostrarModalNuevaSede(false);
      setNuevaSedeNombre('');
      setNuevaSedeDesc('');
      setNuevaSedeUbicacion(null);
      mostrarAlerta('¡Nuevo complejo deportivo registrado exitosamente! Puedes gestionar sus canchas y configurar sus métodos de pago.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al registrar el complejo deportivo');
    }
  };

  // Handlers para Eliminar Canchas y Sedes
  const handleEliminarCancha = (canchaId: string) => {
    try {
      service.eliminarCancha(canchaId, usuarioActual.id, esAdmin);
      setCanchaAEliminar(null);
      mostrarAlerta('Cancha eliminada exitosamente.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al eliminar la cancha');
    }
  };

  const handleEliminarSede = (sedeId: string) => {
    try {
      service.eliminarSede(sedeId, usuarioActual.id, esAdmin);
      setSedeAEliminar(null);
      const restantes = esAdmin 
        ? service.obtenerSedes() 
        : service.obtenerSedes().filter(s => s.propietarioId === usuarioActual.id);
      setSedeSeleccionadaId(restantes[0]?.id || null);
      mostrarAlerta('Complejo deportivo eliminado del sistema.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al eliminar el complejo deportivo');
    }
  };

  // Handlers para Verificación Antifraude (Pukllay Shield)
  const handleSubirDocVerif = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCargandoDocVerif(true);
      const dataUrl = await procesarImagenDispositivo(file, 1600, 0.85);
      setVerifDocUrl(dataUrl);
      mostrarAlerta('Documento o comprobante cargado desde tu dispositivo.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al procesar el archivo');
    } finally {
      setCargandoDocVerif(false);
    }
  };

  const handleEnviarVerificacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeSeleccionada) return;

    if (!verifTitularYape.trim()) {
      mostrarAlerta('Ingresa el nombre del responsable o titular de la sede para coordinar con el Administrador.');
      return;
    }

    try {
      const res = service.solicitarVerificacionSede(sedeSeleccionada.id, {
        ruc: verifRuc.trim() || undefined,
        razonSocial: verifRazonSocial.trim() || sedeSeleccionada.nombre,
        dni: verifDni.trim() || undefined,
        tipoDocumento: verifTipoDoc,
        documentoUrl: verifDocUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        fechaSolicitud: new Date().toISOString(),
        titularYape: verifTitularYape.trim(),
        numeroYape: verifNumeroYape.trim() || usuarioActual.telefono,
        nombreContacto: verifTitularYape.trim() || usuarioActual.nombre,
        contactoWhatsApp: verifNumeroYape.trim() || usuarioActual.telefono,
        contactoEmail: usuarioActual.email,
        notasAdmin: `Solicitud de verificación enviada por ${usuarioActual.nombre} para ${sedeSeleccionada.nombre}.`,
      });

      const sedeUpd = service.obtenerSedePorId(sedeSeleccionada.id);
      if (sedeUpd) setSedeSeleccionada(sedeUpd);

      mostrarAlerta(res.mensaje || '¡Solicitud notificada al Administrador! Te contactaremos vía WhatsApp o Correo para otorgar el Check Verificado.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al enviar verificación');
    }
  };

  const handleSolicitarYContactarAdminWhatsApp = () => {
    if (!sedeSeleccionada) return;
    handleEnviarVerificacion({ preventDefault: () => {} } as any);
    const msg = `Hola Administrador de Pukllay Sport, soy ${usuarioActual.nombre}, acabo de solicitar la verificación para mi complejo deportivo "${sedeSeleccionada.nombre}". Mi WhatsApp de contacto es ${verifNumeroYape.trim() || usuarioActual.telefono} y mi correo es ${usuarioActual.email}. ¿Podemos coordinar la verificación oficial para obtener el Check Verificado en la página web?`;
    window.open(`https://wa.me/51${datosAdmin.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAprobarSedeAdmin = (sedeId: string) => {
    try {
      const res = service.aprobarVerificacionSede(sedeId, usuarioActual.nombre, 'Aprobado y certificado con Check Oficial por Administrador');
      const sedeUpd = service.obtenerSedePorId(sedeId);
      if (sedeUpd && sedeSeleccionada?.id === sedeId) setSedeSeleccionada(sedeUpd);
      mostrarAlerta(`✓ ¡Complejo deportivo aprobado con Check Verificado Oficial! Sello: ${res.sello}`);
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al aprobar sede');
    }
  };

  const handleObservarSedeAdmin = (sedeId: string) => {
    if (!motivoObsAdmin.trim()) {
      mostrarAlerta('Ingresa el motivo de seguridad de la observación.');
      return;
    }
    try {
      service.observarVerificacionSede(sedeId, motivoObsAdmin.trim());
      setSedeAObservarId(null);
      setMotivoObsAdmin('');
      const sedeUpd = service.obtenerSedePorId(sedeId);
      if (sedeUpd && sedeSeleccionada?.id === sedeId) setSedeSeleccionada(sedeUpd);
      mostrarAlerta('Sede observada y notificada por seguridad.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al observar sede');
    }
  };

  // Abrir modal de edición de cancha
  const handleAbrirEdicionCancha = (cancha: Cancha) => {
    setCanchaAEditar(cancha);
    setEditNombre(cancha.nombre);
    setEditDeporte(cancha.deporte);
    setEditSuperficie(cancha.superficie);
    setEditTechada(cancha.techada);
    setEditPrecio(cancha.precioBaseHora);
    setEditDimensiones(cancha.dimensiones);
    setEditFotoUrl(cancha.fotos[0] || '');
  };

  // Guardar edición de cancha
  const handleGuardarEdicionCancha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canchaAEditar) return;

    service.editarCancha(canchaAEditar.id, {
      nombre: editNombre,
      deporte: editDeporte,
      superficie: editSuperficie,
      techada: editTechada,
      precioBaseHora: Number(editPrecio),
      dimensiones: editDimensiones,
      fotos: [editFotoUrl],
    });

    setCanchaAEditar(null);
    mostrarAlerta('¡Cancha editada y actualizada exitosamente!');
  };

  // Abrir modal de edición de sede
  const handleAbrirEdicionSede = () => {
    if (!sedeSeleccionada) return;
    setEditSedeNombre(sedeSeleccionada.nombre);
    setEditSedeDesc(sedeSeleccionada.descripcion);
    setEditSedeTel(sedeSeleccionada.telefonoContacto);
    setEditSedeUbicacion(sedeSeleccionada.ubicacion);
    setMostrarModalEditarSede(true);
  };

  const handleGuardarEdicionSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeSeleccionada) return;

    service.editarSede(sedeSeleccionada.id, {
      nombre: editSedeNombre,
      descripcion: editSedeDesc,
      telefono: editSedeTel,
      ubicacion: editSedeUbicacion || sedeSeleccionada.ubicacion,
    });

    setMostrarModalEditarSede(false);
    mostrarAlerta('¡Datos y ubicación del complejo deportivo actualizados exitosamente!');
  };

  const handleToggleCanchaActiva = (canchaId: string) => {
    const estado = service.toggleEstadoCancha(canchaId);
    mostrarAlerta(estado ? 'Cancha activada: Ahora visible para reservas' : 'Cancha desactivada: Oculta para clientes (RF-03)');
  };

  const handleGuardarRegla = (e: React.FormEvent) => {
    e.preventDefault();
    const cId = canchaReglaId || sedeSeleccionada?.canchas[0]?.id;
    if (!cId) return;

    service.agregarReglaDisponibilidad(cId, {
      diasSemana: diasRegla,
      horaInicio: horaInicioRegla,
      horaFin: horaFinRegla,
      duracionMinutos: Number(duracionRegla),
      precioEspecial: precioEspecialRegla ? Number(precioEspecialRegla) : undefined,
    });

    mostrarAlerta('Regla recurrente de disponibilidad guardada. Horarios futuros actualizados automáticamente (RF-04).');
  };

  const handleGuardarBloqueo = (e: React.FormEvent) => {
    e.preventDefault();
    const cId = canchaBloqueoId || sedeSeleccionada?.canchas[0]?.id;
    if (!cId) return;

    service.bloquearHorario(cId, {
      fecha: fechaBloqueo,
      horaInicio: horaInicioBloqueo,
      horaFin: horaFinBloqueo,
      motivo: motivoBloqueo,
    });

    mostrarAlerta('Horario bloqueado exitosamente. Ningún cliente podrá reservarlo (RF-05).');
  };

  const handleGuardarQr = (e: React.FormEvent) => {
    e.preventDefault();
    service.actualizarDatosPagoPropietario(usuarioActual.id, formQr);
    mostrarAlerta('Datos de pago y Código QR actualizados para tus clientes.');
  };

  // Estado para modal de Rechazo de Pago (evita window.prompt)
  const [reservaARechazar, setReservaARechazar] = useState<{
    id: string;
    clienteNombre: string;
    canchaNombre: string;
    fecha: string;
    hora: string;
    monto: number;
    tipoPago: string;
  } | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('Comprobante no válido o fondos no reflejados');

  // Confirmar y aprobar pago de reserva
  const handleAprobarPagoReserva = (reservaId: string) => {
    try {
      service.aprobarPagoYConfirmarReserva(reservaId, 'Comprobante verificado correctamente por el propietario');
      mostrarAlerta('¡Pago confirmado! La reserva ha sido activada y el turno está oficialmente reservado.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al aprobar la reserva');
    }
  };

  // Abrir modal de rechazo de pago de reserva
  const handleAbrirRechazoModal = (notificacion: NotificacionPropietario) => {
    setReservaARechazar({
      id: notificacion.reservaId,
      clienteNombre: notificacion.clienteNombre,
      canchaNombre: notificacion.canchaNombre,
      fecha: notificacion.fechaPartido,
      hora: notificacion.horaPartido,
      monto: notificacion.montoAbonado,
      tipoPago: notificacion.tipoPago,
    });
    setMotivoRechazo('Comprobante no válido o fondos no reflejados');
  };

  const handleConfirmarRechazoPago = () => {
    if (!reservaARechazar) return;
    try {
      service.rechazarPagoReserva(reservaARechazar.id, motivoRechazo || 'Pago no acreditado');
      setReservaARechazar(null);
      mostrarAlerta('Pago rechazado. El horario ha sido liberado nuevamente.');
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al rechazar la reserva');
    }
  };

  const mostrarAlerta = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Banner Superior Propietario */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                Panel Exclusivo de Propietario
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {usuarioActual.nombre}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Gestión de Sedes, Canchas & Pagos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Edita la información de tus canchas, confirma los pagos entrantes de tus clientes, define horarios y administra tu QR.
            </p>
          </div>

          {/* Selector y Edición de Sede */}
          <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sede Activa:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaSede(true)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Registrar un nuevo complejo deportivo con canchas"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Registrar Complejo Deportivo</span>
                </button>
                {sedeSeleccionada && (
                  <button
                    type="button"
                    onClick={handleAbrirEdicionSede}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Editar datos y ubicación de la sede"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar Sede</span>
                  </button>
                )}
                {sedeSeleccionada && (
                  <button
                    type="button"
                    onClick={() => setSedeAEliminar({ id: sedeSeleccionada.id, nombre: sedeSeleccionada.nombre })}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Eliminar este complejo deportivo"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar Complejo</span>
                  </button>
                )}
              </div>
            </div>
            <select
              value={sedeSeleccionada?.id || ''}
              onChange={(e) => {
                const s = sedesPropietario.find(x => x.id === e.target.value);
                if (s) setSedeSeleccionada(s);
              }}
              className="text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {sedesPropietario.length === 0 ? (
                <option value="">(Sin complejos registrados aún)</option>
              ) : (
                sedesPropietario.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.ubicacion.distrito})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Alerta de Éxito Flotante */}
      {mensajeExito && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Pestañas de Gestión */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
        {/* TAB 0: CONTROL DE INGRESOS Y HORARIOS CON GRÁFICA */}
        <button
          onClick={() => setTabActiva('DASHBOARD')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'DASHBOARD'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Ingresos & Horarios (Dashboard)</span>
        </button>

        <button
          onClick={() => setTabActiva('CANCHAS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'CANCHAS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Mis Canchas & Edición (RF-03)</span>
        </button>

        {/* TAB NOTIFICACIONES CON CONTADOR */}
        <button
          onClick={() => setTabActiva('NOTIFICACIONES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'NOTIFICACIONES'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notificaciones & Pagos</span>
          {countPendientes > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
              {countPendientes} pendiente{countPendientes > 1 ? 's' : ''}
            </span>
          )}
        </button>

        {/* TAB MENSAJES DIRECTOS CON CLIENTES */}
        <button
          onClick={() => setTabActiva('MENSAJES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'MENSAJES'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Mensajes & Dudas Clientes</span>
          {countMensajesNoLeidos > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black animate-pulse">
              {countMensajesNoLeidos} nuevo{countMensajesNoLeidos > 1 ? 's' : ''}
            </span>
          )}
        </button>

        <button
          onClick={() => setTabActiva('REGLAS_HORARIOS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'REGLAS_HORARIOS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Reglas de Disponibilidad (RF-04)</span>
        </button>

        <button
          onClick={() => setTabActiva('BLOQUEOS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'BLOQUEOS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Bloqueo de Horarios (RF-05)</span>
        </button>

        <button
          onClick={() => setTabActiva('CONFIG_QR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'CONFIG_QR'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR de Pago (Yape/Plin)</span>
        </button>

        <button
          onClick={() => setTabActiva('RESERVAS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'RESERVAS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Historial Completo ({reservasSede.length})</span>
        </button>

        {/* TAB 8: VERIFICACIÓN CON EL ADMINISTRADOR & CHECK OFICIAL */}
        <button
          onClick={() => setTabActiva('VERIFICACION_ANTIFRAUDE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            tabActiva === 'VERIFICACION_ANTIFRAUDE'
              ? 'bg-emerald-600 text-white shadow-md'
              : sedeSeleccionada?.esVerificada
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
          }`}
        >
          {sedeSeleccionada?.esVerificada ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span>🛡️ Check Verificado Administrador</span>
          {sedeSeleccionada?.esVerificada ? (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              ✓ Verificado
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              En proceso
            </span>
          )}
        </button>

        {/* TAB 9: CONTROL MAESTRO Y DOMINIO TOTAL (SUPER-ADMIN) */}
        {esAdmin && (
          <button
            onClick={() => setTabActiva('CONTROL_ADMIN')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer shadow-md ${
              tabActiva === 'CONTROL_ADMIN' && subtabAdmin !== 'DASHBOARD_KPI'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-purple-500/30'
                : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/50'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>👑 CONTROL MAESTRO</span>
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full">
              GLOBAL
            </span>
          </button>
        )}

        {/* TAB 10: DASHBOARD ANALYTICS & KPIS RECHARTS (SUPER-ADMIN) */}
        {esAdmin && (
          <button
            onClick={() => {
              setTabActiva('CONTROL_ADMIN');
              setSubtabAdmin('DASHBOARD_KPI');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer shadow-md ${
              tabActiva === 'CONTROL_ADMIN' && subtabAdmin === 'DASHBOARD_KPI'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-cyan-500/30'
                : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>📊 DASHBOARD KPIS (RECHARTS)</span>
            <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 text-[10px] font-black rounded-full">
              BI
            </span>
          </button>
        )}
      </div>

      {/* ALERTA DE SEGURIDAD CUANDO LA SEDE NO ESTÁ VERIFICADA */}
      {sedeSeleccionada && !sedeSeleccionada.esVerificada && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm text-amber-950 flex items-center gap-2">
                <span>⚠️ Complejo en Proceso de Verificación con el Administrador</span>
              </h4>
              <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                El Administrador de la página web ({datosAdmin.email}) supervisa cada complejo para validar su ubicación y otorgar el <strong>Check Verificado Oficial</strong>. 
                Puedes coordinar directamente por WhatsApp o Correo para obtener tu insignia de confianza.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTabActiva('VERIFICACION_ANTIFRAUDE')}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Coordinar Verificación con Administrador</span>
          </button>
        </div>
      )}

      {/* CONTENIDO SEGÚN TAB */}

      {/* 0. PANEL DE CONTROL DE INGRESOS Y HORARIOS CON GRÁFICA SIMPLE */}
      {tabActiva === 'DASHBOARD' && sedeSeleccionada && (
        <PanelIngresosYHorarios
          usuarioActual={usuarioActual}
          sede={sedeSeleccionada}
          onVerNotificaciones={() => setTabActiva('NOTIFICACIONES')}
        />
      )}

      {tabActiva === 'DASHBOARD' && !sedeSeleccionada && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto my-8 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black uppercase rounded-full border border-emerald-200">
            Tu Espacio Privado de Propietario
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 mb-2">
            ¡Bienvenido, {usuarioActual.nombre}!
          </h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Tu entorno personal y base de datos están listos. Aún no tienes ningún complejo deportivo registrado. 
            Las canchas que registres aquí serán exclusivamente tuyas y únicamente tú tendrás acceso a verlas y administrarlas.
          </p>
          <button
            type="button"
            onClick={() => setMostrarModalNuevaSede(true)}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>+ Registrar mi Primer Complejo Deportivo & Canchas</span>
          </button>
        </div>
      )}

      {/* MENSAJERÍA DIRECTA CON CLIENTES EN TIEMPO REAL */}
      {tabActiva === 'MENSAJES' && (
        <PanelMensajesPropietario usuarioActual={usuarioActual} />
      )}
      
      {/* 1. GESTIÓN Y EDICIÓN DE CANCHAS (RF-03) */}
      {tabActiva === 'CANCHAS' && !sedeSeleccionada && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto my-8 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Aún no has registrado ningún complejo deportivo
          </h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Para agregar y personalizar canchas con su tipo de grass, dimensiones y precio por hora, primero registra tu complejo.
          </p>
          <button
            type="button"
            onClick={() => setMostrarModalNuevaSede(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all text-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>+ Registrar Complejo Deportivo</span>
          </button>
        </div>
      )}

      {tabActiva === 'CANCHAS' && sedeSeleccionada && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Canchas Publicadas en "{sedeSeleccionada.nombre}"
              </h3>
              <p className="text-xs text-slate-500">
                Puedes editar nombres, precios, fotos y dimensiones, o activar/desactivar cada cancha.
              </p>
            </div>
            <button
              onClick={() => setMostrarModalNuevaCancha(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nueva Cancha</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedeSeleccionada.canchas.map((cancha) => (
              <div
                key={cancha.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                  cancha.activa ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20 opacity-80'
                }`}
              >
                <div>
                  <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-slate-100">
                    <img
                      src={cancha.fotos[0]}
                      alt={cancha.nombre}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        cancha.activa ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {cancha.activa ? 'Activa' : 'Desactivada'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{cancha.nombre}</h4>
                  </div>

                  <div className="flex flex-wrap gap-1.5 my-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {cancha.deporte}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {cancha.superficie}
                    </span>
                    {cancha.techada && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        Techada
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-mono font-bold mt-1">
                    Precio: <span className="text-emerald-700 text-sm font-black">S/. {cancha.precioBaseHora}/hr</span> • {cancha.dimensiones}
                  </p>
                </div>

                {/* BOTONES DE EDICIÓN Y ACTIVACIÓN */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAbrirEdicionCancha(cancha)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar Cancha</span>
                  </button>

                  <button
                    onClick={() => handleToggleCanchaActiva(cancha.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      cancha.activa
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {cancha.activa ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{cancha.activa ? 'Desactivar' : 'Activar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanchaAEliminar({ id: cancha.id, nombre: cancha.nombre })}
                    className="p-1.5 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 transition-colors cursor-pointer"
                    title="Eliminar Cancha"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {sedeSeleccionada.canchas.length === 0 && (
              <div className="col-span-full bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">No tienes canchas registradas en este complejo</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">Agrega tu primera cancha con sus dimensiones, fotos y precio por hora.</p>
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaCancha(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  + Registrar Cancha Ahora
                </button>
              </div>
            )}
          </div>

          {/* MODAL EDITAR CANCHA */}
          {canchaAEditar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-black text-slate-900">
                      Editar Cancha de Grass Publicada
                    </h3>
                  </div>
                  <button
                    onClick={() => setCanchaAEditar(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarEdicionCancha} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de la Cancha:</label>
                    <input
                      type="text"
                      required
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Deporte:</label>
                      <select
                        value={editDeporte}
                        onChange={(e) => setEditDeporte(e.target.value as DeporteTipo)}
                        className="w-full px-3 py-2 border rounded-xl font-medium"
                      >
                        <option value="FUTBOL_7">Fútbol 7</option>
                        <option value="FUTBOL_6">Fútbol 6</option>
                        <option value="FUTBOL_5">Fútbol 5</option>
                        <option value="FUTSAL">Futsal</option>
                        <option value="PADEL">Pádel</option>
                        <option value="VOLEY">Vóley</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Superficie:</label>
                      <select
                        value={editSuperficie}
                        onChange={(e) => setEditSuperficie(e.target.value as SuperficieTipo)}
                        className="w-full px-3 py-2 border rounded-xl font-medium"
                      >
                        <option value="GRASS_PREMIUM_CAUCHO">Grass Premium + Caucho</option>
                        <option value="GRASS_MONOFILAMENTO">Grass Monofilamento</option>
                        <option value="GRASS_FIBRILADO">Grass Fibrilado</option>
                        <option value="LOSA_DEPORTIVA">Losa Deportiva</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Precio por Hora (S/.):</label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        required
                        value={editPrecio}
                        onChange={(e) => setEditPrecio(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dimensiones:</label>
                      <input
                        type="text"
                        value={editDimensiones}
                        onChange={(e) => setEditDimensiones(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Carga de Foto de Cancha Directa desde Dispositivo */}
                  <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
                    <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        Foto del Grass Sintético:
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Cargar desde Dispositivo</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border flex-shrink-0">
                        {editFotoUrl ? (
                          <img src={editFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          id="editFotoCanchaFileInput"
                          accept="image/*"
                          onChange={handleSubirFotoEdit}
                          className="hidden"
                        />
                        <label
                          htmlFor="editFotoCanchaFileInput"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{cargandoFotoEdit ? 'Procesando...' : 'Subir foto del celular / PC'}</span>
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Selecciona una foto real de tu grass o ingresa una URL alternativa.
                        </p>
                      </div>
                    </div>

                    <input
                      type="url"
                      value={editFotoUrl}
                      onChange={(e) => setEditFotoUrl(e.target.value)}
                      placeholder="O escribe una URL directa https://..."
                      className="w-full px-3 py-1.5 border rounded-xl font-mono text-[11px] bg-white text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="editTechadaCheck"
                      checked={editTechada}
                      onChange={(e) => setEditTechada(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="editTechadaCheck" className="font-bold text-slate-700">¿Es cancha techada?</label>
                  </div>

                  <div className="pt-3 border-t flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCanchaAEditar(null)}
                      className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. NOTIFICACIONES DE RESERVAS Y CONFIRMACIÓN DE PAGOS */}
      {tabActiva === 'NOTIFICACIONES' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                <span>Notificaciones de Reservas & Confirmación de Pago</span>
              </h3>
              <p className="text-xs text-slate-500">
                Revisa los comprobantes subidos por tus clientes. Al hacer clic en "Aprobar", la reserva se confirma oficialmente.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {notificaciones.length} notificaciones registradas
            </span>
          </div>

          {notificaciones.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-600">No hay notificaciones de reservas todavía</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando un cliente seleccione un horario y envíe su pago con QR (50% o 100%), aparecerá aquí para tu confirmación.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notificaciones.map((n) => {
                const esPendiente = n.estado === 'PENDIENTE';
                return (
                  <div
                    key={n.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      esPendiente
                        ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-md'
                        : n.estado === 'APROBADA'
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : 'bg-rose-50/20 border-rose-200 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            esPendiente
                              ? 'bg-amber-500 text-white'
                              : n.estado === 'APROBADA'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}>
                            {esPendiente ? '⚠️ Pago Pendiente de Confirmación' : n.estado === 'APROBADA' ? '✓ Pago Aprobado - Turno Confirmado' : '✕ Pago Rechazado'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-base leading-tight">
                          {n.clienteNombre} reservó {n.canchaNombre}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {n.sedeNombre}
                        </p>
                      </div>

                      <div className="text-left sm:text-right bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha y Hora:</span>
                        <span className="text-xs font-bold text-emerald-800 font-mono">
                          {n.fechaPartido} • {n.horaPartido}
                        </span>
                      </div>
                    </div>

                    {/* Detalle del pago, comprobante y contacto */}
                    <div className="py-3 border-y border-black/5 my-2 flex flex-col md:flex-row gap-4 items-start justify-between">
                      {/* Vista previa del comprobante */}
                      <div className="flex items-center gap-3">
                        {n.comprobanteUrl ? (
                          <div 
                            onClick={() => setComprobanteAmpliadoUrl(n.comprobanteUrl || null)}
                            className="relative group cursor-pointer w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex-shrink-0"
                            title="Haz clic para ver comprobante en tamaño completo"
                          >
                            <img
                              src={n.comprobanteUrl}
                              alt="Comprobante de pago"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ampliar</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[10px] text-center p-1">
                            <ImageIcon className="w-5 h-5 mb-1" />
                            <span>Sin foto</span>
                          </div>
                        )}

                        <div className="text-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Comprobante de Pago:</span>
                          <span className="font-bold text-slate-800">
                            {n.comprobanteUrl ? 'Captura enviada por el cliente' : 'No adjuntó captura'}
                          </span>
                          {n.comprobanteUrl && (
                            <button
                              type="button"
                              onClick={() => setComprobanteAmpliadoUrl(n.comprobanteUrl || null)}
                              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 mt-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspeccionar Comprobante</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Datos de la transacción */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs w-full md:w-auto">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Monto Abonado:</span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            S/. {n.montoAbonado}.00
                          </span>
                          <span className="text-[11px] text-emerald-700 block font-semibold">{n.tipoPago}</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">N° Operación:</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                            {n.numeroOperacion}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Contacto:</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {n.clienteTelefono}
                          </span>
                          <a
                            href={`https://wa.me/51${n.clienteTelefono}?text=Hola%20${encodeURIComponent(n.clienteNombre)},%20te%20escribo%20de%20${encodeURIComponent(n.sedeNombre)}%20respecto%20a%20tu%20reserva%20en%20Pukllay%20Sport.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN: CONFIRMAR O RECHAZAR PAGO */}
                    {esPendiente ? (
                      <div className="pt-3 border-t border-black/5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-amber-800 font-medium">
                          El cliente abonó por Yape/Plin. Confirma que recibiste el dinero en tu cuenta antes de validar.
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAbrirRechazoModal(n)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazar Pago</span>
                          </button>

                          <button
                            onClick={() => handleAprobarPagoReserva(n.reservaId)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Aprobar Pago y Confirmar Reserva</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-black/5 text-[11px] text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Estado procesado por el propietario.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. REGLAS RECURRENTES DE DISPONIBILIDAD (RF-04) */}
      {tabActiva === 'REGLAS_HORARIOS' && sedeSeleccionada && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">
              Reglas de Disponibilidad Recurrente (RF-04)
            </h3>
            <p className="text-xs text-slate-500">
              Criterio RF-04: El propietario define días, rango horario, duración del bloque y precio. El sistema genera los horarios automáticamente y actualiza fechas futuras sin reservas.
            </p>
          </div>

          <form onSubmit={handleGuardarRegla} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Seleccionar Cancha:</label>
              <select
                value={canchaReglaId || sedeSeleccionada.canchas[0]?.id}
                onChange={(e) => setCanchaReglaId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
              >
                {sedeSeleccionada.canchas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Apertura:</label>
                <input
                  type="time"
                  value={horaInicioRegla}
                  onChange={(e) => setHoraInicioRegla(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Cierre:</label>
                <input
                  type="time"
                  value={horaFinRegla}
                  onChange={(e) => setHoraFinRegla(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Duración del Bloque (minutos):</label>
                <select
                  value={duracionRegla}
                  onChange={(e) => setDuracionRegla(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                >
                  <option value={60}>60 minutos (Estándar)</option>
                  <option value={90}>90 minutos (Partido y medio)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Precio Especial (Opcional S/.):</label>
                <input
                  type="number"
                  min="10"
                  placeholder="Dejar vacío para precio base"
                  value={precioEspecialRegla || ''}
                  onChange={(e) => setPrecioEspecialRegla(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-slate-700 mb-2">Días que aplica la regla:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { dia: 1, label: 'Lunes' },
                  { dia: 2, label: 'Martes' },
                  { dia: 3, label: 'Miércoles' },
                  { dia: 4, label: 'Jueves' },
                  { dia: 5, label: 'Viernes' },
                  { dia: 6, label: 'Sábado' },
                  { dia: 0, label: 'Domingo' },
                ].map((d) => {
                  const seleccionado = diasRegla.includes(d.dia);
                  return (
                    <button
                      key={d.dia}
                      type="button"
                      onClick={() => {
                        if (seleccionado) {
                          setDiasRegla(diasRegla.filter(x => x !== d.dia));
                        } else {
                          setDiasRegla([...diasRegla, d.dia]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        seleccionado ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
            >
              Aplicar y Generar Horarios Automáticos
            </button>
          </form>
        </div>
      )}

      {/* 4. BLOQUEO DE HORARIOS (RF-05) */}
      {tabActiva === 'BLOQUEOS' && sedeSeleccionada && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">
              Bloqueo Manual de Horarios (RF-05)
            </h3>
            <p className="text-xs text-slate-500">
              Criterio RF-05: Bloquea horarios por mantenimiento, uso propio o feriados. Ningún cliente podrá reservarlos.
            </p>
          </div>

          <form onSubmit={handleGuardarBloqueo} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Cancha a Bloquear:</label>
              <select
                value={canchaBloqueoId || sedeSeleccionada.canchas[0]?.id}
                onChange={(e) => setCanchaBloqueoId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
              >
                {sedeSeleccionada.canchas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha del Bloqueo:</label>
                <input
                  type="date"
                  value={fechaBloqueo}
                  min={service.obtenerFechaHoyISO()}
                  onChange={(e) => setFechaBloqueo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Inicio:</label>
                <input
                  type="time"
                  value={horaInicioBloqueo}
                  onChange={(e) => setHoraInicioBloqueo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Fin:</label>
                <input
                  type="time"
                  value={horaFinBloqueo}
                  onChange={(e) => setHoraFinBloqueo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Motivo del Bloqueo:</label>
              <input
                type="text"
                required
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
                placeholder="Ej. Mantenimiento del césped, Feriado, Uso personal del propietario"
                className="w-full px-3 py-2 border rounded-xl font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
            >
              Confirmar Bloqueo de Horario (RF-05)
            </button>
          </form>

          {/* Bloqueos Existentes */}
          <div className="mt-6 pt-5 border-t">
            <h4 className="font-bold text-xs text-slate-700 mb-2">Bloqueos Activos Registrados:</h4>
            {sedeSeleccionada.canchas.flatMap(c => c.bloqueos).length === 0 ? (
              <p className="text-xs text-slate-400">No hay bloqueos activos en esta sede.</p>
            ) : (
              <div className="space-y-2">
                {sedeSeleccionada.canchas.map(c => 
                  c.bloqueos.filter(b => b.activo).map(b => (
                    <div key={b.id} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{c.nombre}: </span>
                        <span className="text-slate-600">{b.fecha} de {b.horaInicio} a {b.horaFin}</span>
                        <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Motivo: {b.motivo}</p>
                      </div>
                      <button
                        onClick={() => {
                          service.removerBloqueo(c.id, b.id);
                          mostrarAlerta('Bloqueo eliminado. El horario vuelve a estar disponible.');
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Liberar bloqueo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CONFIGURACIÓN DEL QR DE PAGO */}
      {tabActiva === 'CONFIG_QR' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-2xl">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">
              Configuración de Código QR y Cuentas de Cobro
            </h3>
            <p className="text-xs text-slate-500">
              Facilita la transacción permitiendo que tus clientes escaneen tu QR de Yape / Plin al reservar su horario con 50% o 100%.
            </p>
          </div>

          {!sedeSeleccionada?.esVerificada ? (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900">
                  ⏳ Sede en proceso de Verificación con el Administrador
                </p>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Para que tu código QR y número de cobro cuenten con el Check Verificado oficial para adelantos, coordina directamente con el Administrador por WhatsApp o Correo.
                </p>
                <button
                  type="button"
                  onClick={() => setTabActiva('VERIFICACION_ANTIFRAUDE')}
                  className="mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Coordinar Check Verificado con Administrador →</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">
                    ✓ Cobros por Yape y Plin Activos y Certificados
                  </p>
                  <p className="text-[10px] text-emerald-800 font-mono">
                    Sello Pukllay Shield: {sedeSeleccionada.selloSeguridad || 'PUKLLAY-SHIELD-SURCO'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleGuardarQr} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Billetera Digital Principal:</label>
                <select
                  value={formQr.tipoBilletera}
                  onChange={(e) => setFormQr({ ...formQr, tipoBilletera: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                >
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Celular Yape / Plin:</label>
                <input
                  type="tel"
                  required
                  value={formQr.numeroTelefono || ''}
                  onChange={(e) => setFormQr({ ...formQr, numeroTelefono: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre del Titular:</label>
              <input
                type="text"
                required
                value={formQr.titular}
                onChange={(e) => setFormQr({ ...formQr, titular: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Banco (Opcional):</label>
                <input
                  type="text"
                  placeholder="BCP, BBVA, Interbank..."
                  value={formQr.bancoNombre || ''}
                  onChange={(e) => setFormQr({ ...formQr, bancoNombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Cuenta / CCI:</label>
                <input
                  type="text"
                  placeholder="193-..."
                  value={formQr.numeroCuenta || ''}
                  onChange={(e) => setFormQr({ ...formQr, numeroCuenta: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Carga del QR desde Dispositivo */}
            <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
              <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Imagen de tu Código QR (Yape / Plin):
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Cargar desde Dispositivo</span>
              </label>

              <div className="flex items-center gap-3">
                <div className="w-24 h-24 bg-white p-2 rounded-xl border flex-shrink-0 flex items-center justify-center shadow-sm">
                  <img
                    src={formQr.qrImagenUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YAPE_PUKLLAY_${formQr.numeroTelefono}`}
                    alt="Vista previa QR"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    id="propietarioQrFileInput"
                    accept="image/*"
                    onChange={handleSubirQr}
                    className="hidden"
                  />
                  <label
                    htmlFor="propietarioQrFileInput"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{cargandoQr ? 'Cargando QR...' : 'Subir foto o captura del QR desde celular / PC'}</span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Sube la captura de tu QR emitida por tu app del banco o Yape/Plin.
                  </p>
                </div>
              </div>

              <input
                type="url"
                value={formQr.qrImagenUrl || ''}
                onChange={(e) => setFormQr({ ...formQr, qrImagenUrl: e.target.value })}
                placeholder="O pega un enlace de imagen https://..."
                className="w-full px-3 py-1.5 border rounded-xl font-mono text-[11px] bg-white text-slate-700"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
            >
              Guardar Configuración de Cobro
            </button>
          </form>
        </div>
      )}

      {/* 6. HISTORIAL DE RESERVAS (RF-11) */}
      {tabActiva === 'RESERVAS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-black text-slate-900">
              Historial de Reservas y Transacciones (RF-11)
            </h3>
            <p className="text-xs text-slate-500">
              Registro detallado de transacciones, adelantos recibidos y saldos por cobrar en cancha.
            </p>
          </div>

          {reservasSede.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay reservas registradas en esta sede todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Cancha</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Monto Total</th>
                    <th className="p-3">Abonado (50%/100%)</th>
                    <th className="p-3">Saldo en Cancha</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reservasSede.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">{res.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{res.clienteNombre}</span>
                        <span className="text-[11px] text-slate-500">{res.clienteTelefono}</span>
                      </td>
                      <td className="p-3 font-bold text-emerald-800">{res.canchaNombre}</td>
                      <td className="p-3 font-mono">
                        {res.fecha} <br />
                        <span className="text-slate-500 font-bold">{res.horaInicio} - {res.horaFin}</span>
                      </td>
                      <td className="p-3 font-mono font-bold">S/. {res.precioTotal}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        S/. {res.montoPagado} ({res.tipoPagoModalidad === 'ADELANTO_50' ? '50%' : '100%'})
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">
                        {res.saldoPendiente > 0 ? `S/. ${res.saldoPendiente}` : 'Saldado'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          res.estado === 'CONFIRMADA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : res.estado === 'CANCELADA'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {res.estado === 'PENDIENTE_PAGO' ? 'Pendiente Aprobación' : res.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. PESTAÑA: VERIFICACIÓN CON EL ADMINISTRADOR & CHECK OFICIAL */}
      {tabActiva === 'VERIFICACION_ANTIFRAUDE' && (
        <div className="space-y-6">
          {/* Header Explicativo */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 flex-shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900">
                      🛡️ Verificación Oficial de Complejo & Check del Administrador
                    </h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Confianza Garantizada
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Para que los jugadores confíen plenamente en tu cancha y abonen sus reservas con <strong>adelanto del 50% o 100%</strong>, el <strong>Administrador de la página web</strong> revisa tu complejo, coordina contigo por <strong>WhatsApp o Correo</strong> y te otorga el <strong>Check Verificado Oficial</strong> visible en toda la web.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-xs ${
                  sedeSeleccionada?.esVerificada
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : sedeSeleccionada?.estadoVerificacion === 'OBSERVADO'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {sedeSeleccionada?.esVerificada ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>✓ Check Verificado Activo</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span>{sedeSeleccionada?.estadoVerificacion === 'OBSERVADO' ? 'Observado por Administrador' : 'Pendiente de Verificación'}</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Tarjeta de Estado Actual de la Sede */}
            <div className="mt-5">
              {sedeSeleccionada?.esVerificada ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md flex-shrink-0">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-black text-base text-emerald-950 flex items-center gap-2 flex-wrap">
                          <span>✓ Complejo Deportivo con Check Verificado Oficial</span>
                          <span className="font-mono text-xs bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-md font-bold shadow-xs">
                            {sedeSeleccionada.selloSeguridad || 'PUKLLAY-CHECK-ADMIN'}
                          </span>
                        </h4>
                        <p className="text-xs text-emerald-800 mt-1">
                          Tu sede cuenta con la insignia de confianza oficial de la plataforma otorgada por el Administrador. Los jugadores pueden reservar tus canchas con total seguridad y realizar pagos de adelanto con comprobante.
                        </p>
                      </div>

                      {/* Datos Validados */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Complejo Deportivo:</span>
                          <span className="font-bold text-slate-800 text-sm block truncate">
                            {sedeSeleccionada.nombre}
                          </span>
                          <span className="text-[10px] text-slate-600 block truncate mt-0.5">
                            {sedeSeleccionada.ubicacion.distrito} • {sedeSeleccionada.ubicacion.direccion}
                          </span>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Titular Billetera / Cobros:</span>
                          <span className="font-bold text-slate-800 text-sm block truncate">
                            {sedeSeleccionada.documentoVerificacion?.titularYape || usuarioActual.nombre}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            ✓ Registrado ante el Administrador
                          </span>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Auditado por:</span>
                          <span className="font-bold text-slate-800 text-sm block truncate">
                            {sedeSeleccionada.documentoVerificacion?.verificadoPor || 'Administrador General'}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Estado: Aprobado ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md flex-shrink-0">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-amber-950">
                        {sedeSeleccionada?.estadoVerificacion === 'OBSERVADO'
                          ? '⛔ Expediente Observado por el Administrador'
                          : '⏳ Complejo Deportivo en Proceso de Verificación'}
                      </h4>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        {sedeSeleccionada?.estadoVerificacion === 'OBSERVADO'
                          ? `Observación: ${sedeSeleccionada.documentoVerificacion?.motivoObservacion || 'Por favor contáctanos por WhatsApp para coordinar la verificación.'}`
                          : 'Para otorgarte el Check Verificado en la página, el Administrador necesita confirmar tus datos de contacto y la ubicación de tus canchas. Puedes escribirle directamente por WhatsApp o enviar el formulario abajo.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TARJETA DESTACADA: CONTACTO DIRECTO CON EL ADMINISTRADOR */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 rounded-3xl p-6 text-white border border-emerald-500/30 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Contacto Directo con el Administrador de la Web</span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-white">
                  ¿Quieres tu Check Verificado más rápido? Habla directamente con nosotros
                </h4>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  El Administrador de la web ({datosAdmin.email}) está disponible para atenderte, revisar fotos de tu césped o resolver dudas de tu cuenta por <strong>WhatsApp o Correo</strong>.
                </p>
                <div className="flex items-center gap-4 pt-1 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <strong>Correo:</strong> {datosAdmin.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <strong>WhatsApp:</strong> +51 {datosAdmin.telefono}
                  </span>
                </div>
              </div>

              {/* Botones de Contacto Inmediato */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 flex-shrink-0">
                <a
                  href={`https://wa.me/51${datosAdmin.telefono}?text=${encodeURIComponent(`Hola Administrador de Pukllay Sport, soy ${usuarioActual.nombre}, propietario del complejo "${sedeSeleccionada?.nombre || 'deportivo'}". Te escribo por WhatsApp para coordinar la verificación oficial y obtener el Check Verificado en la página.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-slate-950" />
                  <span>Escribir por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>

                <a
                  href={`mailto:${datosAdmin.email}?subject=${encodeURIComponent(`Pukllay Sport - Verificación de Complejo: ${sedeSeleccionada?.nombre || usuarioActual.nombre}`)}&body=${encodeURIComponent(`Hola Administrador de Pukllay Sport,\n\nSoy ${usuarioActual.nombre}, dueño del complejo "${sedeSeleccionada?.nombre || ''}".\nMi celular es ${usuarioActual.telefono}.\n\nMe pongo en contacto para coordinar la verificación oficial de mi sede para obtener el Check Verificado.\n\nSaludos cordiales.`)}`}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Enviar Correo</span>
                </a>
              </div>
            </div>
          </div>

          {/* Formulario de Solicitud de Verificación */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Formulario de Solicitud de Check Verificado Oficial</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Fácil y Directo
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Completa tus datos de contacto para que el Administrador reciba una notificación inmediata en su panel y pueda comunicarse contigo para otorgarte el Check Verificado.
              </p>
            </div>

            <form onSubmit={handleEnviarVerificacion} className="space-y-5 text-xs">
              
              {/* DATOS DE CONTACTO */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Datos de Contacto del Complejo Deportivo</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nombre del Propietario o Encargado:
                    </label>
                    <input
                      type="text"
                      value={verifTitularYape}
                      onChange={(e) => setVerifTitularYape(e.target.value)}
                      placeholder="Ej. Roberto Silva"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Celular / WhatsApp para que el Admin te contacte:
                    </label>
                    <input
                      type="tel"
                      maxLength={9}
                      value={verifNumeroYape}
                      onChange={(e) => setVerifNumeroYape(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 987654321"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Correo Electrónico de Contacto:
                    </label>
                    <input
                      type="email"
                      value={usuarioActual.email}
                      disabled
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-medium text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Complejo Deportivo Seleccionado:
                    </label>
                    <div className="px-3.5 py-2.5 bg-slate-200/80 rounded-xl font-bold text-slate-800 truncate">
                      {sedeSeleccionada?.nombre} ({sedeSeleccionada?.ubicacion.distrito})
                    </div>
                  </div>
                </div>
              </div>

              {/* DATOS DE COBRO PARA ADELANTOS */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Datos de Cobro para Adelantos (Yape / Plin)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Razón Social o Nombre de Fantasía (Opcional):
                    </label>
                    <input
                      type="text"
                      value={verifRazonSocial}
                      onChange={(e) => setVerifRazonSocial(e.target.value)}
                      placeholder="Ej. GRASS SINTETICO LA BOMBONERA"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      RUC o DNI (Informativo, Opcional):
                    </label>
                    <input
                      type="text"
                      value={verifRuc}
                      onChange={(e) => setVerifRuc(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 20601849201 o DNI"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* FOTOS O COMPROBANTES DE LA CANCHA */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Foto del Grass / Fachada (Para que el Admin inspeccione)</span>
                </h5>

                <div>
                  <input
                    type="file"
                    id="docVerifFileInput"
                    accept="image/*"
                    onChange={handleSubirDocVerif}
                    className="hidden"
                  />
                  <label
                    htmlFor="docVerifFileInput"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-emerald-400 hover:border-emerald-600 text-emerald-800 rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{cargandoDocVerif ? 'Procesando foto...' : verifDocUrl ? '✓ Foto cargada (Clic para cambiar)' : 'Subir foto del césped o complejo desde tu dispositivo'}</span>
                  </label>
                </div>

                {verifDocUrl && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-300">
                    <img
                      src={verifDocUrl}
                      alt="Cancha o documento"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-xs"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">Foto o comprobante adjunto para el Administrador</p>
                      <p className="text-[11px] text-emerald-700 font-medium">Lista para que el Administrador la revise.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Enviar Solicitud al Administrador</span>
                </button>

                <button
                  type="button"
                  onClick={handleSolicitarYContactarAdminWhatsApp}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar y Abrir WhatsApp con el Administrador</span>
                </button>
              </div>
            </form>
          </div>

          {/* MÓDULO PARA ADMINISTRADOR: AUDITORÍA Y OTORGAMIENTO DE CHECK */}
          {usuarioActual.rol === 'ADMINISTRADOR' && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h4 className="font-black text-base text-white">
                      Centro de Control y Otorgamiento de Check Verificado (Exclusivo Administrador)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Supervisa los complejos registrados, contacta por WhatsApp o Correo y otorga el Check Verificado con 1 clic.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800 font-bold">
                  Total Sedes: {service.obtenerSedes().length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Sede</th>
                      <th className="p-3">Ubicación</th>
                      <th className="p-3">Contacto / Teléfono</th>
                      <th className="p-3">Acciones de Contacto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Check Verificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {service.obtenerSedes().map((s) => {
                      const telLimpio = (s.documentoVerificacion?.numeroYape || s.telefonoContacto).replace(/\D/g, '');
                      const prop = service.obtenerTodosUsuarios().find(u => u.id === s.propietarioId);
                      const emailProp = s.documentoVerificacion?.contactoEmail || prop?.email || '';

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <strong className="text-white block">{s.nombre}</strong>
                            <span className="text-[10px] text-slate-400">ID: {s.id}</span>
                          </td>
                          <td className="p-3 text-slate-300">
                            {s.ubicacion.distrito}
                            <span className="block text-[10px] text-slate-500 truncate max-w-[150px]">
                              {s.ubicacion.direccion}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-200 block truncate max-w-[140px] font-bold">
                              {s.documentoVerificacion?.nombreContacto || s.documentoVerificacion?.titularYape || prop?.nombre || 'Propietario'}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400">
                              +51 {telLimpio}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`https://wa.me/51${telLimpio}?text=${encodeURIComponent(`Hola ${s.documentoVerificacion?.nombreContacto || prop?.nombre || ''}, te saluda el Administrador de Pukllay Sport respecto a tu complejo "${s.nombre}". Deseo coordinar contigo para otorgarte el Check Verificado en la web.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs"
                                title="Contactar por WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>

                              {emailProp && (
                                <a
                                  href={`mailto:${emailProp}?subject=${encodeURIComponent(`Pukllay Sport - Verificación de Complejo: ${s.nombre}`)}&body=${encodeURIComponent(`Hola,\n\nTe saluda la Administración de Pukllay Sport respecto a tu complejo "${s.nombre}".\n\nQuedamos atentos a tu confirmación.`)}`}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] flex items-center gap-1 border border-slate-700"
                                  title="Enviar correo"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Correo</span>
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              s.esVerificada
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : s.estadoVerificacion === 'OBSERVADO'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {s.estadoVerificacion}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!s.esVerificada ? (
                                <button
                                  type="button"
                                  onClick={() => handleAprobarSedeAdmin(s.id)}
                                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-black text-[11px] shadow-sm cursor-pointer"
                                >
                                  ✓ Otorgar Check
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                                  ✓ Verificado
                                </span>
                              )}

                              {sedeAObservarId === s.id ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={motivoObsAdmin}
                                    onChange={(e) => setMotivoObsAdmin(e.target.value)}
                                    placeholder="Motivo..."
                                    className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleObservarSedeAdmin(s.id)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                                  >
                                    Enviar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSedeAObservarId(null)}
                                    className="text-slate-400 hover:text-white text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSedeAObservarId(s.id);
                                    setMotivoObsAdmin('Coordinar por WhatsApp fotos del predio o césped');
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] cursor-pointer"
                                >
                                  Observar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 9. CONTROL MAESTRO Y DOMINIO TOTAL (SUPER-ADMINISTRADOR) */}
      {tabActiva === 'CONTROL_ADMIN' && esAdmin && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Superior del Super-Admin */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-purple-800/40 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Crown className="w-3.5 h-3.5" /> SUPER-ADMINISTRADOR
                  </span>
                  <span className="text-xs text-purple-300 font-mono">
                    {usuarioActual.email}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Centro de Dominio y Control Maestro
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Tienes el control absoluto de toda la plataforma Pukllay Sport: usuarios, complejos deportivos, canchas, reservas a nivel nacional y configuración global.
                </p>
              </div>

              {/* Botones de acción del Super-Admin */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSubtabAdmin('DASHBOARD_KPI')}
                  className={`px-4 py-3 font-black rounded-2xl shadow-lg transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 ${
                    subtabAdmin === 'DASHBOARD_KPI'
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white ring-2 ring-cyan-300'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                  }`}
                  title="Ver Dashboard de Métricas y KPIs con Gráficos Recharts"
                >
                  <BarChart3 className="w-4 h-4 text-cyan-200" />
                  <span>📊 Dashboard KPIs (Recharts)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarModalReporteFormal(true)}
                  className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                  title="Generar Reporte Formal Auditable del Sistema con Reservas, Pagos, Atenciones y Seguridad"
                >
                  <FileText className="w-4 h-4" />
                  <span>📄 Generar Reporte Formal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaSede(true)}
                  className="px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl shadow-lg transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Registrar Complejo Deportivo</span>
                </button>
              </div>
            </div>

            {/* 4 Métricas Clave de la Plataforma */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-purple-900/60 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-purple-900/40">
                <span className="text-slate-400 font-bold block text-[11px]">Usuarios Registrados</span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">
                  {service.obtenerTodosUsuarios().length}
                </span>
                <span className="text-[10px] text-purple-300">
                  {service.obtenerTodosUsuarios().filter(u => u.rol === 'PROPIETARIO').length} dueños • {service.obtenerTodosUsuarios().filter(u => u.rol === 'CLIENTE').length} clientes
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-2xl border border-purple-900/40">
                <span className="text-slate-400 font-bold block text-[11px]">Complejos de Grass</span>
                <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">
                  {service.obtenerSedes().length}
                </span>
                <span className="text-[10px] text-emerald-400">
                  {service.obtenerSedes().filter(s => s.esVerificada).length} con Check Oficial ✓
                </span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-2xl border border-purple-900/40">
                <span className="text-slate-400 font-bold block text-[11px]">Canchas Activas</span>
                <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {service.obtenerSedes().reduce((acc, s) => acc + s.canchas.length, 0)}
                </span>
                <span className="text-[10px] text-slate-400">En todo el país</span>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-2xl border border-purple-900/40">
                <span className="text-slate-400 font-bold block text-[11px]">Reservas Totales</span>
                <span className="text-xl font-black text-lime-400 font-mono mt-0.5 block">
                  {service.obtenerTodasReservas().length}
                </span>
                <span className="text-[10px] text-slate-400">Historial completo</span>
              </div>
            </div>
          </div>

          {/* Subnavegación de Módulos Admin */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
            <button
              onClick={() => setSubtabAdmin('DASHBOARD_KPI')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                subtabAdmin === 'DASHBOARD_KPI'
                  ? 'bg-gradient-to-r from-indigo-700 to-cyan-700 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>📊 Métricas & KPIs (Recharts)</span>
              <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 text-[10px] font-black rounded-full">
                BI
              </span>
            </button>

            <button
              onClick={() => setSubtabAdmin('USUARIOS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                subtabAdmin === 'USUARIOS'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>👥 Gestión de Usuarios ({service.obtenerTodosUsuarios().length})</span>
            </button>

            <button
              onClick={() => setSubtabAdmin('SEDES_CANCHAS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                subtabAdmin === 'SEDES_CANCHAS'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>🏟️ Complejos & Canchas ({service.obtenerSedes().length})</span>
            </button>

            <button
              onClick={() => setSubtabAdmin('RESERVAS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                subtabAdmin === 'RESERVAS'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>📅 Reservas Globales ({service.obtenerTodasReservas().length})</span>
            </button>

            <button
              onClick={() => setSubtabAdmin('CONFIGURACION')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                subtabAdmin === 'CONFIGURACION'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>⚙️ Configuración & Respaldos</span>
            </button>
          </div>

          {/* SUBTAB 0: DASHBOARD DE MÉTRICAS Y KPIS CON RECHARTS */}
          {subtabAdmin === 'DASHBOARD_KPI' && (
            <DashboardKPIAdmin
              onVerReservas={() => setSubtabAdmin('RESERVAS')}
              onVerSedes={() => setSubtabAdmin('SEDES_CANCHAS')}
            />
          )}

          {/* SUBTAB 1: GESTIÓN DE USUARIOS */}
          {subtabAdmin === 'USUARIOS' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              
              {/* Acceso a la Ventana de Usuarios con Contraseñas, Edición y Creación */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <div>
                  <h4 className="text-sm font-black text-purple-950 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-700" />
                    Directorio y Control de Usuarios con Contraseñas
                  </h4>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Abre la ventana interactiva para ver Nombres, Correos, Teléfonos, Contraseñas completas, Crear nuevos usuarios o Editarlos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalUsuariosDirectorio(true)}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 flex-shrink-0 transition-all active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>Abrir Ventana de Usuarios</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filtro por rol */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['TODOS', 'PROPIETARIO', 'CLIENTE', 'ADMINISTRADOR'] as const).map(rol => (
                    <button
                      key={rol}
                      onClick={() => setFiltroRolAdmin(rol)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        filtroRolAdmin === rol
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {rol === 'TODOS' ? 'Todos' : rol === 'PROPIETARIO' ? '🏟️ Propietarios' : rol === 'CLIENTE' ? '⚽ Clientes' : '👑 Administrador'}
                    </button>
                  ))}
                </div>

                {/* Búsqueda */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaUsuarioAdmin}
                    onChange={(e) => setBusquedaUsuarioAdmin(e.target.value)}
                    placeholder="Buscar por nombre, correo o celular..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lista de Usuarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {service.obtenerTodosUsuarios()
                  .filter(u => {
                    if (filtroRolAdmin !== 'TODOS' && u.rol !== filtroRolAdmin) return false;
                    if (busquedaUsuarioAdmin.trim()) {
                      const q = busquedaUsuarioAdmin.toLowerCase();
                      return u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.telefono.includes(q);
                    }
                    return true;
                  })
                  .map(u => {
                    const telLimpio = u.telefono.replace(/\D/g, '');
                    const sedesPropCount = service.obtenerSedes().filter(s => s.propietarioId === u.id).length;

                    return (
                      <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-200 transition-all flex flex-col justify-between gap-3 shadow-xs">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatarUrl}
                                alt={u.nombre}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs leading-tight">{u.nombre}</h4>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                                  u.rol === 'ADMINISTRADOR'
                                    ? 'bg-purple-100 text-purple-800'
                                    : u.rol === 'PROPIETARIO'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {u.rol}
                                </span>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              u.verificado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.verificado ? '✓ Activa' : '✕ Inactiva'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 space-y-1 mt-3">
                            <p className="truncate">📧 {u.email}</p>
                            <p className="font-mono font-bold text-slate-800">📱 +51 {telLimpio}</p>
                            <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200 mt-1">
                              <span className="font-mono text-[11px] font-bold text-slate-800 truncate select-all" title="Contraseña registrada">
                                🔑 {u.passwordHash}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.passwordHash);
                                  mostrarAlerta(`Contraseña de ${u.nombre} copiada al portapapeles.`);
                                }}
                                className="text-[10px] text-purple-700 font-bold hover:underline ml-1 flex-shrink-0 cursor-pointer"
                              >
                                Copiar
                              </button>
                            </div>
                            {u.rol === 'PROPIETARIO' && (
                              <p className="text-[10px] font-bold text-purple-700">🏟️ {sedesPropCount} complejos registrados</p>
                            )}
                          </div>
                        </div>

                        {/* Botones de acción admin */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[11px]">
                          <a
                            href={`https://wa.me/51${telLimpio}?text=${encodeURIComponent(`Hola ${u.nombre}, te saluda el Administrador de Pukllay Sport.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMostrarModalUsuariosDirectorio(true)}
                              className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold cursor-pointer"
                              title="Editar usuario en la ventana completa"
                            >
                              Editar
                            </button>

                            {u.rol !== 'ADMINISTRADOR' && (
                              <button
                                type="button"
                                onClick={() => {
                                  service.toggleEstadoUsuario(u.id, true);
                                  mostrarAlerta(`Estado de cuenta de ${u.nombre} actualizado.`);
                                }}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold cursor-pointer"
                                title="Activar o desactivar cuenta"
                              >
                                {u.verificado ? 'Desactivar' : 'Activar'}
                              </button>
                            )}

                            {u.rol !== 'ADMINISTRADOR' && (
                              confirmarEliminarUsuarioId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      service.eliminarUsuario(u.id, true);
                                      setConfirmarEliminarUsuarioId(null);
                                      mostrarAlerta(`Cuenta de ${u.nombre} eliminada.`);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmarEliminarUsuarioId(null)}
                                    className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmarEliminarUsuarioId(u.id)}
                                  className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                                  title="Eliminar cuenta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUBTAB 2: GESTIÓN GLOBAL DE SEDES Y CANCHAS */}
          {subtabAdmin === 'SEDES_CANCHAS' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Todos los Complejos Deportivos a Nivel Nacional ({service.obtenerSedes().length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otorga el Check Oficial de confianza, edita cualquier complejo o elimina canchas y sedes fraudulentas.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaSedeAdmin}
                    onChange={(e) => setBusquedaSedeAdmin(e.target.value)}
                    placeholder="Buscar por complejo o distrito..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid de Sedes */}
              <div className="space-y-4">
                {service.obtenerSedes()
                  .filter(s => {
                    if (busquedaSedeAdmin.trim()) {
                      const q = busquedaSedeAdmin.toLowerCase();
                      return s.nombre.toLowerCase().includes(q) || s.ubicacion.distrito.toLowerCase().includes(q) || s.ubicacion.direccion.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map(s => {
                    const prop = service.obtenerTodosUsuarios().find(u => u.id === s.propietarioId);
                    const telLimpio = (s.documentoVerificacion?.numeroYape || s.telefonoContacto).replace(/\D/g, '');

                    return (
                      <div key={s.id} className="p-5 rounded-3xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-purple-300 transition-all space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-black text-slate-900 text-base">{s.nombre}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                s.esVerificada
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}>
                                {s.esVerificada ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-amber-600" />}
                                <span>{s.esVerificada ? 'Check Verificado Oficial' : 'Pendiente Verificación'}</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              📍 {s.ubicacion.direccion}, {s.ubicacion.distrito} ({s.ubicacion.ciudad}) • 📞 +51 {telLimpio}
                            </p>
                            <p className="text-[11px] text-purple-700 font-bold mt-0.5">
                              Dueño: {prop?.nombre || 'Propietario'} ({prop?.email})
                            </p>
                          </div>

                          {/* Acciones principales de la Sede */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`https://wa.me/51${telLimpio}?text=${encodeURIComponent(`Hola ${prop?.nombre || ''}, te saluda el Administrador de Pukllay Sport respecto a tu complejo "${s.nombre}".`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp Dueño</span>
                            </a>

                            {/* Botón Otorgar / Revocar Check */}
                            <button
                              type="button"
                              onClick={() => {
                                if (s.esVerificada) {
                                  (s as any)._esVerificada = false;
                                  (s as any)._estadoVerificacion = 'PENDIENTE';
                                  service.guardarDatos();
                                  (service as any).notificar();
                                  mostrarAlerta(`Check oficial revocado para ${s.nombre}.`);
                                } else {
                                  service.aprobarVerificacionSede(s.id, usuarioActual.nombre, 'Aprobado y verificado por Administrador General');
                                  mostrarAlerta(`¡Check Oficial otorgado a ${s.nombre}!`);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                s.esVerificada
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-sm'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{s.esVerificada ? 'Revocar Check' : '✓ Otorgar Check Oficial'}</span>
                            </button>

                            {/* Botón Eliminar Complejo */}
                            <button
                              type="button"
                              onClick={() => setSedeAEliminar({ id: s.id, nombre: s.nombre })}
                              className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl cursor-pointer"
                              title="Eliminar este complejo de la plataforma"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Canchas dentro de este complejo */}
                        <div className="pt-3 border-t border-slate-200">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                            ⚽ Canchas ({s.canchas.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {s.canchas.map(c => (
                              <div key={c.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-slate-900 block truncate max-w-[170px]">{c.nombre}</strong>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    S/. {c.precioBaseHora}/hr • {c.deporte}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCanchaAEliminar({ id: c.id, nombre: c.nombre })}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Eliminar cancha"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUBTAB 3: RESERVAS GLOBALES DE TODA LA PLATAFORMA */}
          {subtabAdmin === 'RESERVAS' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filtro de estado */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['TODAS', 'CONFIRMADA', 'PENDIENTE_PAGO', 'CANCELADA', 'EXPIRADA'] as const).map(est => (
                    <button
                      key={est}
                      onClick={() => setFiltroReservaAdmin(est)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        filtroReservaAdmin === est
                          ? 'bg-purple-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaReservaAdmin}
                    onChange={(e) => setBusquedaReservaAdmin(e.target.value)}
                    placeholder="Buscar por cliente, cancha o código..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tabla de Reservas */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Sede & Cancha</th>
                      <th className="p-3">Fecha & Turno</th>
                      <th className="p-3">Monto & Adelanto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Acciones Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {service.obtenerTodasReservas()
                      .filter(r => {
                        if (filtroReservaAdmin !== 'TODAS' && r.estado !== filtroReservaAdmin) return false;
                        if (busquedaReservaAdmin.trim()) {
                          const q = busquedaReservaAdmin.toLowerCase();
                          return r.clienteNombre.toLowerCase().includes(q) || r.clienteTelefono.includes(q) || r.id.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map(r => {
                        const telLimpio = r.clienteTelefono.replace(/\D/g, '');

                        return (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-purple-700 text-[11px]">
                              {r.id.slice(-8)}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{r.clienteNombre}</span>
                              <a
                                href={`https://wa.me/51${telLimpio}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-600 font-mono hover:underline flex items-center gap-0.5"
                              >
                                <MessageSquare className="w-2.5 h-2.5" /> +51 {telLimpio}
                              </a>
                            </td>
                            <td className="p-3 text-slate-700">
                              <span className="font-bold text-slate-900 block">{r.canchaNombre}</span>
                              <span className="text-[10px] text-slate-500">{r.sedeNombre}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-800">
                              {r.fecha}
                              <span className="block text-[10px] font-bold text-purple-700">
                                {r.horaInicio} - {r.horaFin}
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="font-bold text-slate-900 block">S/. {r.precioTotal}</span>
                              <span className="text-[10px] text-emerald-700">Adelanto: S/. {r.montoPagado}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                r.estado === 'CONFIRMADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.estado === 'PENDIENTE_PAGO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {r.estado}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {r.transacciones.find(t => t.comprobanteUrl)?.comprobanteUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setComprobanteAmpliadoUrl(r.transacciones.find(t => t.comprobanteUrl)?.comprobanteUrl || null)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Ver Voucher
                                  </button>
                                )}

                                {r.estado !== 'CONFIRMADA' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      service.aprobarPagoYConfirmarReserva(r.id, 'Confirmación forzada por Administrador General');
                                      mostrarAlerta('Reserva confirmada oficialmente.');
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    ✓ Confirmar
                                  </button>
                                )}

                                {r.estado !== 'CANCELADA' && (
                                  confirmarCancelarReservaId === r.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          service.cancelarReserva(r.id, 'Cancelada por Administrador General');
                                          setConfirmarCancelarReservaId(null);
                                          mostrarAlerta('Reserva cancelada y turno liberado.');
                                        }}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmarCancelarReservaId(null)}
                                        className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmarCancelarReservaId(r.id)}
                                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      ✕ Cancelar
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 4: CONFIGURACIÓN GLOBAL Y RESPALDOS */}
          {subtabAdmin === 'CONFIGURACION' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Configuración del Sistema y Datos Maestros
                </h3>
                <p className="text-xs text-slate-500">
                  Configura los canales oficiales de contacto y descarga copias de respaldo de la base de datos completa.
                </p>
              </div>

              {/* Perfil del Administrador Oficial */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Credenciales y Contacto Oficial del Administrador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Nombre Oficial:</span>
                    <strong className="text-slate-900 font-bold">{usuarioActual.nombre}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Correo Maestro:</span>
                    <strong className="text-purple-700 font-mono font-bold">{usuarioActual.email}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Celular de Soporte / WhatsApp:</span>
                    <strong className="text-emerald-700 font-mono font-bold">+51 {usuarioActual.telefono}</strong>
                  </div>
                </div>
              </div>

              {/* Anuncio Global de la Plataforma */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <h4 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Anuncio / Comunicado Global para la Página</span>
                </h4>
                <input
                  type="text"
                  value={anuncioAdminGlobal}
                  onChange={(e) => setAnuncioAdminGlobal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-900"
                />
                <button
                  type="button"
                  onClick={() => mostrarAlerta('Anuncio guardado y desplegado para toda la plataforma.')}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Guardar y Publicar Anuncio
                </button>
              </div>

              {/* Descarga de Copia de Seguridad JSON */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    Copia de Seguridad y Exportación JSON de la Base de Datos
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Descarga un archivo JSON estructurado con todos los usuarios, sedes, canchas y reservas persistentes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const dataBackup = {
                      fecha: new Date().toISOString(),
                      usuarios: service.obtenerTodosUsuarios().map(u => u.toJSON()),
                      sedes: service.obtenerSedes().map(s => s.toJSON()),
                      reservas: service.obtenerTodasReservas().map(r => r.toJSON()),
                    };
                    const blob = new Blob([JSON.stringify(dataBackup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pukllay_sport_backup_${Date.now()}.json`;
                    a.click();
                    mostrarAlerta('Copia de seguridad descargada exitosamente.');
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm flex-shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Descargar Copia JSON</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODALES DE CONFIRMACIÓN PARA ELIMINAR CANCHAS Y COMPLEJOS */}
      {canchaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 text-base text-center">¿Eliminar esta cancha?</h4>
            <p className="text-xs text-slate-600 text-center mt-1 mb-4">
              Estás a punto de eliminar permanentemente la cancha <strong>"{canchaAEliminar.nombre}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCanchaAEliminar(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEliminarCancha(canchaAEliminar.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {sedeAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 text-base text-center">¿Eliminar complejo deportivo?</h4>
            <p className="text-xs text-slate-600 text-center mt-1 mb-4">
              Estás a punto de eliminar el complejo <strong>"{sedeAEliminar.nombre}"</strong> y todas las canchas que contiene. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSedeAEliminar(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEliminarSede(sedeAEliminar.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
              >
                Sí, Eliminar Complejo
              </button>
            </div>
          </div>
        </div>
      )}
      {comprobanteAmpliadoUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setComprobanteAmpliadoUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl relative border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-sm">Comprobante de Pago Subido por el Cliente</h4>
              </div>
              <button
                onClick={() => setComprobanteAmpliadoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800">
              <img
                src={comprobanteAmpliadoUrl}
                alt="Comprobante en detalle"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Verifica el monto transferido y el código de operación bancario.
              </p>
              <button
                type="button"
                onClick={() => setComprobanteAmpliadoUrl(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA RECHAZAR PAGO (SIN USAR WINDOW.PROMPT / ALERT) */}
      {reservaARechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Rechazar Pago de Reserva</span>
              </div>
              <button
                type="button"
                onClick={() => setReservaARechazar(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              ¿Deseas rechazar el comprobante de <strong>{reservaARechazar.clienteNombre}</strong> para <strong>{reservaARechazar.canchaNombre}</strong> el {reservaARechazar.fecha} ({reservaARechazar.hora})? El horario quedará liberado automáticamente para nuevos clientes.
            </p>

            <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Monto indicado:</span>
                <strong className="text-rose-900 font-mono font-bold">S/. {reservaARechazar.monto} ({reservaARechazar.tipoPago})</strong>
              </div>
            </div>

            <div className="mb-4 text-xs">
              <label className="block font-bold text-slate-700 mb-1.5">
                Motivo del rechazo:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  'Comprobante no válido o ilegible',
                  'Fondos no recibidos en cuenta',
                  'Monto transferido es insuficiente',
                  'Mantenimiento de grass de urgencia'
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMotivoRechazo(opt)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                      motivoRechazo === opt
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Escribe el motivo del rechazo..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 text-xs pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReservaARechazar(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRechazoPago}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL: REGISTRAR NUEVO COMPLEJO / SEDE DE GRASS */}
      {mostrarModalNuevaSede && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Registrar Nuevo Complejo Deportivo & Grass
                </h3>
                <p className="text-[11px] text-slate-500">
                  Crea tu local deportivo con su ubicación real fijada por GPS o en el mapa para que aparezca en el explorador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalNuevaSede(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearNuevaSede} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Complejo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Grass Sintético La Bombonera Sur"
                    value={nuevaSedeNombre}
                    onChange={(e) => setNuevaSedeNombre(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono de Reservas / Contacto:</label>
                  <input
                    type="tel"
                    required
                    placeholder="999 888 777"
                    value={nuevaSedeTel}
                    onChange={(e) => setNuevaSedeTel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción del Complejo:</label>
                <textarea
                  rows={2}
                  placeholder="Canchas de grass sintético con iluminación LED, vestuarios y estacionamiento..."
                  value={nuevaSedeDesc}
                  onChange={(e) => setNuevaSedeDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              {/* Datos de la primera Cancha del complejo */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                <span className="text-xs font-black text-emerald-900 block">
                  ⚽ Primera Cancha de Grass del Complejo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Nombre de la Cancha:</label>
                    <input
                      type="text"
                      required
                      value={nuevaSedePrimeraCanchaNombre}
                      onChange={(e) => setNuevaSedePrimeraCanchaNombre(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Precio / Hora (S/.):</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      required
                      value={nuevaSedePrecio}
                      onChange={(e) => setNuevaSedePrecio(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border rounded-xl bg-white font-bold font-mono text-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deporte:</label>
                    <select
                      value={nuevaSedeDeporte}
                      onChange={(e) => setNuevaSedeDeporte(e.target.value as DeporteTipo)}
                      className="w-full px-3 py-1.5 border rounded-xl bg-white font-semibold"
                    >
                      <option value="FUTBOL_7">Fútbol 7</option>
                      <option value="FUTBOL_6">Fútbol 6</option>
                      <option value="FUTBOL_5">Fútbol 5</option>
                      <option value="FUTSAL">Futsal</option>
                      <option value="VOLEY">Vóley</option>
                      <option value="PADEL">Pádel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Superficie:</label>
                    <select
                      value={nuevaSedeSuperficie}
                      onChange={(e) => setNuevaSedeSuperficie(e.target.value as SuperficieTipo)}
                      className="w-full px-3 py-1.5 border rounded-xl bg-white font-semibold"
                    >
                      <option value="GRASS_PREMIUM_CAUCHO">Grass Premium + Caucho</option>
                      <option value="GRASS_MONOFILAMENTO">Grass Monofilamento</option>
                      <option value="GRASS_FIBRILADO">Grass Fibrilado</option>
                      <option value="LOSA_DEPORTIVA">Losa Deportiva</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: UBICACIÓN REAL (GPS + MARCADO EN MAPA) */}
              <div className="pt-2 border-t">
                <SelectorUbicacionGrass
                  ubicacionInicial={sedeSeleccionada?.ubicacion}
                  onChangeUbicacion={(nuevaUbi) => {
                    setNuevaSedeUbicacion(nuevaUbi);
                  }}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaSede(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Complejo Deportivo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL: EDITAR SEDE Y UBICACIÓN */}
      {mostrarModalEditarSede && sedeSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Editar Datos del Complejo y Ubicación
                </h3>
                <p className="text-[11px] text-slate-500">
                  Actualiza el nombre, teléfono y la posición geográfica exacta con GPS o en el mapa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalEditarSede(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionSede} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Complejo:</label>
                  <input
                    type="text"
                    required
                    value={editSedeNombre}
                    onChange={(e) => setEditSedeNombre(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono de Contacto:</label>
                  <input
                    type="tel"
                    required
                    value={editSedeTel}
                    onChange={(e) => setEditSedeTel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción del Local:</label>
                <textarea
                  rows={2}
                  value={editSedeDesc}
                  onChange={(e) => setEditSedeDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              {/* SECCIÓN: UBICACIÓN REAL (GPS + MARCADO EN MAPA) */}
              <div className="pt-2 border-t">
                <SelectorUbicacionGrass
                  ubicacionInicial={editSedeUbicacion || sedeSeleccionada.ubicacion}
                  onChangeUbicacion={(nuevaUbi) => {
                    setEditSedeUbicacion(nuevaUbi);
                  }}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalEditarSede(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                >
                  Guardar Datos & Ubicación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL: REGISTRAR NUEVA CANCHA */}
      {mostrarModalNuevaCancha && sedeSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Registrar Nueva Cancha de Grass en "{sedeSeleccionada.nombre}"
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define los datos deportivos, tarifas, fotos y la ubicación real con GPS o marcador en Google Maps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalNuevaCancha(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCancha} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Cancha:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cancha 3: El Monumental (Fútbol 7)"
                  value={nombreNuevaCancha}
                  onChange={(e) => setNombreNuevaCancha(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deporte:</label>
                  <select
                    value={deporteNuevaCancha}
                    onChange={(e) => setDeporteNuevaCancha(e.target.value as DeporteTipo)}
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                  >
                    <option value="FUTBOL_7">Fútbol 7</option>
                    <option value="FUTBOL_6">Fútbol 6</option>
                    <option value="FUTBOL_5">Fútbol 5</option>
                    <option value="FUTSAL">Futsal</option>
                    <option value="PADEL">Pádel</option>
                    <option value="VOLEY">Vóley</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Superficie:</label>
                  <select
                    value={superficieNuevaCancha}
                    onChange={(e) => setSuperficieNuevaCancha(e.target.value as SuperficieTipo)}
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                  >
                    <option value="GRASS_PREMIUM_CAUCHO">Grass Premium + Caucho</option>
                    <option value="GRASS_MONOFILAMENTO">Grass Monofilamento</option>
                    <option value="GRASS_FIBRILADO">Grass Fibrilado</option>
                    <option value="LOSA_DEPORTIVA">Losa Deportiva</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio / Hora (S/.):</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    required
                    value={precioNuevaCancha}
                    onChange={(e) => setPrecioNuevaCancha(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-bold font-mono text-emerald-700 bg-emerald-50/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dimensiones:</label>
                  <input
                    type="text"
                    value={dimensionesNuevaCancha}
                    onChange={(e) => setDimensionesNuevaCancha(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                    placeholder="Ej. 28m x 45m"
                  />
                </div>
              </div>

              {/* Carga de Foto para Nueva Cancha Directa desde Dispositivo */}
              <div className="p-3 bg-slate-50 border rounded-2xl space-y-2">
                <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Foto del Grass Sintético:
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Cargar desde Dispositivo</span>
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border flex-shrink-0">
                    {fotoUrlNuevaCancha ? (
                      <img src={fotoUrlNuevaCancha} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      id="fotoNuevaCanchaFileInput"
                      accept="image/*"
                      onChange={handleSubirFotoNueva}
                      className="hidden"
                    />
                    <label
                      htmlFor="fotoNuevaCanchaFileInput"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{cargandoFotoNueva ? 'Procesando...' : 'Subir foto del celular / PC'}</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Sube una foto tomada en la cancha o selecciona de tu galería.
                    </p>
                  </div>
                </div>

                <input
                  type="url"
                  value={fotoUrlNuevaCancha}
                  onChange={(e) => setFotoUrlNuevaCancha(e.target.value)}
                  placeholder="O escribe una URL directa https://..."
                  className="w-full px-3 py-1.5 border rounded-xl font-mono text-[11px] bg-white text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="techadaCheck"
                  checked={techadaNuevaCancha}
                  onChange={(e) => setTechadaNuevaCancha(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="techadaCheck" className="font-bold text-slate-700 cursor-pointer">
                  ¿Es cancha techada (protección contra lluvia / sol)?
                </label>
              </div>

              {/* SECCIÓN: UBICACIÓN REAL DEL GRASS CON OPCIÓN GPS Y OPCIÓN MARCADO EN MAPA */}
              <div className="pt-3 border-t border-slate-200">
                <SelectorUbicacionGrass
                  ubicacionInicial={sedeSeleccionada.ubicacion}
                  onChangeUbicacion={(nuevaUbi) => {
                    setUbicacionGrassNueva(nuevaUbi);
                  }}
                  compacto={true}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaCancha(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                >
                  Guardar Cancha con Ubicación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENTANA DE DIRECTORIO Y GESTIÓN DE USUARIOS (SOLO ADMINISTRADOR) */}
      {esAdmin && (
        <VentanaUsuariosRegistrados
          isOpen={mostrarModalUsuariosDirectorio}
          onClose={() => setMostrarModalUsuariosDirectorio(false)}
          usuarioActual={usuarioActual}
        />
      )}

      {/* REPORTE FORMAL DEL SISTEMA (SOLO ADMINISTRADOR) */}
      {esAdmin && (
        <ModalReporteFormalAdmin
          isOpen={mostrarModalReporteFormal}
          onClose={() => setMostrarModalReporteFormal(false)}
          usuarioActual={usuarioActual}
        />
      )}

    </div>
  );
};
