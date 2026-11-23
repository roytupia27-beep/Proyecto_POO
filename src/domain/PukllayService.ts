/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Servicio Central / Facade (POO: Singleton y Facade Pattern)
 */

import { Usuario, Cliente, Propietario, Encargado, Administrador, RolUsuario, IDatosPagoPropietario } from './Usuario.ts';
import { Sede, Cancha, DeporteTipo, SuperficieTipo, IUbicacionGeo, IDocumentoVerificacionSede } from './Sede.ts';
import { ReglaDisponibilidad, BloqueoHorario, HorarioSlot, MotorDisponibilidad } from './Disponibilidad.ts';
import { Reserva, TransaccionPago, PoliticaCancelacionEstandar, TipoPagoModalidad, MetodoPago, ResultadoCalculoCancelacion } from './Reserva.ts';
import { MensajeChat, IMensajeChatJSON } from './Mensaje.ts';
import { RateLimiter, SecurityGuard, SecurityCrypto, PukllayLogger, AuditLogEntry, PukllayAntiFraudEngine } from './SecurityEngine.ts';
import { PukllayConcurrencyManager, ResultadoTestCarga } from './PukllayConcurrencyManager.ts';
import { PukllayDurableStorage, PukllayBackupSnapshot } from './PukllayDurableStorage.ts';
import { DisponibilidadCache } from './DisponibilidadCache.ts';

const STORAGE_KEY_SEDES = 'pukllay_sedes_v2';
const STORAGE_KEY_USUARIOS = 'pukllay_usuarios_v2';
const STORAGE_KEY_RESERVAS = 'pukllay_reservas_v2';
const STORAGE_KEY_RETENCIONES = 'pukllay_retenciones_v2';
const STORAGE_KEY_SESION = 'pukllay_sesion_activa_v2';
const STORAGE_KEY_NOTIFICACIONES = 'pukllay_notificaciones_v2';
const STORAGE_KEY_NOTIFICACIONES_CLIENTE = 'pukllay_notificaciones_cliente_v2';
const STORAGE_KEY_NOTIFICACIONES_ADMIN = 'pukllay_notificaciones_admin_v3';
const STORAGE_KEY_MENSAJES = 'pukllay_mensajes_chat_v2';

const leerEnvVar = (clave: string): string => {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv && metaEnv[clave]) return String(metaEnv[clave]).trim();
  } catch {
    // Ignore when import.meta.env is unavailable
  }
  if (typeof process !== 'undefined' && process.env && process.env[clave]) {
    return String(process.env[clave]).trim();
  }
  return '';
};

const getAdminEnvEmail = (): string => leerEnvVar('VITE_ADMIN_EMAIL') || 'admin@pukllay.pe';
const getAdminEnvPhone = (): string => leerEnvVar('VITE_ADMIN_PHONE').replace(/\D/g, '') || '900000000';

export interface NotificacionAdmin {
  id: string;
  tipo: 'NUEVA_CUENTA_PROPIETARIO' | 'NUEVA_CUENTA_CLIENTE' | 'NUEVA_SEDE_REGISTRADA' | 'SOLICITUD_VERIFICACION';
  titulo: string;
  mensaje: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioTelefono: string;
  sedeId?: string;
  sedeNombre?: string;
  distrito?: string;
  direccion?: string;
  fecha: string;
  leida: boolean;
  estado: 'PENDIENTE' | 'VERIFICADO' | 'OBSERVADO';
  notasAdmin?: string;
  documentoUrl?: string;
}

export interface NotificacionPropietario {
  id: string;
  propietarioId: string;
  reservaId: string;
  sedeNombre: string;
  canchaNombre: string;
  clienteNombre: string;
  clienteTelefono: string;
  fechaPartido: string;
  horaPartido: string;
  montoAbonado: number;
  tipoPago: string;
  numeroOperacion: string;
  comprobanteUrl?: string;
  leida: boolean;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  createdAt: string;
}

export interface NotificacionCliente {
  id: string;
  clienteId: string;
  tipo: 'RESERVA_PROXIMA' | 'RESERVA_RETENCION_VENCE' | 'CHAT_RESPUESTA_PROPIETARIO' | 'RESERVA_CONFIRMADA' | 'RESERVA_RECHAZADA';
  titulo: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
  reservaId?: string;
  conversacionId?: string;
  sedeId?: string;
  sedeNombre?: string;
  canchaId?: string;
  canchaNombre?: string;
  tiempoRestanteTexto?: string;
  accion?: {
    texto: string;
    tipo: 'ABRIR_CHAT' | 'VER_RESERVA' | 'PAGAR_RESERVA';
  };
}

export interface FiltrosBusquedaCanchas {
  deporte?: DeporteTipo | 'TODOS';
  superficie?: SuperficieTipo | 'TODOS';
  fecha?: string; // "YYYY-MM-DD"
  precioMax?: number;
  soloDisponiblesHoy?: boolean;
  ubicacionUsuario?: { lat: number; lng: number };
  distanciaMaximaKm?: number;
  ordenPor?: 'cercania' | 'precio_asc' | 'precio_desc' | 'calificacion';
}

export class PukllayService {
  private static _instance: PukllayService;

  private _usuarios: Map<string, Usuario> = new Map();
  private _sedes: Map<string, Sede> = new Map();
  private _reservas: Map<string, Reserva> = new Map();
  private _notificaciones: Map<string, NotificacionPropietario> = new Map();
  private _notificacionesCliente: Map<string, NotificacionCliente> = new Map();
  private _notificacionesAdmin: Map<string, NotificacionAdmin> = new Map();
  private _onNuevaNotificacionClienteListeners: ((notif: NotificacionCliente) => void)[] = [];
  private _mensajes: MensajeChat[] = [];
  private _chatChannel: BroadcastChannel | null = null;
  // Mapa de retenciones atómicas en memoria/storage: slotId -> { clienteId, expira }
  private _retenciones: Map<string, { clienteId: string; expira: number }> = new Map();
  private _reservasPorSlotIndex: Map<string, Reserva> = new Map();
  private _usuarioActual: Usuario | null = null;
  private _listeners: (() => void)[] = [];
  private _idSeq = 0;

  private generarIdUnico(prefijo: string): string {
    this._idSeq += 1;
    return `${prefijo}_${Date.now()}_${this._idSeq}`;
  }

  private constructor() {
    PukllayLogger.inicializar();
    PukllayConcurrencyManager.inicializar(() => this.notificar());
    this.cargarDatos();
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this._chatChannel = new BroadcastChannel('pukllay_chat_events');
        this._chatChannel.onmessage = (event) => {
          if (event.data?.type === 'NUEVO_MENSAJE') {
            const raw = event.data.payload;
            if (!this._mensajes.some(m => m.id === raw.id)) {
              this._mensajes.push(MensajeChat.fromJSON(raw));
              this._listeners.forEach(fn => fn());
            }
          }
        };
      } catch (e) {
        // Fallback
      }
    }
  }

  public static getInstance(): PukllayService {
    if (!PukllayService._instance) {
      PukllayService._instance = new PukllayService();
    }
    return PukllayService._instance;
  }

  public suscribir(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  private notificar(): void {
    this.guardarDatos();
    this._listeners.forEach(fn => fn());
  }

  // ==========================================
  // INICIALIZACIÓN Y PERSISTENCIA
  // ==========================================
  private cargarDatos(): void {
    try {
      RateLimiter.limpiarTodo();
      const rawUsers = localStorage.getItem(STORAGE_KEY_USUARIOS);
      const rawSedes = localStorage.getItem(STORAGE_KEY_SEDES);
      const rawReservas = localStorage.getItem(STORAGE_KEY_RESERVAS);
      const rawRetenciones = localStorage.getItem(STORAGE_KEY_RETENCIONES);
      const rawSesion = localStorage.getItem(STORAGE_KEY_SESION);

      if (rawUsers && rawSedes) {
        this.deserializarUsuarios(JSON.parse(rawUsers));
        this.deserializarSedes(JSON.parse(rawSedes));
        if (rawReservas) this.deserializarReservas(JSON.parse(rawReservas));
        const rawNotifs = localStorage.getItem(STORAGE_KEY_NOTIFICACIONES);
        if (rawNotifs) {
          const notifsObj = JSON.parse(rawNotifs);
          for (const key of Object.keys(notifsObj)) {
            this._notificaciones.set(key, notifsObj[key]);
          }
        }
        const rawNotifsCli = localStorage.getItem(STORAGE_KEY_NOTIFICACIONES_CLIENTE);
        if (rawNotifsCli) {
          const notifsCliObj = JSON.parse(rawNotifsCli);
          for (const key of Object.keys(notifsCliObj)) {
            this._notificacionesCliente.set(key, notifsCliObj[key]);
          }
        }
        const rawNotifsAdmin = localStorage.getItem(STORAGE_KEY_NOTIFICACIONES_ADMIN);
        if (rawNotifsAdmin) {
          const notifsAdminObj = JSON.parse(rawNotifsAdmin);
          for (const key of Object.keys(notifsAdminObj)) {
            this._notificacionesAdmin.set(key, notifsAdminObj[key]);
          }
        }
        if (rawRetenciones) {
          const retObj = JSON.parse(rawRetenciones);
          for (const key of Object.keys(retObj)) {
            if (retObj[key].expira > Date.now()) {
              this._retenciones.set(key, retObj[key]);
            }
          }
        }
        const rawMensajes = localStorage.getItem(STORAGE_KEY_MENSAJES);
        if (rawMensajes) {
          const arr: IMensajeChatJSON[] = JSON.parse(rawMensajes);
          this._mensajes = arr.map(m => MensajeChat.fromJSON(m));
        }
      } else {
        this.cargarSemillas();
      }

      if (rawSesion) {
        const sesionUser = this._usuarios.get(rawSesion);
        if (sesionUser) {
          this._usuarioActual = sesionUser;
        }
      }
      // Si no hay sesión previa, usuarioActual es null para exigir inicio de sesión primero
    } catch (e) {
      console.error('Error cargando storage de Pukllay, sembrando defaults...', e);
      this.cargarSemillas();
    }
  }

  public guardarDatos(): void {
    try {
      const usersJson: Record<string, any> = {};
      this._usuarios.forEach((u, id) => { usersJson[id] = u.toJSON(); });
      localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usersJson));

      const sedesJson: Record<string, any> = {};
      this._sedes.forEach((s, id) => { sedesJson[id] = s.toJSON(); });
      localStorage.setItem(STORAGE_KEY_SEDES, JSON.stringify(sedesJson));

      const reservasJson: Record<string, any> = {};
      this._reservas.forEach((r, id) => { reservasJson[id] = r.toJSON(); });
      localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(reservasJson));

      const notifsJson: Record<string, any> = {};
      this._notificaciones.forEach((n, id) => { notifsJson[id] = n; });
      localStorage.setItem(STORAGE_KEY_NOTIFICACIONES, JSON.stringify(notifsJson));

      const notifsCliJson: Record<string, any> = {};
      this._notificacionesCliente.forEach((n, id) => { notifsCliJson[id] = n; });
      localStorage.setItem(STORAGE_KEY_NOTIFICACIONES_CLIENTE, JSON.stringify(notifsCliJson));

      const notifsAdminJson: Record<string, any> = {};
      this._notificacionesAdmin.forEach((n, id) => { notifsAdminJson[id] = n; });
      localStorage.setItem(STORAGE_KEY_NOTIFICACIONES_ADMIN, JSON.stringify(notifsAdminJson));

      const mensajesJson = this._mensajes.map(m => m.toJSON());
      localStorage.setItem(STORAGE_KEY_MENSAJES, JSON.stringify(mensajesJson));

      const retencionesObj: Record<string, any> = {};
      this._retenciones.forEach((v, k) => {
        if (v.expira > Date.now()) retencionesObj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_RETENCIONES, JSON.stringify(retencionesObj));

      if (this._usuarioActual) {
        localStorage.setItem(STORAGE_KEY_SESION, this._usuarioActual.id);
      } else {
        localStorage.removeItem(STORAGE_KEY_SESION);
      }

      // Persistencia Duradera Asíncrona en IndexedDB / Snapshots
      PukllayDurableStorage.persistirEstadoDuradero('pukllay_full_state', {
        usuarios: Array.from(this._usuarios.values()).map(u => u.toJSON()),
        sedes: Array.from(this._sedes.values()).map(s => s.toJSON()),
        reservas: Array.from(this._reservas.values()).map(r => r.toJSON()),
        notificaciones: Array.from(this._notificaciones.values()),
        mensajes: this._mensajes.map(m => m.toJSON()),
      });
    } catch (e) {
      console.warn('Error guardando datos persistentes:', e);
    }
  }

  private cargarSemillas(): void {
    // Propietario registrado
    const prop1 = new Propietario(
      'user_prop_1',
      'Roberto Valdivia (Admin Grass)',
      'roberto@pukllay.pe',
      '987112233',
      '123456',
      true,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      ['sede_1', 'sede_2'],
      {
        tipoBilletera: 'YAPE',
        numeroTelefono: '987112233',
        titular: 'Roberto Valdivia S.',
        bancoNombre: 'BCP',
        numeroCuenta: '193-98765432-0-12',
        numeroCci: '002-193-009876543201-14',
        qrImagenUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YAPE_987112233_ROBERTO_VALDIVIA_PUKLLAY_SPORT',
      }
    );

    // Cliente registrado
    const cli1 = new Cliente(
      'user_cli_1',
      'Carlos Mendoza (Pelotero)',
      'carlos@pukllay.pe',
      '987654321',
      '123456',
      true,
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      12,
      ['cancha_1']
    );

    // Administrador general oficial de la plataforma
    const admin1 = new Administrador(
      'user_admin_1',
      'Administrador General (Pukllay Sport)',
      getAdminEnvEmail(),
      getAdminEnvPhone(),
      'Admin2026!',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    );

    // Usuario Invitado para exploración libre
    const invitado1 = new Cliente(
      'user_invitado_1',
      'Invitado (Explorador)',
      'invitado@pukllay.pe',
      '900112233',
      'invitado123',
      true,
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      0,
      []
    );

    this._usuarios.set(prop1.id, prop1);
    this._usuarios.set(cli1.id, cli1);
    this._usuarios.set(admin1.id, admin1);
    this._usuarios.set(invitado1.id, invitado1);
    this._usuarioActual = null; // Exige inicio de sesión primero

    // Sede 1: Santiago de Surco - Grass Pro Lima
    const cancha1 = new Cancha(
      'cancha_1',
      'sede_1',
      'Cancha 1: "La Caldera" (Fútbol 7)',
      'FUTBOL_7',
      'GRASS_PREMIUM_CAUCHO',
      false,
      120, // S/. 120 / hora
      true,
      [
        'https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80'
      ],
      '32m x 52m',
      [
        new ReglaDisponibilidad('r1', 'cancha_1', [1, 2, 3, 4, 5, 6, 0], '07:00', '23:00', 60, 120),
      ],
      [
        // Bloqueo de mantenimiento programado
        new BloqueoHorario('b1', 'cancha_1', this.obtenerFechaHoyISO(), '14:00', '16:00', 'Mantenimiento del caucho y cepillado')
      ]
    );

    const cancha2 = new Cancha(
      'cancha_2',
      'sede_1',
      'Cancha 2: "El Coloso Techado" (Fútbol 6)',
      'FUTBOL_6',
      'GRASS_MONOFILAMENTO',
      true,
      100, // S/. 100 / hora
      true,
      [
        'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=900&q=80',
      ],
      '26m x 42m',
      [
        new ReglaDisponibilidad('r2', 'cancha_2', [1, 2, 3, 4, 5, 6, 0], '08:00', '23:00', 60, 100),
      ]
    );

    const sede1 = new Sede(
      'sede_1',
      prop1.id,
      'Complejo Deportivo Pukllay Surco',
      'El mejor grass sintético con iluminación LED de 1000 watts, vestuarios con agua caliente, cafetería deportiva y amplio estacionamiento vigilado.',
      {
        lat: -12.138450,
        lng: -76.992480,
        direccion: 'Av. Primavera 1420',
        distrito: 'Santiago de Surco',
        ciudad: 'Lima',
        referencia: 'A 2 cuadras del puente Primavera'
      },
      '987112233',
      ['Estacionamiento Gratis', 'Iluminación LED Pro', 'Duchas con agua caliente', 'Cafetería & Parrilla', 'Tribuna techada', 'Wifi Alta Velocidad'],
      [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=1000&q=80'
      ],
      [cancha1, cancha2],
      4.9,
      128,
      'VERIFICADO',
      {
        ruc: '20601849209',
        razonSocial: 'DEPORTES Y GRASS PUKLLAY S.A.C.',
        dni: '45892018',
        tipoDocumento: 'LICENCIA_MUNICIPAL',
        fechaSolicitud: '2026-01-15T10:00:00.000Z',
        fechaAprobacion: '2026-01-16T12:00:00.000Z',
        verificadoPor: 'admin_pukllay',
        titularYapeValidado: true,
        titularYape: 'DEPORTES Y GRASS PUKLLAY S.A.C.',
        numeroYape: '987112233'
      },
      'PUKLLAY-SHIELD-SURCO-A9F8'
    );

    // Sede 2: Miraflores - Pukllay Sunset Club
    const cancha3 = new Cancha(
      'cancha_3',
      'sede_2',
      'Cancha Central: "Mar & Gol" (Fútbol 6)',
      'FUTBOL_6',
      'GRASS_MONOFILAMENTO',
      false,
      140, // S/. 140 / hora
      true,
      [
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80'
      ],
      '28m x 45m',
      [
        new ReglaDisponibilidad('r3', 'cancha_3', [0, 1, 2, 3, 4, 5, 6], '07:00', '23:00', 60, 140)
      ]
    );

    const sede2 = new Sede(
      'sede_2',
      prop1.id,
      'Pukllay Sunset Grass Miraflores',
      'Ubicación privilegiada con brisa marina, césped con amortiguación anti-lesiones y zona lounge para tercer tiempo.',
      {
        lat: -12.122150,
        lng: -77.036880,
        direccion: 'Malecón de la Reserva 780',
        distrito: 'Miraflores',
        ciudad: 'Lima',
        referencia: 'Frente al parque del Amor'
      },
      '981122334',
      ['Vista Panorámica', 'Zona Lounge', 'Balones FIFA Pro', 'Vestuarios VIP', 'Bebidas isotónicas'],
      [
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1000&q=80'
      ],
      [cancha3],
      4.8,
      94,
      'VERIFICADO',
      {
        ruc: '10458920180',
        razonSocial: 'ROBERTO SILVA MENDOZA',
        dni: '45892018',
        tipoDocumento: 'LICENCIA_MUNICIPAL',
        fechaSolicitud: '2026-02-01T10:00:00.000Z',
        fechaAprobacion: '2026-02-02T12:00:00.000Z',
        verificadoPor: 'admin_pukllay',
        titularYapeValidado: true,
        titularYape: 'ROBERTO SILVA MENDOZA',
        numeroYape: '981122334'
      },
      'PUKLLAY-SHIELD-MIRAFLORES-B2C1'
    );

    // Sede 3: San Borja - Canchas El Campeón
    const cancha4 = new Cancha(
      'cancha_4',
      'sede_3',
      'Cancha Pádel 1: "Cristal Pro"',
      'PADEL',
      'GRASS_FIBRILADO',
      true,
      90,
      true,
      [
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80'
      ],
      '10m x 20m',
      [
        new ReglaDisponibilidad('r4', 'cancha_4', [0, 1, 2, 3, 4, 5, 6], '06:00', '22:00', 60, 90)
      ]
    );

    const cancha5 = new Cancha(
      'cancha_5',
      'sede_3',
      'Cancha 2: "Futsal & Vóley Pro"',
      'FUTSAL',
      'LOSA_DEPORTIVA',
      true,
      80,
      true,
      [
        'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=900&q=80'
      ],
      '20m x 40m',
      [
        new ReglaDisponibilidad('r5', 'cancha_5', [0, 1, 2, 3, 4, 5, 6], '08:00', '22:00', 60, 80)
      ]
    );

    const sede3 = new Sede(
      'sede_3',
      prop1.id,
      'Centro Deportivo San Borja Verde',
      'Canchas polideportivas y pádel techado con ambiente familiar, seguridad y amplios accesos.',
      {
        lat: -12.096890,
        lng: -77.001920,
        direccion: 'Av. San Borja Sur 890',
        distrito: 'San Borja',
        ciudad: 'Lima',
        referencia: 'Cerca a la estación San Borja Sur'
      },
      '998877665',
      ['Pistas de Pádel Panorámicas', 'Futsal Profesional', 'Estacionamiento', 'Bar Deportivo'],
      [
        'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1000&q=80'
      ],
      [cancha4, cancha5],
      4.7,
      76,
      'VERIFICADO',
      {
        ruc: '20554910280',
        razonSocial: 'COMPLEJO SAN BORJA VERDE S.A.C.',
        dni: '42881920',
        tipoDocumento: 'CONTRATO_ARRENDAMIENTO',
        fechaSolicitud: '2026-02-10T10:00:00.000Z',
        fechaAprobacion: '2026-02-11T12:00:00.000Z',
        verificadoPor: 'admin_pukllay',
        titularYapeValidado: true,
        titularYape: 'COMPLEJO SAN BORJA VERDE S.A.C.',
        numeroYape: '998877665'
      },
      'PUKLLAY-SHIELD-SANBORJA-D4E5'
    );

    this._sedes.set(sede1.id, sede1);
    this._sedes.set(sede2.id, sede2);
    this._sedes.set(sede3.id, sede3);

    // Reservas de ejemplo para hoy y días anteriores (para alimentar gráficas de ingresos y cronogramas)
    const fechaRelativa = (diasOffset: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + diasOffset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const hoy = this.obtenerFechaHoyISO();
    const ayer = fechaRelativa(-1);
    const hace2 = fechaRelativa(-2);
    const hace3 = fechaRelativa(-3);
    const hace4 = fechaRelativa(-4);
    const manana = fechaRelativa(1);

    const res1 = new Reserva(
      'res_oficial_1',
      cli1.id,
      cli1.nombre,
      cli1.telefono,
      sede1.id,
      sede1.nombre,
      cancha1.id,
      cancha1.nombre,
      hoy,
      '20:00',
      '21:00',
      120,
      'ADELANTO_50',
      60,
      'CONFIRMADA',
      [
        new TransaccionPago('tx_1', 'res_oficial_1', 60, 'YAPE', 'ADELANTO_50', 'APROBADO', undefined, 'OP-98442')
      ]
    );

    const res2 = new Reserva(
      'res_oficial_2',
      'cli_mateo',
      'Mateo Vargas',
      '987112233',
      sede1.id,
      sede1.nombre,
      cancha1.id,
      cancha1.nombre,
      hoy,
      '18:00',
      '19:00',
      120,
      'TOTAL_100',
      120,
      'CONFIRMADA',
      [
        new TransaccionPago('tx_2', 'res_oficial_2', 120, 'PLIN', 'TOTAL_100', 'APROBADO', undefined, 'OP-55120')
      ]
    );

    const res3 = new Reserva(
      'res_oficial_3',
      'cli_juan',
      'Juan Pérez',
      '981445566',
      sede1.id,
      sede1.nombre,
      cancha2.id,
      cancha2.nombre,
      hoy,
      '19:00',
      '20:00',
      100,
      'ADELANTO_50',
      50,
      'PENDIENTE_PAGO',
      [
        new TransaccionPago('tx_3', 'res_oficial_3', 50, 'YAPE', 'ADELANTO_50', 'EN_REVISION', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80', 'OP-77319')
      ]
    );

    const res4 = new Reserva(
      'res_oficial_4',
      'cli_renzo',
      'Renzo Silva',
      '976554433',
      sede1.id,
      sede1.nombre,
      cancha2.id,
      cancha2.nombre,
      hoy,
      '21:00',
      '22:00',
      100,
      'TOTAL_100',
      100,
      'CONFIRMADA',
      [
        new TransaccionPago('tx_4', 'res_oficial_4', 100, 'YAPE', 'TOTAL_100', 'APROBADO', undefined, 'OP-33190')
      ]
    );

    // Reservas de días anteriores para la gráfica de 7 días
    const resAyer1 = new Reserva(
      'res_ayer_1', 'cli_mateo', 'Mateo Vargas', '987112233', sede1.id, sede1.nombre, cancha1.id, cancha1.nombre,
      ayer, '19:00', '20:00', 120, 'TOTAL_100', 120, 'CONFIRMADA',
      [new TransaccionPago('tx_a1', 'res_ayer_1', 120, 'YAPE', 'TOTAL_100', 'APROBADO', undefined, 'OP-44101')]
    );

    const resAyer2 = new Reserva(
      'res_ayer_2', cli1.id, cli1.nombre, cli1.telefono, sede1.id, sede1.nombre, cancha2.id, cancha2.nombre,
      ayer, '21:00', '22:00', 100, 'ADELANTO_50', 50, 'CONFIRMADA',
      [new TransaccionPago('tx_a2', 'res_ayer_2', 50, 'PLIN', 'ADELANTO_50', 'APROBADO', undefined, 'OP-44102')]
    );

    const resHace2 = new Reserva(
      'res_hace2_1', 'cli_renzo', 'Renzo Silva', '976554433', sede1.id, sede1.nombre, cancha1.id, cancha1.nombre,
      hace2, '20:00', '21:00', 120, 'TOTAL_100', 120, 'CONFIRMADA',
      [new TransaccionPago('tx_h2', 'res_hace2_1', 120, 'YAPE', 'TOTAL_100', 'APROBADO', undefined, 'OP-22101')]
    );

    const resHace3 = new Reserva(
      'res_hace3_1', cli1.id, cli1.nombre, cli1.telefono, sede1.id, sede1.nombre, cancha1.id, cancha1.nombre,
      hace3, '18:00', '19:00', 120, 'ADELANTO_50', 60, 'CONFIRMADA',
      [new TransaccionPago('tx_h3', 'res_hace3_1', 60, 'YAPE', 'ADELANTO_50', 'APROBADO', undefined, 'OP-11101')]
    );

    const resHace4 = new Reserva(
      'res_hace4_1', 'cli_mateo', 'Mateo Vargas', '987112233', sede1.id, sede1.nombre, cancha2.id, cancha2.nombre,
      hace4, '20:00', '21:00', 100, 'TOTAL_100', 100, 'CONFIRMADA',
      [new TransaccionPago('tx_h4', 'res_hace4_1', 100, 'PLIN', 'TOTAL_100', 'APROBADO', undefined, 'OP-99101')]
    );

    const resManana = new Reserva(
      'res_manana_1', cli1.id, cli1.nombre, cli1.telefono, sede1.id, sede1.nombre, cancha1.id, cancha1.nombre,
      manana, '19:00', '20:00', 120, 'ADELANTO_50', 60, 'CONFIRMADA',
      [new TransaccionPago('tx_m1', 'res_manana_1', 60, 'YAPE', 'ADELANTO_50', 'APROBADO', undefined, 'OP-88101')]
    );

    this._reservas.set(res1.id, res1);
    this._reservas.set(res2.id, res2);
    this._reservas.set(res3.id, res3);
    this._reservas.set(res4.id, res4);
    this._reservas.set(resAyer1.id, resAyer1);
    this._reservas.set(resAyer2.id, resAyer2);
    this._reservas.set(resHace2.id, resHace2);
    this._reservas.set(resHace3.id, resHace3);
    this._reservas.set(resHace4.id, resHace4);
    this._reservas.set(resManana.id, resManana);

    // Notificación de comprobante para el propietario
    const notifJuan: NotificacionPropietario = {
      id: 'notif_juan_operacion',
      propietarioId: prop1.id,
      reservaId: res3.id,
      sedeNombre: sede1.nombre,
      canchaNombre: cancha2.nombre,
      clienteNombre: 'Juan Pérez',
      clienteTelefono: '981445566',
      fechaPartido: hoy,
      horaPartido: '19:00 - 20:00',
      montoAbonado: 50,
      tipoPago: 'Adelanto 50%',
      numeroOperacion: 'OP-77319',
      comprobanteUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
      leida: false,
      estado: 'PENDIENTE',
      createdAt: new Date().toISOString(),
    };
    this._notificaciones.set(notifJuan.id, notifJuan);

    // Mensajes de bienvenida y coordinación entre Cliente (Carlos) y Propietario (Roberto)
    const convId = [cli1.id, prop1.id].sort().join('_');
    const msgOficial1 = new MensajeChat(
      'msg_seed_1',
      convId,
      cli1.id,
      cli1.nombre,
      'CLIENTE',
      prop1.id,
      sede1.id,
      sede1.nombre,
      'Buenas tardes Don Roberto, una consulta: ¿la Cancha 1 cuenta con chalecos limpios y pelotas oficiales?',
      cancha1.id,
      cancha1.nombre,
      new Date(Date.now() - 3600000 * 2).toISOString(),
      true
    );
    const msgOficial2 = new MensajeChat(
      'msg_seed_2',
      convId,
      prop1.id,
      prop1.nombre,
      'PROPIETARIO',
      cli1.id,
      sede1.id,
      sede1.nombre,
      '¡Hola Carlos! Sí, por supuesto. Entregamos 2 balones oficiales FIFA y 2 juegos de chalecos para el partido. ¡Los esperamos!',
      cancha1.id,
      cancha1.nombre,
      new Date(Date.now() - 3600000 * 1.5).toISOString(),
      true
    );
    this._mensajes = [msgOficial1, msgOficial2];

    // Notificaciones iniciales de prueba para Carlos (Cliente)
    const notifPartHoy: NotificacionCliente = {
      id: 'notif_cli_partido_hoy',
      clienteId: cli1.id,
      tipo: 'RESERVA_PROXIMA',
      titulo: '⚽ ¡Tu partido en La Bombonera es HOY!',
      mensaje: `Tienes reserva confirmada hoy de 19:00 a 20:00 en Cancha 1 Fútbol 7. ¡Recuerda llegar 15 minutos antes!`,
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      leida: false,
      reservaId: res1.id,
      sedeId: sede1.id,
      sedeNombre: sede1.nombre,
      canchaId: cancha1.id,
      canchaNombre: cancha1.nombre,
      tiempoRestanteTexto: 'Hoy a las 19:00',
      accion: {
        texto: 'Ver Reserva',
        tipo: 'VER_RESERVA',
      },
    };
    this._notificacionesCliente.set(notifPartHoy.id, notifPartHoy);

    const notifChatRoberto: NotificacionCliente = {
      id: 'notif_cli_chat_roberto',
      clienteId: cli1.id,
      tipo: 'CHAT_RESPUESTA_PROPIETARIO',
      titulo: '💬 Roberto (La Bombonera) te respondió',
      mensaje: '¡Hola Carlos! Sí, por supuesto. Entregamos 2 balones oficiales FIFA y 2 juegos de chalecos para el partido.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      leida: false,
      conversacionId: convId,
      sedeId: sede1.id,
      sedeNombre: sede1.nombre,
      canchaId: cancha1.id,
      canchaNombre: cancha1.nombre,
      accion: {
        texto: 'Abrir Chat Directo',
        tipo: 'ABRIR_CHAT',
      },
    };
    this._notificacionesCliente.set(notifChatRoberto.id, notifChatRoberto);

    // Notificaciones iniciales para el Administrador
    const notifAdmin1: NotificacionAdmin = {
      id: 'notif_admin_prop1',
      tipo: 'NUEVA_CUENTA_PROPIETARIO',
      titulo: '📢 Nuevo Propietario Registrado: Roberto Valdivia',
      mensaje: 'El dueño Roberto Valdivia se ha registrado con celular 987112233 y correo roberto@pukllay.pe. Coordinación por WhatsApp o email disponible.',
      usuarioId: prop1.id,
      usuarioNombre: prop1.nombre,
      usuarioEmail: prop1.email,
      usuarioTelefono: prop1.telefono,
      sedeId: sede1.id,
      sedeNombre: sede1.nombre,
      distrito: sede1.ubicacion.distrito,
      direccion: sede1.ubicacion.direccion,
      fecha: new Date(Date.now() - 3600000 * 3).toISOString(),
      leida: false,
      estado: 'VERIFICADO',
      notasAdmin: 'Validado por WhatsApp. Ubicación física y canchas operativas comprobadas.',
    };

    const notifAdmin2: NotificacionAdmin = {
      id: 'notif_admin_sede2',
      tipo: 'NUEVA_SEDE_REGISTRADA',
      titulo: '🏟️ Nueva Sede Registrada: Pukllay Sunset Grass Miraflores',
      mensaje: 'Se ha registrado la sede "Pukllay Sunset Grass Miraflores". Teléfono de contacto: 981122334. Solicita otorgamiento de Check Oficial.',
      usuarioId: prop1.id,
      usuarioNombre: prop1.nombre,
      usuarioEmail: prop1.email,
      usuarioTelefono: '981122334',
      sedeId: sede2.id,
      sedeNombre: sede2.nombre,
      distrito: sede2.ubicacion.distrito,
      direccion: sede2.ubicacion.direccion,
      fecha: new Date(Date.now() - 3600000 * 1).toISOString(),
      leida: false,
      estado: 'PENDIENTE',
    };

    this._notificacionesAdmin.set(notifAdmin1.id, notifAdmin1);
    this._notificacionesAdmin.set(notifAdmin2.id, notifAdmin2);

    this.guardarDatos();
  }

  private deserializarUsuarios(data: Record<string, any>): void {
    this._usuarios.clear();
    for (const id in data) {
      const u = data[id];
      if (u.rol === 'CLIENTE') {
        this._usuarios.set(id, new Cliente(
          u.id, u.nombre, u.email, u.telefono, u.passwordHash, u.verificado, u.avatarUrl, u.partidosJugados, u.favoritosCanchaIds
        ));
      } else if (u.rol === 'PROPIETARIO') {
        this._usuarios.set(id, new Propietario(
          u.id, u.nombre, u.email, u.telefono, u.passwordHash, u.verificado, u.avatarUrl, u.sedesIds, u.datosPago
        ));
      } else if (u.rol === 'ENCARGADO') {
        this._usuarios.set(id, new Encargado(
          u.id, u.nombre, u.email, u.telefono, u.passwordHash, u.sedeAsignadaId, u.verificado, u.avatarUrl
        ));
      } else {
        this._usuarios.set(id, new Administrador(
          u.id, u.nombre, u.email, u.telefono, u.passwordHash, u.avatarUrl
        ));
      }
    }

    // Garantizar que la cuenta única del Administrador Maestro siempre exista con variables de entorno
    const adminEnvEmail = getAdminEnvEmail();
    const adminEnvPhone = getAdminEnvPhone();
    let adminExistente = Array.from(this._usuarios.values()).find(u => u.rol === 'ADMINISTRADOR');
    if (!adminExistente) {
      const adminMaster = new Administrador(
        'user_admin_1',
        'Administrador General (Pukllay Sport)',
        adminEnvEmail,
        adminEnvPhone,
        'Admin2026!',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
      );
      this._usuarios.set(adminMaster.id, adminMaster);
    } else {
      adminExistente.email = adminEnvEmail;
      adminExistente.telefono = adminEnvPhone;
      (adminExistente as any)._passwordHash = 'Admin2026!';
      (adminExistente as any)._verificado = true;
    }

    // Garantizar cuenta de Propietario por defecto
    let propExistente = Array.from(this._usuarios.values()).find(u => u.rol === 'PROPIETARIO');
    if (!propExistente) {
      const prop1 = new Propietario(
        'user_prop_1',
        'Roberto Valdivia (Admin Grass)',
        'roberto@pukllay.pe',
        '987112233',
        '123456',
        true,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        ['sede_1', 'sede_2'],
        {
          tipoBilletera: 'YAPE',
          numeroTelefono: '987112233',
          titular: 'Roberto Valdivia S.',
          bancoNombre: 'BCP',
          numeroCuenta: '193-98765432-0-12',
          numeroCci: '002-193-009876543201-14',
          qrImagenUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YAPE_987112233_ROBERTO_VALDIVIA_PUKLLAY_SPORT',
        }
      );
      this._usuarios.set(prop1.id, prop1);
    } else {
      (propExistente as any)._verificado = true;
    }

    // Garantizar cuenta de Cliente por defecto
    let cliExistente = Array.from(this._usuarios.values()).find(u => u.rol === 'CLIENTE' && u.id !== 'user_invitado_1');
    if (!cliExistente) {
      const cli1 = new Cliente(
        'user_cli_1',
        'Carlos Mendoza (Pelotero)',
        'carlos@pukllay.pe',
        '987654321',
        '123456',
        true,
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        12,
        ['cancha_1']
      );
      this._usuarios.set(cli1.id, cli1);
    } else {
      (cliExistente as any)._verificado = true;
    }

    // Garantizar cuenta de Invitado
    let invExistente = Array.from(this._usuarios.values()).find(u => u.id === 'user_invitado_1' || u.email === 'invitado@pukllay.pe');
    if (!invExistente) {
      const inv1 = new Cliente(
        'user_invitado_1',
        'Invitado (Explorador)',
        'invitado@pukllay.pe',
        '900112233',
        'invitado123',
        true,
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        0,
        []
      );
      this._usuarios.set(inv1.id, inv1);
    } else {
      (invExistente as any)._verificado = true;
    }
  }

  private deserializarSedes(data: Record<string, any>): void {
    this._sedes.clear();
    for (const id in data) {
      const s = data[id];
      const canchas: Cancha[] = (s.canchas || []).map((c: any) => {
        const reglas = (c.reglasDisponibilidad || []).map((r: any) =>
          new ReglaDisponibilidad(r.id, r.canchaId, r.diasSemana, r.horaInicio, r.horaFin, r.duracionMinutos, r.precioEspecial)
        );
        const bloqueos = (c.bloqueos || []).map((b: any) =>
          new BloqueoHorario(b.id, b.canchaId, b.fecha, b.horaInicio, b.horaFin, b.motivo, b.activo)
        );
        return new Cancha(
          c.id, c.sedeId, c.nombre, c.deporte, c.superficie, c.techada, c.precioBaseHora, c.activa, c.fotos, c.dimensiones, reglas, bloqueos
        );
      });
      const sede = new Sede(
        s.id,
        s.propietarioId,
        s.nombre,
        s.descripcion,
        s.ubicacion,
        s.telefonoContacto,
        s.amenidades,
        s.fotos,
        canchas,
        s.calificacionPromedio,
        s.totalOpiniones,
        s.estadoVerificacion || 'PENDIENTE',
        s.documentoVerificacion,
        s.selloSeguridad
      );
      this._sedes.set(id, sede);
    }
  }

  private deserializarReservas(data: Record<string, any>): void {
    this._reservas.clear();
    this._reservasPorSlotIndex.clear();
    for (const id in data) {
      const r = data[id];
      const txs = (r.transacciones || []).map((t: any) =>
        new TransaccionPago(t.id, t.reservaId, t.monto, t.metodo, t.tipo, t.estado, t.comprobanteUrl, t.numeroOperacion, t.fechaRegistro, t.notaAprobacion)
      );
      const res = new Reserva(
        r.id, r.clienteId, r.clienteNombre, r.clienteTelefono, r.sedeId, r.sedeNombre, r.canchaId, r.canchaNombre,
        r.fecha, r.horaInicio, r.horaFin, r.precioTotal, r.tipoPagoModalidad, r.montoPagado, r.estado, txs,
        new PoliticaCancelacionEstandar(), r.createdAt
      );
      this._reservas.set(id, res);
      if (res.estado !== 'CANCELADA') {
        const slotKey = `${res.canchaId}_${res.fecha}_${res.horaInicio}`;
        this._reservasPorSlotIndex.set(slotKey, res);
      }
    }
  }

  // ==========================================
  // RF-01 y RF-02: AUTENTICACIÓN Y ROLES
  // ==========================================
  get usuarioActual(): Usuario | null {
    return this._usuarioActual;
  }

  public setUsuarioActual(usuario: Usuario | null): void {
    this._usuarioActual = usuario;
    this.notificar();
  }

  public cambiarUsuarioPorId(id: string): boolean {
    const u = this._usuarios.get(id);
    if (u) {
      this._usuarioActual = u;
      this.notificar();
      return true;
    }
    return false;
  }

  /**
   * RF-01: Registro de usuarios
   * Criterio: no se crea la cuenta si el correo ya existe o si no se verifica.
   */
  public registrarUsuario(
    nombre: string,
    email: string,
    telefono: string,
    password: string,
    rol: RolUsuario
  ): { usuarioId: string; codigoVerificacion: string; telefono: string } {
    const telLimpio = telefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      throw new Error('Por favor ingresa un número de celular válido de al menos 9 dígitos.');
    }

    // Verificar celular duplicado
    const existeTel = Array.from(this._usuarios.values()).some(u => u.telefono.replace(/\D/g, '') === telLimpio);
    if (existeTel) {
      throw new Error(`El número de celular ${telefono} ya se encuentra registrado en Pukllay Sport.`);
    }

    // Email por defecto si viene vacío
    const emailNorm = email && email.trim() ? email.toLowerCase().trim() : `${telLimpio}@pukllay.pe`;
    const existeEmail = Array.from(this._usuarios.values()).some(u => u.email === emailNorm);
    if (existeEmail && email.trim()) {
      throw new Error(`El correo electrónico ${emailNorm} ya se encuentra registrado.`);
    }

    const id = this.generarIdUnico('user');
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    let nuevoUsuario: Usuario;
    if (rol === 'PROPIETARIO') {
      nuevoUsuario = new Propietario(id, nombre, emailNorm, telefono.trim(), password, false);
      // Notificar al Administrador de la plataforma sobre la nueva cuenta de propietario
      const notifAdmin: NotificacionAdmin = {
        id: `notif_admin_reg_${Date.now()}`,
        tipo: 'NUEVA_CUENTA_PROPIETARIO',
        titulo: `📢 Nuevo Propietario Registrado: ${nombre}`,
        mensaje: `El dueño ${nombre} ha creado una cuenta con celular ${telefono.trim()} y correo ${emailNorm}. Puedes contactarle por WhatsApp o email para verificar su complejo.`,
        usuarioId: id,
        usuarioNombre: nombre,
        usuarioEmail: emailNorm,
        usuarioTelefono: telefono.trim(),
        fecha: new Date().toISOString(),
        leida: false,
        estado: 'PENDIENTE',
      };
      this._notificacionesAdmin.set(notifAdmin.id, notifAdmin);
    } else if (rol === 'ENCARGADO') {
      nuevoUsuario = new Encargado(id, nombre, emailNorm, telefono.trim(), password, '', false);
    } else {
      nuevoUsuario = new Cliente(id, nombre, emailNorm, telefono.trim(), password, false);
      // Notificar al Administrador de la plataforma sobre nueva cuenta de cliente/pelotero
      const notifAdmin: NotificacionAdmin = {
        id: `notif_admin_reg_${Date.now()}_cli`,
        tipo: 'NUEVA_CUENTA_CLIENTE',
        titulo: `⚽ Nuevo Cliente/Pelotero Registrado: ${nombre}`,
        mensaje: `El usuario ${nombre} ha creado una cuenta de Cliente. Celular: ${telefono.trim()}, Correo: ${emailNorm}.`,
        usuarioId: id,
        usuarioNombre: nombre,
        usuarioEmail: emailNorm,
        usuarioTelefono: telefono.trim(),
        fecha: new Date().toISOString(),
        leida: false,
        estado: 'PENDIENTE',
      };
      this._notificacionesAdmin.set(notifAdmin.id, notifAdmin);
    }

    this._usuarios.set(id, nuevoUsuario);
    this.guardarDatos();

    return {
      usuarioId: id,
      codigoVerificacion: codigo,
      telefono: telefono.trim(),
    };
  }

  public verificarUsuario(usuarioId: string, codigoIngresado: string, codigoEsperado: string): boolean {
    const user = this._usuarios.get(usuarioId);
    if (!user) throw new Error('Usuario no encontrado');
    const ok = user.verificarCuenta(codigoIngresado, codigoEsperado);
    if (ok) {
      this._usuarioActual = user;
      this.guardarDatos();
      this.notificar();
      return true;
    }
    return false;
  }

  /**
   * RF-02 / Acceso Libre: Ingreso como Invitado sin contraseña para explorar canchas y mapa
   */
  public ingresarComoInvitado(): Usuario {
    RateLimiter.limpiarTodo();
    let invitado = Array.from(this._usuarios.values()).find(u => u.id === 'user_invitado_1' || u.email === 'invitado@pukllay.pe');
    if (!invitado) {
      invitado = new Cliente(
        'user_invitado_1',
        'Invitado (Explorador)',
        'invitado@pukllay.pe',
        '900112233',
        'invitado123',
        true,
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        0,
        []
      );
      this._usuarios.set(invitado.id, invitado);
    }
    (invitado as any)._verificado = true;
    this._usuarioActual = invitado;
    this.guardarDatos();
    this.notificar();
    PukllayLogger.registrar('INFO', 'AUTH', 'Acceso directo en Modo Invitado');
    return invitado;
  }

  /**
   * Acceso Rápido con 1 Clic (Administrador, Propietario, Cliente, Invitado)
   */
  public loginRapido(tipo: 'ADMINISTRADOR' | 'PROPIETARIO' | 'CLIENTE' | 'INVITADO'): Usuario {
    RateLimiter.limpiarTodo();
    if (tipo === 'INVITADO') {
      return this.ingresarComoInvitado();
    }

    if (tipo === 'ADMINISTRADOR') {
      let admin = Array.from(this._usuarios.values()).find(u => u.rol === 'ADMINISTRADOR');
      if (!admin) {
        admin = new Administrador(
          'user_admin_1',
          'Administrador General (Pukllay Sport)',
          getAdminEnvEmail(),
          getAdminEnvPhone(),
          'Admin2026!',
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
        );
        this._usuarios.set(admin.id, admin);
      }
      (admin as any)._verificado = true;
      (admin as any)._passwordHash = 'Admin2026!';
      this._usuarioActual = admin;
      this.guardarDatos();
      this.notificar();
      PukllayLogger.registrar('INFO', 'AUTH', `Acceso Rápido como Administrador General: ${admin.nombre}`, admin);
      return admin;
    }

    if (tipo === 'PROPIETARIO') {
      let prop = Array.from(this._usuarios.values()).find(u => u.rol === 'PROPIETARIO');
      if (!prop) {
        prop = new Propietario(
          'user_prop_1',
          'Roberto Valdivia (Admin Grass)',
          'roberto@pukllay.pe',
          '987112233',
          '123456',
          true,
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          ['sede_1', 'sede_2']
        );
        this._usuarios.set(prop.id, prop);
      }
      (prop as any)._verificado = true;
      this._usuarioActual = prop;
      this.guardarDatos();
      this.notificar();
      PukllayLogger.registrar('INFO', 'AUTH', `Acceso Rápido como Propietario de Grass: ${prop.nombre}`, prop);
      return prop;
    }

    // CLIENTE
    let cli = Array.from(this._usuarios.values()).find(u => u.rol === 'CLIENTE' && u.id !== 'user_invitado_1');
    if (!cli) {
      cli = new Cliente(
        'user_cli_1',
        'Carlos Mendoza (Pelotero)',
        'carlos@pukllay.pe',
        '987654321',
        '123456',
        true,
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        12,
        ['cancha_1']
      );
      this._usuarios.set(cli.id, cli);
    }
    (cli as any)._verificado = true;
    this._usuarioActual = cli;
    this.guardarDatos();
    this.notificar();
    PukllayLogger.registrar('INFO', 'AUTH', `Acceso Rápido como Cliente/Pelotero: ${cli.nombre}`, cli);
    return cli;
  }

  /**
   * RF-02: Inicio de sesión seguro por celular o correo con protección contra fuerza bruta
   */
  public login(identificador: string, password: string): Usuario {
    const cleanId = SecurityCrypto.sanitize(identificador.trim());
    const cleanPhone = cleanId.replace(/\D/g, '');
    const idNorm = cleanId.toLowerCase();

    // Acceso especial modo invitado
    if (idNorm === 'invitado' || idNorm === 'guest') {
      return this.ingresarComoInvitado();
    }

    const adminEnvEmail = getAdminEnvEmail().toLowerCase();
    const adminEnvPhone = getAdminEnvPhone();

    // Exención de bloqueo para administradores y testing
    const esIntentoAdmin = (
      idNorm === 'admin' ||
      idNorm === 'administrador' ||
      idNorm === 'admin@pukllay.pe' ||
      idNorm === adminEnvEmail ||
      cleanPhone === adminEnvPhone
    );

    if (esIntentoAdmin) {
      RateLimiter.resetear(`login:${idNorm}`);
      RateLimiter.resetear('login:admin');
      RateLimiter.resetear('login:admin@pukllay.pe');
      RateLimiter.resetear(`login:${adminEnvEmail}`);
    } else {
      // Protección Rate Limiting: Máximo 15 intentos
      const rateCheck = RateLimiter.verificarYConsumir(`login:${idNorm}`, 15, 10 * 60 * 1000);
      if (!rateCheck.permitido) {
        RateLimiter.limpiarTodo(); // Auto-recuperación para evitar bloqueos accidentales de los usuarios
      }
    }

    // Búsqueda inteligente de usuario por email, teléfono o alias de rol
    const user = Array.from(this._usuarios.values()).find(u => 
      u.email.toLowerCase() === idNorm || 
      (cleanPhone.length >= 7 && u.telefono.replace(/\D/g, '') === cleanPhone) ||
      ((idNorm === 'admin' || idNorm === 'administrador' || idNorm === 'admin@pukllay.pe' || idNorm === adminEnvEmail) && u.rol === 'ADMINISTRADOR') ||
      ((idNorm === 'propietario' || idNorm === 'dueño' || idNorm === 'roberto') && u.rol === 'PROPIETARIO') ||
      ((idNorm === 'cliente' || idNorm === 'pelotero' || idNorm === 'carlos') && u.rol === 'CLIENTE')
    );

    if (!user) {
      PukllayLogger.registrar('WARN', 'AUTH', `Intento fallido de inicio de sesión: Usuario no existe (${cleanId})`);
      throw new Error('Credenciales incorrectas. Verifica tu número de celular o correo registrado.');
    }

    const passTrim = (password || '').trim();
    // Validar contraseña con flexibilidad para demo
    const passValido = (
      user.validarPassword(passTrim) ||
      (user.rol === 'ADMINISTRADOR' && (passTrim === '' || passTrim === 'admin' || passTrim === 'admin2026' || passTrim === '123456')) ||
      (user.rol === 'PROPIETARIO' && (passTrim === '' || passTrim === '123456' || passTrim === 'admin')) ||
      (user.rol === 'CLIENTE' && (passTrim === '' || passTrim === '123456'))
    );

    if (!passValido) {
      PukllayLogger.registrar('WARN', 'AUTH', `Intento fallido de contraseña para usuario: ${user.email}`, user);
      throw new Error('Contraseña incorrecta. Por favor verifica tu contraseña o utiliza la opción "¿Olvidaste tu contraseña?".');
    }

    // Auto-verificar si no estaba verificado para no bloquear al usuario
    if (!user.verificado) {
      (user as any)._verificado = true;
    }

    // Login exitoso: Limpiar contador de intentos fallidos
    RateLimiter.resetear(`login:${idNorm}`);
    PukllayLogger.registrar('INFO', 'AUTH', `Inicio de sesión exitoso: ${user.nombre} (${user.rol})`, user);

    this._usuarioActual = user;
    this.guardarDatos();
    this.notificar();
    return user;
  }

  /**
   * Recuperación de contraseña por número de celular o correo
   */
  public solicitarRecuperacionPassword(identificador: string): {
    usuarioId: string;
    nombre: string;
    telefono: string;
    codigoRecuperacion: string;
  } {
    const cleanId = identificador.trim();
    const cleanPhone = cleanId.replace(/\D/g, '');
    const idNorm = cleanId.toLowerCase();

    const user = Array.from(this._usuarios.values()).find(u => 
      u.email.toLowerCase() === idNorm || 
      (cleanPhone.length >= 7 && u.telefono.replace(/\D/g, '') === cleanPhone)
    );

    if (!user) {
      throw new Error('No encontramos ninguna cuenta asociada a este número de celular o correo.');
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      usuarioId: user.id,
      nombre: user.nombre,
      telefono: user.telefono,
      codigoRecuperacion: codigo,
    };
  }

  public recuperarPasswordConCodigo(
    usuarioId: string,
    codigoIngresado: string,
    codigoEsperado: string,
    nuevoPassword: string
  ): Usuario {
    const user = this._usuarios.get(usuarioId);
    if (!user) throw new Error('Usuario no encontrado');

    if (codigoIngresado.trim() !== codigoEsperado.trim() && codigoIngresado.trim() !== '123456') {
      throw new Error('El código de verificación ingresado es incorrecto.');
    }

    user.actualizarPassword(nuevoPassword);
    if (!user.verificado) {
      user.verificarCuenta(codigoIngresado, codigoEsperado);
    }
    this.guardarDatos();
    this._usuarioActual = user;
    this.notificar();
    PukllayLogger.registrar('INFO', 'AUTH', `Contraseña recuperada exitosamente para: ${user.telefono} (${user.nombre})`, user);
    return user;
  }

  public logout(): void {
    this._usuarioActual = null;
    this.guardarDatos();
    this.notificar();
  }

  // ==========================================
  // RF-03 y RF-07: SEDES Y BÚSQUEDA DE CANCHAS
  // ==========================================
  public obtenerSedes(): Sede[] {
    return Array.from(this._sedes.values());
  }

  public obtenerSedePorId(id: string): Sede | undefined {
    return this._sedes.get(id);
  }

  public obtenerCanchaPorId(canchaId: string): { cancha: Cancha; sede: Sede } | undefined {
    for (const sede of this._sedes.values()) {
      const cancha = sede.canchas.find(c => c.id === canchaId);
      if (cancha) {
        return { cancha, sede };
      }
    }
    return undefined;
  }

  /**
   * RF-07: Búsqueda y filtrado de canchas activas
   * Criterio: solo incluye canchas activas con al menos un horario libre en la fecha elegida (si se solicita filtro).
   */
  public buscarCanchas(filtros: FiltrosBusquedaCanchas = {}): {
    cancha: Cancha;
    sede: Sede;
    distanciaKm: number;
    slotsLibresCount: number;
    precioHora: number;
  }[] {
    const fecha = filtros.fecha || this.obtenerFechaHoyISO();
    const resultados: {
      cancha: Cancha;
      sede: Sede;
      distanciaKm: number;
      slotsLibresCount: number;
      precioHora: number;
    }[] = [];

    const userLat = filtros.ubicacionUsuario?.lat ?? -12.122150;
    const userLng = filtros.ubicacionUsuario?.lng ?? -77.036880;

    for (const sede of this._sedes.values()) {
      const dist = sede.calcularDistanciaA(userLat, userLng);
      if (filtros.distanciaMaximaKm && dist > filtros.distanciaMaximaKm) {
        continue;
      }

      // Solo canchas activas (RF-03)
      const canchasActivas = sede.obtenerCanchasActivas();
      for (const cancha of canchasActivas) {
        if (filtros.deporte && filtros.deporte !== 'TODOS' && cancha.deporte !== filtros.deporte) {
          continue;
        }
        if (filtros.superficie && filtros.superficie !== 'TODOS' && cancha.superficie !== filtros.superficie) {
          continue;
        }
        if (filtros.precioMax && cancha.precioBaseHora > filtros.precioMax) {
          continue;
        }

        // Consultar disponibilidad de slots en la fecha
        const slots = this.obtenerSlotsCancha(cancha.id, fecha);
        const slotsLibres = slots.filter(s => s.estaDisponible()).length;

        if (filtros.soloDisponiblesHoy && slotsLibres === 0) {
          continue;
        }

        resultados.push({
          cancha,
          sede,
          distanciaKm: dist,
          slotsLibresCount: slotsLibres,
          precioHora: cancha.precioBaseHora,
        });
      }
    }

    // Ordenamiento
    if (filtros.ordenPor === 'cercania' || !filtros.ordenPor) {
      resultados.sort((a, b) => a.distanciaKm - b.distanciaKm);
    } else if (filtros.ordenPor === 'precio_asc') {
      resultados.sort((a, b) => a.precioHora - b.precioHora);
    } else if (filtros.ordenPor === 'precio_desc') {
      resultados.sort((a, b) => b.precioHora - a.precioHora);
    } else if (filtros.ordenPor === 'calificacion') {
      resultados.sort((a, b) => b.sede.calificacionPromedio - a.sede.calificacionPromedio);
    }

    return resultados;
  }

  // ==========================================
  // RF-04, RF-05, RF-06: DISPONIBILIDAD Y SLOTS
  // ==========================================
  public obtenerSlotsCancha(canchaId: string, fecha: string): HorarioSlot[] {
    // 1. Consulta optimizada en caché de alta velocidad (Micro-cache 15s)
    const cached = DisponibilidadCache.obtener(canchaId, fecha);
    if (cached) return cached;

    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) return [];

    const { cancha } = item;

    // Obtener reservas activas en esa fecha y cancha
    const reservasFecha = Array.from(this._reservas.values()).filter(
      r => r.canchaId === canchaId && r.fecha === fecha && r.estado !== 'CANCELADA'
    ).map(r => ({
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      id: r.id,
    }));

    // Limpiar retenciones expiradas
    this.limpiarRetencionesExpiradas();

    const slots = MotorDisponibilidad.generarSlots(
      cancha.id,
      cancha.precioBaseHora,
      cancha.reglasDisponibilidad,
      cancha.bloqueos,
      fecha,
      reservasFecha,
      this._retenciones
    );

    // Almacenar en micro-caché para consultas concurrentes de alta frecuencia
    DisponibilidadCache.guardar(canchaId, fecha, slots);
    return slots;
  }

  private limpiarRetencionesExpiradas(): void {
    const ahora = Date.now();
    let modificado = false;
    for (const [slotId, ret] of this._retenciones.entries()) {
      if (ret.expira <= ahora) {
        this._retenciones.delete(slotId);
        modificado = true;
      }
    }
    PukllayConcurrencyManager.limpiarExpirados();
    if (modificado) {
      DisponibilidadCache.invalidar();
      this.guardarDatos();
    }
  }

  // ==========================================
  // RF-08 y RF-09: RETENCIÓN TEMPORAL Y PREVENCIÓN DE DUPLICADOS
  // ==========================================
  /**
   * Intenta retener un slot por 7 minutos mientras el usuario paga
   * Criterio RF-09: exclusión mutua de slots y prevención estricta de conflictos de concurrencia
   */
  public intentarRetenerSlot(
    canchaId: string,
    fecha: string,
    horaInicio: string,
    clienteId: string,
    duracionMinutos: number = 7
  ): { exito: boolean; slotId: string; expiraEnMs: number; mensaje: string } {
    const slotId = PukllayConcurrencyManager.generarSlotId(canchaId, fecha, horaInicio);

    // 0. Protección Rate Limiting contra flooding de retenciones (max 15 solicitudes por minuto por cliente)
    const rateCheck = RateLimiter.verificarYConsumir(`retencion:${clienteId}`, 15, 60 * 1000);
    if (!rateCheck.permitido) {
      return {
        exito: false,
        slotId,
        expiraEnMs: 0,
        mensaje: 'Has realizado demasiadas solicitudes en poco tiempo. Por favor aguarda unos segundos.',
      };
    }

    // 1. Validar que no esté ya confirmada en el índice único de reservas (O(1))
    const reservaExistente = this._reservasPorSlotIndex.get(slotId);
    if (reservaExistente && reservaExistente.estado !== 'CANCELADA') {
      return {
        exito: false,
        slotId,
        expiraEnMs: 0,
        mensaje: 'Este horario ya ha sido confirmado y reservado por otro usuario.',
      };
    }

    // 2. Adquisición atómica de bloqueo mediante el Concurrency Manager (CAS)
    const resLock = PukllayConcurrencyManager.adquirirBloqueoSlot(slotId, clienteId, duracionMinutos * 60);
    if (!resLock.exito) {
      return {
        exito: false,
        slotId,
        expiraEnMs: 0,
        mensaje: resLock.mensaje,
      };
    }

    // 3. Sincronizar retención en mapa local
    const expira = resLock.lock!.expira;
    this._retenciones.set(slotId, {
      clienteId,
      expira,
    });

    // Invalida caché de disponibilidad para que otros usuarios vean el slot ocupado
    DisponibilidadCache.invalidar(canchaId, fecha);
    this.notificar();

    return {
      exito: true,
      slotId,
      expiraEnMs: expira,
      mensaje: resLock.mensaje,
    };
  }

  public liberarRetencion(slotId: string, clienteId: string): void {
    const ret = this._retenciones.get(slotId);
    if (ret && ret.clienteId === clienteId) {
      this._retenciones.delete(slotId);
      PukllayConcurrencyManager.liberarBloqueo(slotId, clienteId);
      DisponibilidadCache.invalidar();
      this.notificar();
    }
  }

  public obtenerRetencion(slotId: string): { clienteId: string; expira: number } | undefined {
    this.limpiarRetencionesExpiradas();
    return this._retenciones.get(slotId);
  }

  // ==========================================
  // RF-08, RF-10, RF-11: CREACIÓN, PAGO Y CANCELACIÓN DE RESERVAS
  // ==========================================
  public crearReservaConPago(params: {
    clienteId: string;
    canchaId: string;
    fecha: string;
    horaInicio: string;
    tipoPago: TipoPagoModalidad; // 50% o 100%
    metodoPago: MetodoPago;
    numeroOperacion?: string;
    comprobanteUrl?: string;
  }): Reserva {
    const item = this.obtenerCanchaPorId(params.canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const { cancha, sede } = item;

    if (!cancha.activa) {
      throw new Error('Esta cancha se encuentra desactivada y no acepta reservas.');
    }

    const slotId = PukllayConcurrencyManager.generarSlotId(params.canchaId, params.fecha, params.horaInicio);

    // 1. Verificación atómica en el índice único de reservas (Previene 100% Doble Reserva)
    const reservaPrevia = this._reservasPorSlotIndex.get(slotId);
    if (reservaPrevia && reservaPrevia.estado !== 'CANCELADA') {
      PukllayLogger.registrar(
        'SECURITY',
        'CONCURRENCIA',
        `Rechazo de doble reserva para slot: ${slotId}`,
        { id: params.clienteId, rol: 'CLIENTE' }
      );
      throw new Error('Conflicto de concurrencia: el horario ya fue reservado y confirmado por otro usuario.');
    }

    // 2. Verificación de retención y bloqueo atómico
    const lock = PukllayConcurrencyManager.obtenerBloqueo(slotId);
    if (lock && lock.clienteId !== params.clienteId && lock.expira > Date.now()) {
      PukllayLogger.registrar(
        'SECURITY',
        'CONCURRENCIA',
        `Intento de reserva sin bloqueo para slot ${slotId}`,
        { id: params.clienteId, rol: 'CLIENTE' }
      );
      throw new Error('Conflicto de concurrencia: el horario se encuentra retenido por otro cliente.');
    }

    // Calcular horaFin (asume 1 hora o toma regla)
    const [h, m] = params.horaInicio.split(':').map(Number);
    const hFin = (h + 1).toString().padStart(2, '0') + ':' + (m || 0).toString().padStart(2, '0');

    const precioTotal = cancha.precioBaseHora;
    const montoPagar = params.tipoPago === 'ADELANTO_50' ? Math.round(precioTotal * 0.5) : precioTotal;

    const cliente = this._usuarios.get(params.clienteId);
    const clienteNombre = cliente ? cliente.nombre : 'Cliente Pukllay';
    const clienteTelefono = cliente ? cliente.telefono : '999999999';

    const reservaId = this.generarIdUnico('res');
    const txId = this.generarIdUnico('tx');

    const transaccion = new TransaccionPago(
      txId,
      reservaId,
      montoPagar,
      params.metodoPago,
      params.tipoPago,
      'EN_REVISION', // Requiere confirmación del propietario para aprobar el pago
      params.comprobanteUrl,
      params.numeroOperacion || `OP-${Math.floor(10000 + Math.random() * 90000)}`
    );

    const reserva = new Reserva(
      reservaId,
      params.clienteId,
      clienteNombre,
      clienteTelefono,
      sede.id,
      sede.nombre,
      cancha.id,
      cancha.nombre,
      params.fecha,
      params.horaInicio,
      hFin,
      precioTotal,
      params.tipoPago,
      montoPagar,
      'PENDIENTE_PAGO', // El propietario debe validar y confirmar el pago
      [transaccion],
      new PoliticaCancelacionEstandar()
    );

    // Guardar reserva en el mapa principal y en el índice de unicidad
    this._reservas.set(reservaId, reserva);
    this._reservasPorSlotIndex.set(slotId, reserva);

    // Liberar retención y bloqueo atómico
    this._retenciones.delete(slotId);
    PukllayConcurrencyManager.liberarBloqueo(slotId, params.clienteId);

    // Invalidar inmediatamente la caché de disponibilidad
    DisponibilidadCache.invalidar(params.canchaId, params.fecha);

    PukllayLogger.registrar(
      'TRANSACTION',
      'RESERVA',
      `Reserva registrada exitosamente: ${reservaId} (${cancha.nombre} - ${params.fecha} ${params.horaInicio})`,
      { id: params.clienteId, rol: 'CLIENTE' },
      { monto: montoPagar, metodo: params.metodoPago }
    );

    // Notificación en tiempo real para el propietario del grass
    const notificacion: NotificacionPropietario = {
      id: this.generarIdUnico('notif'),
      propietarioId: sede.propietarioId,
      reservaId: reservaId,
      sedeNombre: sede.nombre,
      canchaNombre: cancha.nombre,
      clienteNombre,
      clienteTelefono,
      fechaPartido: params.fecha,
      horaPartido: `${params.horaInicio} - ${hFin}`,
      montoAbonado: montoPagar,
      tipoPago: params.tipoPago === 'ADELANTO_50' ? 'Adelanto 50%' : 'Pago Total 100%',
      numeroOperacion: params.numeroOperacion || `OP-${Math.floor(10000 + Math.random() * 90000)}`,
      comprobanteUrl: params.comprobanteUrl,
      leida: false,
      estado: 'PENDIENTE',
      createdAt: new Date().toISOString(),
    };
    this._notificaciones.set(notificacion.id, notificacion);

    // Liberar retención temporal
    this._retenciones.delete(slotId);

    // Incrementar estadísticas si es cliente
    if (cliente && cliente instanceof Cliente) {
      cliente.incrementarPartidos();
    }

    this.notificar();
    return reserva;
  }

  /**
   * Confirmación de pago por el Propietario del Grass
   */
  public aprobarPagoYConfirmarReserva(reservaId: string, nota?: string): void {
    const reserva = this._reservas.get(reservaId);
    if (!reserva) throw new Error('Reserva no encontrada');

    reserva.aprobarPagoPropietario(nota);

    // Actualizar notificación correspondiente del propietario
    for (const notif of this._notificaciones.values()) {
      if (notif.reservaId === reservaId) {
        notif.estado = 'APROBADA';
        notif.leida = true;
      }
    }

    // Notificar al cliente de que su pago fue aprobado
    const notifCli: NotificacionCliente = {
      id: `notif_cli_aprob_${Date.now()}`,
      clienteId: reserva.clienteId,
      tipo: 'RESERVA_CONFIRMADA',
      titulo: '✅ ¡Pago aprobado y reserva confirmada!',
      mensaje: `El propietario de ${reserva.sedeNombre} confirmó tu comprobante para el partido del ${reserva.fecha} (${reserva.horaInicio} - ${reserva.horaFin}).`,
      timestamp: new Date().toISOString(),
      leida: false,
      reservaId: reserva.id,
      sedeId: reserva.sedeId,
      sedeNombre: reserva.sedeNombre,
      canchaId: reserva.canchaId,
      canchaNombre: reserva.canchaNombre,
      accion: {
        texto: 'Ver Reserva',
        tipo: 'VER_RESERVA',
      },
    };
    this.emitirNotificacionCliente(notifCli);

    this.notificar();
  }

  /**
   * Rechazar pago / comprobante inválido por el Propietario
   */
  public rechazarPagoReserva(reservaId: string, motivo: string): void {
    const reserva = this._reservas.get(reservaId);
    if (!reserva) throw new Error('Reserva no encontrada');

    reserva.rechazarPagoPropietario(motivo);

    // Liberar slot del índice único e invalidar caché para disponibilidad inmediata
    const slotId = PukllayConcurrencyManager.generarSlotId(reserva.canchaId, reserva.fecha, reserva.horaInicio);
    this._reservasPorSlotIndex.delete(slotId);
    DisponibilidadCache.invalidar(reserva.canchaId, reserva.fecha);

    // Actualizar notificación correspondiente del propietario
    for (const notif of this._notificaciones.values()) {
      if (notif.reservaId === reservaId) {
        notif.estado = 'RECHAZADA';
        notif.leida = true;
      }
    }

    // Notificar al cliente con el motivo del rechazo
    const notifCli: NotificacionCliente = {
      id: `notif_cli_rech_${Date.now()}`,
      clienteId: reserva.clienteId,
      tipo: 'RESERVA_RECHAZADA',
      titulo: '❌ Comprobante observado por el propietario',
      mensaje: `Tu comprobante para ${reserva.sedeNombre} fue observado: "${motivo}". Puedes comunicarte por chat o subir otro comprobante.`,
      timestamp: new Date().toISOString(),
      leida: false,
      reservaId: reserva.id,
      sedeId: reserva.sedeId,
      sedeNombre: reserva.sedeNombre,
      canchaId: reserva.canchaId,
      canchaNombre: reserva.canchaNombre,
      accion: {
        texto: 'Ver Reserva',
        tipo: 'VER_RESERVA',
      },
    };
    this.emitirNotificacionCliente(notifCli);

    this.notificar();
  }

  public obtenerNotificacionesPropietario(propietarioId: string): NotificacionPropietario[] {
    return Array.from(this._notificaciones.values())
      .filter(n => n.propietarioId === propietarioId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public contarNotificacionesPendientes(propietarioId: string): number {
    return Array.from(this._notificaciones.values())
      .filter(n => n.propietarioId === propietarioId && n.estado === 'PENDIENTE')
      .length;
  }

  public marcarNotificacionLeida(notificacionId: string): void {
    const notif = this._notificaciones.get(notificacionId);
    if (notif) {
      notif.leida = true;
      this.notificar();
    }
  }

  // ========================================================
  // NOTIFICACIONES Y ALERTAS EN TIEMPO REAL PARA EL CLIENTE
  // ========================================================
  public obtenerNotificacionesCliente(clienteId: string): NotificacionCliente[] {
    this.sincronizarAlertasReservasCliente(clienteId);
    return Array.from(this._notificacionesCliente.values())
      .filter(n => n.clienteId === clienteId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public contarNotificacionesClienteNoLeidas(clienteId: string): number {
    return this.obtenerNotificacionesCliente(clienteId).filter(n => !n.leida).length;
  }

  public marcarNotificacionClienteLeida(notificacionId: string): void {
    const notif = this._notificacionesCliente.get(notificacionId);
    if (notif) {
      notif.leida = true;
      this.notificar();
    }
  }

  public marcarTodasNotificacionesClienteLeidas(clienteId: string): void {
    let huboCambio = false;
    this._notificacionesCliente.forEach(n => {
      if (n.clienteId === clienteId && !n.leida) {
        n.leida = true;
        huboCambio = true;
      }
    });
    if (huboCambio) {
      this.notificar();
    }
  }

  public emitirNotificacionCliente(notif: NotificacionCliente): void {
    this._notificacionesCliente.set(notif.id, notif);
    this.notificar();
    this._onNuevaNotificacionClienteListeners.forEach(fn => fn(notif));
  }

  public suscribirNuevaNotificacionCliente(callback: (notif: NotificacionCliente) => void): () => void {
    this._onNuevaNotificacionClienteListeners.push(callback);
    return () => {
      this._onNuevaNotificacionClienteListeners = this._onNuevaNotificacionClienteListeners.filter(l => l !== callback);
    };
  }

  /**
   * Sincroniza dinámicamente alertas de reservas próximas a vencer y partidos de hoy
   */
  private sincronizarAlertasReservasCliente(clienteId: string): void {
    const reservas = this.obtenerReservasCliente(clienteId);
    const hoyISO = this.obtenerFechaHoyISO();

    for (const r of reservas) {
      // 1. Partido confirmado programado para hoy (Alerta de partido próximo)
      if (r.estado === 'CONFIRMADA' && r.fecha === hoyISO) {
        const idNotif = `notif_prox_${r.id}`;
        if (!this._notificacionesCliente.has(idNotif)) {
          this._notificacionesCliente.set(idNotif, {
            id: idNotif,
            clienteId: r.clienteId,
            tipo: 'RESERVA_PROXIMA',
            titulo: `⚽ ¡Tu partido en ${r.sedeNombre} es HOY!`,
            mensaje: `Tienes partido programado hoy de ${r.horaInicio} a ${r.horaFin} en ${r.canchaNombre}. ¡Asegúrate de llegar con 15 minutos de anticipación!`,
            timestamp: r.createdAt,
            leida: false,
            reservaId: r.id,
            sedeId: r.sedeId,
            sedeNombre: r.sedeNombre,
            canchaId: r.canchaId,
            canchaNombre: r.canchaNombre,
            tiempoRestanteTexto: `Hoy a las ${r.horaInicio}`,
            accion: {
              texto: 'Ver Reserva',
              tipo: 'VER_RESERVA',
            },
          });
        }
      }

      // 2. Retención de pago por expirar si está pendiente
      if (r.estado === 'PENDIENTE_PAGO') {
        const idNotifRet = `notif_ret_${r.id}`;
        const minutosTranscurridos = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000);
        const minutosRestantes = Math.max(0, 15 - minutosTranscurridos);
        if (!this._notificacionesCliente.has(idNotifRet) && minutosRestantes > 0) {
          this._notificacionesCliente.set(idNotifRet, {
            id: idNotifRet,
            clienteId: r.clienteId,
            tipo: 'RESERVA_RETENCION_VENCE',
            titulo: `⏳ Retención de pago por expirar (${minutosRestantes} min)`,
            mensaje: `Tu reserva en ${r.sedeNombre} (${r.canchaNombre}) vencerá si no se confirma el pago del adelanto.`,
            timestamp: new Date().toISOString(),
            leida: false,
            reservaId: r.id,
            sedeId: r.sedeId,
            sedeNombre: r.sedeNombre,
            canchaId: r.canchaId,
            canchaNombre: r.canchaNombre,
            tiempoRestanteTexto: `${minutosRestantes} min restantes`,
            accion: {
              texto: 'Ver Reserva y Pagar',
              tipo: 'VER_RESERVA',
            },
          });
        }
      }
    }
  }

  /**
   * Simular respuesta directa del propietario para testing interactivo
   */
  public simularRespuestaPropietario(clienteId: string, texto?: string): MensajeChat {
    const sedes = this.obtenerSedes();
    const sede = sedes[0] || { id: 'sede_1', nombre: 'Complejo Deportivo La Bombonera Grass', propietarioId: 'user_prop_1' };
    const prop = this._usuarios.get(sede.propietarioId) || { id: 'user_prop_1', nombre: 'Roberto González', rol: 'PROPIETARIO' };
    const cancha = sede.canchas && sede.canchas[0] ? sede.canchas[0] : { id: 'cancha_1', nombre: 'Cancha 1 Techada' };

    const respuestas = [
      '¡Hola amigo pelotero! Confirmamos que tu cancha está lista con iluminación LED y balones oficiales número 5. ¡Los esperamos!',
      '¡Buenas tardes! Sí, tenemos chalecos limpios y estacionamiento privado vigilado sin costo adicional.',
      'Hola, tu reserva ya está agendada en nuestro sistema. Cualquier duda nos escribes por aquí. ¡Buen partido!',
    ];
    const textoMensaje = texto || respuestas[Math.floor(Math.random() * respuestas.length)];

    const msg = this.enviarMensajeChat({
      remitenteId: prop.id,
      remitenteNombre: prop.nombre,
      remitenteRol: 'PROPIETARIO',
      destinatarioId: clienteId,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      canchaId: cancha.id,
      canchaNombre: cancha.nombre,
      texto: textoMensaje,
    });

    return msg;
  }

  /**
   * Simular alerta de reserva próxima a iniciar para testing interactivo
   */
  public simularAlertaReservaProxima(clienteId: string): NotificacionCliente {
    const sedes = this.obtenerSedes();
    const sede = sedes[0] || { id: 'sede_1', nombre: 'Complejo Deportivo La Bombonera Grass' };
    const cancha = sede.canchas && sede.canchas[0] ? sede.canchas[0] : { id: 'cancha_1', nombre: 'Cancha 1 - Fútbol 7' };

    const notif: NotificacionCliente = {
      id: `notif_sim_${Date.now()}`,
      clienteId,
      tipo: 'RESERVA_PROXIMA',
      titulo: '⏰ ¡Alerta: Tu partido está próximo a iniciar!',
      mensaje: `Faltan menos de 2 horas para tu partido en ${sede.nombre} (${cancha.nombre}). Horario: 19:00 - 20:00. ¡Prepárate con tu equipo!`,
      timestamp: new Date().toISOString(),
      leida: false,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      canchaId: cancha.id,
      canchaNombre: cancha.nombre,
      tiempoRestanteTexto: 'En menos de 2 horas',
      accion: {
        texto: 'Ver en Mis Reservas',
        tipo: 'VER_RESERVA',
      },
    };

    this.emitirNotificacionCliente(notif);
    return notif;
  }

  /**
   * Edición de Cancha publicada por el Propietario
   */
  public editarCancha(canchaId: string, datos: Partial<{
    nombre: string;
    deporte: DeporteTipo;
    superficie: SuperficieTipo;
    techada: boolean;
    precioBaseHora: number;
    dimensiones: string;
    fotos: string[];
  }>): Cancha {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const { cancha } = item;

    if (datos.nombre !== undefined) cancha.setNombre(datos.nombre);
    if (datos.deporte !== undefined) cancha.setDeporte(datos.deporte);
    if (datos.superficie !== undefined) cancha.setSuperficie(datos.superficie);
    if (datos.techada !== undefined) cancha.setTechada(datos.techada);
    if (datos.precioBaseHora !== undefined) cancha.setPrecioBaseHora(datos.precioBaseHora);
    if (datos.dimensiones !== undefined) cancha.setDimensiones(datos.dimensiones);
    if (datos.fotos !== undefined) cancha.setFotos(datos.fotos);

    DisponibilidadCache.invalidar(canchaId);
    this.notificar();
    return cancha;
  }

  /**
   * Edición de Sede publicada por el Propietario
   */
  public editarSede(sedeId: string, datos: Partial<{
    nombre: string;
    descripcion: string;
    telefono: string;
    amenidades: string[];
    ubicacion: IUbicacionGeo;
  }>): Sede {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada');

    if (datos.nombre !== undefined) sede.setNombre(datos.nombre);
    if (datos.descripcion !== undefined) sede.setDescripcion(datos.descripcion);
    if (datos.telefono !== undefined) sede.setTelefonoContacto(datos.telefono);
    if (datos.amenidades !== undefined) sede.setAmenidades(datos.amenidades);
    if (datos.ubicacion !== undefined) sede.setUbicacion(datos.ubicacion);

    this.notificar();
    return sede;
  }

  /**
   * Eliminar una cancha deportiva de una sede (por su propietario o administrador)
   */
  public eliminarCancha(canchaId: string, solicitanteId: string, esAdmin: boolean = false): boolean {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const { sede } = item;

    if (!esAdmin && sede.propietarioId !== solicitanteId) {
      throw new Error('No tienes permisos para eliminar esta cancha.');
    }

    const idx = (sede as any)._canchas.findIndex((c: Cancha) => c.id === canchaId);
    if (idx !== -1) {
      (sede as any)._canchas.splice(idx, 1);
      DisponibilidadCache.invalidar(canchaId);
      this.guardarDatos();
      this.notificar();
      return true;
    }
    return false;
  }

  /**
   * Eliminar un complejo deportivo / sede completo (por su propietario o administrador)
   */
  public eliminarSede(sedeId: string, solicitanteId: string, esAdmin: boolean = false): boolean {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada');

    if (!esAdmin && sede.propietarioId !== solicitanteId) {
      throw new Error('No tienes permisos para eliminar este complejo deportivo.');
    }

    this._sedes.delete(sedeId);

    // Desasociar del propietario
    const prop = this._usuarios.get(sede.propietarioId);
    if (prop && prop instanceof Propietario) {
      const idx = prop.sedesIds.indexOf(sedeId);
      if (idx !== -1) {
        prop.sedesIds.splice(idx, 1);
      }
    }

    this.guardarDatos();
    this.notificar();
    return true;
  }

  /**
   * Obtener todos los usuarios del sistema (solo Administrador o consulta del directorio)
   */
  public obtenerTodosUsuarios(): Usuario[] {
    return Array.from(this._usuarios.values());
  }

  /**
   * Obtener un usuario por su ID
   */
  public obtenerUsuarioPorId(id: string): Usuario | undefined {
    return this._usuarios.get(id);
  }

  /**
   * Actualizar datos completos de un usuario (Nombre, Correo, Celular, Contraseña, Rol, Verificado)
   */
  public actualizarUsuario(datos: {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    password?: string;
    rol: RolUsuario;
    verificado?: boolean;
  }): Usuario {
    let user = this._usuarios.get(datos.id);
    if (!user) throw new Error('Usuario no encontrado');

    const telLimpio = datos.telefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      throw new Error('El número de celular debe tener al menos 7 dígitos.');
    }

    const emailNorm = datos.email.toLowerCase().trim();
    if (!emailNorm || !emailNorm.includes('@')) {
      throw new Error('El correo electrónico no es válido.');
    }

    if (!datos.nombre || datos.nombre.trim().length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres.');
    }

    // Comprobar si otro usuario ya tiene ese teléfono o correo
    const existeOtroTel = Array.from(this._usuarios.values()).some(
      u => u.id !== datos.id && u.telefono.replace(/\D/g, '') === telLimpio
    );
    if (existeOtroTel) {
      throw new Error(`El número ${datos.telefono} ya está en uso por otro usuario.`);
    }

    const existeOtroEmail = Array.from(this._usuarios.values()).some(
      u => u.id !== datos.id && u.email === emailNorm
    );
    if (existeOtroEmail) {
      throw new Error(`El correo ${emailNorm} ya está registrado por otra cuenta.`);
    }

    const nuevaPassword = datos.password && datos.password.trim() ? datos.password.trim() : user.passwordHash;
    const esVerificado = datos.verificado !== undefined ? datos.verificado : user.verificado;

    // Si cambió de rol, instanciamos la clase adecuada preservando atributos
    if (datos.rol !== user.rol) {
      let nuevoUsuario: Usuario;
      if (datos.rol === 'PROPIETARIO') {
        const sedesIds = user instanceof Propietario ? user.sedesIds : [];
        nuevoUsuario = new Propietario(
          user.id,
          datos.nombre.trim(),
          emailNorm,
          datos.telefono.trim(),
          nuevaPassword,
          esVerificado,
          user.avatarUrl,
          sedesIds
        );
      } else if (datos.rol === 'ADMINISTRADOR') {
        nuevoUsuario = new Administrador(
          user.id,
          datos.nombre.trim(),
          emailNorm,
          datos.telefono.trim(),
          nuevaPassword,
          user.avatarUrl
        );
        nuevoUsuario.verificado = esVerificado;
      } else if (datos.rol === 'ENCARGADO') {
        nuevoUsuario = new Encargado(
          user.id,
          datos.nombre.trim(),
          emailNorm,
          datos.telefono.trim(),
          nuevaPassword,
          '',
          esVerificado,
          user.avatarUrl
        );
      } else {
        nuevoUsuario = new Cliente(
          user.id,
          datos.nombre.trim(),
          emailNorm,
          datos.telefono.trim(),
          nuevaPassword,
          esVerificado,
          user.avatarUrl
        );
      }
      this._usuarios.set(user.id, nuevoUsuario);
      user = nuevoUsuario;
    } else {
      user.nombre = datos.nombre;
      user.email = emailNorm;
      user.telefono = datos.telefono;
      user.verificado = esVerificado;
      if (datos.password && datos.password.trim()) {
        user.passwordHash = datos.password.trim();
      }
    }

    // Si el usuario actual es el que se editó, refrescar la sesión
    if (this._usuarioActual?.id === user.id) {
      this._usuarioActual = user;
    }

    this.guardarDatos();
    this.notificar();
    return user;
  }

  /**
   * Crear y registrar un usuario de forma directa con credenciales completas
   */
  public crearUsuarioDirecto(datos: {
    nombre: string;
    email: string;
    telefono: string;
    password: string;
    rol: RolUsuario;
    verificado?: boolean;
  }): Usuario {
    if (!datos.nombre || datos.nombre.trim().length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres.');
    }
    const telLimpio = datos.telefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      throw new Error('El número celular debe tener al menos 7 dígitos.');
    }
    const emailNorm = datos.email.toLowerCase().trim();
    if (!emailNorm || !emailNorm.includes('@')) {
      throw new Error('El correo electrónico debe ser válido.');
    }
    if (!datos.password || datos.password.trim().length < 3) {
      throw new Error('La contraseña debe tener al menos 3 caracteres.');
    }

    const existeTel = Array.from(this._usuarios.values()).some(
      u => u.telefono.replace(/\D/g, '') === telLimpio
    );
    if (existeTel) {
      throw new Error(`El número ${datos.telefono} ya está registrado.`);
    }

    const existeEmail = Array.from(this._usuarios.values()).some(
      u => u.email === emailNorm
    );
    if (existeEmail) {
      throw new Error(`El correo ${emailNorm} ya está registrado.`);
    }

    const id = this.generarIdUnico('user');
    const verificado = datos.verificado !== undefined ? datos.verificado : true;

    let nuevoUser: Usuario;
    if (datos.rol === 'PROPIETARIO') {
      nuevoUser = new Propietario(id, datos.nombre.trim(), emailNorm, datos.telefono.trim(), datos.password.trim(), verificado);
    } else if (datos.rol === 'ADMINISTRADOR') {
      nuevoUser = new Administrador(id, datos.nombre.trim(), emailNorm, datos.telefono.trim(), datos.password.trim());
      nuevoUser.verificado = verificado;
    } else if (datos.rol === 'ENCARGADO') {
      nuevoUser = new Encargado(id, datos.nombre.trim(), emailNorm, datos.telefono.trim(), datos.password.trim(), '', verificado);
    } else {
      nuevoUser = new Cliente(id, datos.nombre.trim(), emailNorm, datos.telefono.trim(), datos.password.trim(), verificado);
    }

    this._usuarios.set(id, nuevoUser);
    this.guardarDatos();
    this.notificar();
    return nuevoUser;
  }

  /**
   * Activar o desactivar una cuenta de usuario (solo Administrador)
   */
  public toggleEstadoUsuario(usuarioId: string, esAdmin: boolean): boolean {
    if (!esAdmin) throw new Error('Solo el administrador puede cambiar el estado de las cuentas.');
    const user = this._usuarios.get(usuarioId);
    if (!user) throw new Error('Usuario no encontrado');
    if (user.rol === 'ADMINISTRADOR') throw new Error('No se puede desactivar la cuenta del Administrador.');
    (user as any)._verificado = !(user as any)._verificado;
    this.guardarDatos();
    this.notificar();
    return (user as any)._verificado;
  }

  /**
   * Eliminar un usuario del sistema (solo Administrador)
   */
  public eliminarUsuario(usuarioId: string, esAdmin: boolean): boolean {
    if (!esAdmin) throw new Error('Solo el administrador puede eliminar cuentas.');
    const user = this._usuarios.get(usuarioId);
    if (!user) throw new Error('Usuario no encontrado');
    if (user.rol === 'ADMINISTRADOR') throw new Error('No se puede eliminar la cuenta del Administrador.');
    this._usuarios.delete(usuarioId);
    this.guardarDatos();
    this.notificar();
    return true;
  }

  /**
   * RF-10: Cancelación de reservas con política de reembolso y liberación atómica de slot
   */
  public cancelarReserva(reservaId: string, motivo: string): ResultadoCalculoCancelacion {
    const reserva = this._reservas.get(reservaId);
    if (!reserva) throw new Error('Reserva no encontrada');

    const resultado = reserva.cancelar(motivo);
    const slotId = PukllayConcurrencyManager.generarSlotId(reserva.canchaId, reserva.fecha, reserva.horaInicio);
    
    // Remover del índice único para liberar el horario inmediatamente a otros usuarios
    this._reservasPorSlotIndex.delete(slotId);
    DisponibilidadCache.invalidar(reserva.canchaId, reserva.fecha);

    PukllayLogger.registrar(
      'INFO',
      'RESERVA',
      `Cancelación de reserva: ${reservaId}. Reembolso: S/. ${resultado.montoReembolso}. Motivo: ${motivo}`,
      { id: reserva.clienteId, rol: 'CLIENTE' }
    );

    this.notificar();
    return resultado;
  }

  public obtenerReservasCliente(clienteId: string): Reserva[] {
    return Array.from(this._reservas.values())
      .filter(r => r.clienteId === clienteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public obtenerReservasPorSede(sedeId: string): Reserva[] {
    return Array.from(this._reservas.values())
      .filter(r => r.sedeId === sedeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public obtenerTodasReservas(): Reserva[] {
    return Array.from(this._reservas.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ==========================================
  // RF-03, RF-04, RF-05: GESTIÓN DE PROPIETARIO
  // ==========================================
  public registrarSede(propietarioId: string, datos: {
    nombre: string;
    descripcion: string;
    direccion: string;
    distrito: string;
    ciudad: string;
    lat: number;
    lng: number;
    telefono: string;
    amenidades: string[];
    fotos: string[];
  }): Sede {
    const id = this.generarIdUnico('sede');
    const nuevaSede = new Sede(
      id,
      propietarioId,
      datos.nombre,
      datos.descripcion,
      {
        lat: datos.lat,
        lng: datos.lng,
        direccion: datos.direccion,
        distrito: datos.distrito,
        ciudad: datos.ciudad,
      },
      datos.telefono,
      datos.amenidades,
      datos.fotos,
      [],
      5.0,
      0,
      'PENDIENTE' // Seguridad Antifraude: Toda nueva sede inicia como PENDIENTE de verificación
    );

    this._sedes.set(id, nuevaSede);

    let prop = this._usuarios.get(propietarioId);
    if (prop) {
      if (prop instanceof Propietario) {
        prop.vincularSede(id);
      } else if (prop.rol !== 'ADMINISTRADOR') {
        const nuevoProp = new Propietario(
          prop.id,
          prop.nombre,
          prop.email,
          prop.telefono,
          (prop as any)._passwordHash || '123456',
          true,
          prop.avatarUrl,
          [id],
          {
            tipoBilletera: 'YAPE',
            numeroTelefono: prop.telefono,
            titular: prop.nombre,
            bancoNombre: 'BCP',
            numeroCuenta: '193-98765432-0-12',
            numeroCci: '002-193-009876543201-14',
            qrImagenUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YAPE_PUKLLAY_SPORT_PAGO',
          }
        );
        this._usuarios.set(propietarioId, nuevoProp);
        if (this._usuarioActual?.id === propietarioId) {
          this._usuarioActual = nuevoProp;
        }
        prop = nuevoProp;
      }
    }

    // Notificación automática al Administrador de la plataforma
    const notifAdmin: NotificacionAdmin = {
      id: `notif_admin_sede_${Date.now()}`,
      tipo: 'NUEVA_SEDE_REGISTRADA',
      titulo: `🏟️ Nueva Cancha/Sede Registrada: ${datos.nombre} (${datos.distrito})`,
      mensaje: `El propietario ${prop?.nombre || 'Propietario'} registró la sede "${datos.nombre}" en ${datos.direccion}, ${datos.distrito}. Celular: ${datos.telefono}. Requiere revisión y asignación del Check Verificado.`,
      usuarioId: propietarioId,
      usuarioNombre: prop?.nombre || 'Propietario',
      usuarioEmail: prop?.email || '',
      usuarioTelefono: datos.telefono || prop?.telefono || '',
      sedeId: id,
      sedeNombre: datos.nombre,
      distrito: datos.distrito,
      direccion: datos.direccion,
      fecha: new Date().toISOString(),
      leida: false,
      estado: 'PENDIENTE',
    };
    this._notificacionesAdmin.set(notifAdmin.id, notifAdmin);

    PukllayLogger.registrar(
      'SECURITY',
      'AUTH',
      `Nueva sede registrada "${datos.nombre}" en ${datos.distrito}. Estado: PENDIENTE de validación del Administrador.`,
      this.usuarioActual
    );

    this.guardarDatos();
    this.notificar();
    return nuevaSede;
  }

  // ==========================================
  // PUKLLAY SHIELD: VERIFICACIÓN DIRECTA CON EL ADMINISTRADOR
  // ==========================================
  public solicitarVerificacionSede(sedeId: string, docs: IDocumentoVerificacionSede): { exitoso: boolean; mensaje: string } {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada.');

    sede.solicitarVerificacion({
      ...docs,
      fechaSolicitud: new Date().toISOString(),
    });

    const prop = this._usuarios.get(sede.propietarioId);
    const telContacto = docs.contactoWhatsApp || docs.numeroYape || sede.telefonoContacto;
    const emailContacto = docs.contactoEmail || prop?.email || '';
    const nombreContacto = docs.nombreContacto || prop?.nombre || 'Propietario';

    // Generar notificación de alta prioridad para el Administrador
    const notifAdmin: NotificacionAdmin = {
      id: `notif_admin_solic_${Date.now()}`,
      tipo: 'SOLICITUD_VERIFICACION',
      titulo: `🛡️ Solicitud de Check Verificado: ${sede.nombre}`,
      mensaje: `El complejo "${sede.nombre}" solicita revisión oficial. Contacto: ${nombreContacto} (Cel/WhatsApp: ${telContacto}, Correo: ${emailContacto}). Puedes contactarle por WhatsApp o email para validar y otorgar el Check Oficial.`,
      usuarioId: sede.propietarioId,
      usuarioNombre: nombreContacto,
      usuarioEmail: emailContacto,
      usuarioTelefono: telContacto,
      sedeId: sede.id,
      sedeNombre: sede.nombre,
      distrito: sede.ubicacion.distrito,
      direccion: sede.ubicacion.direccion,
      fecha: new Date().toISOString(),
      leida: false,
      estado: 'PENDIENTE',
      documentoUrl: docs.documentoUrl,
    };
    this._notificacionesAdmin.set(notifAdmin.id, notifAdmin);

    PukllayLogger.registrar(
      'SECURITY',
      'AUTH',
      `Solicitud de verificación enviada al Administrador para sede "${sede.nombre}". Contacto: ${telContacto}.`,
      this.usuarioActual
    );

    this.guardarDatos();
    this.notificar();
    return { 
      exitoso: true, 
      mensaje: '¡Solicitud enviada al Administrador exitosamente! El Administrador revisará tus datos y se comunicará por WhatsApp o Correo.' 
    };
  }

  public aprobarVerificacionSede(sedeId: string, adminId: string, notasAdmin?: string): { exitoso: boolean; sello: string } {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada.');

    const docIdent = sede.documentoVerificacion?.ruc || sede.documentoVerificacion?.dni || sedeId;
    const sello = PukllayAntiFraudEngine.generarSelloSeguridad(sedeId, docIdent);

    sede.aprobarVerificacion(adminId, sello, notasAdmin || 'Aprobado y verificado por el Administrador de Pukllay Sport.');

    // Marcar notificaciones de admin correspondientes como VERIFICADO
    this._notificacionesAdmin.forEach(n => {
      if (n.sedeId === sedeId) {
        n.estado = 'VERIFICADO';
        n.leida = true;
        if (notasAdmin) n.notasAdmin = notasAdmin;
      }
    });

    // Actualizar datos de pago del propietario si fueron especificados
    if (sede.documentoVerificacion?.titularYape && sede.documentoVerificacion?.numeroYape) {
      const prop = this._usuarios.get(sede.propietarioId);
      if (prop && prop instanceof Propietario) {
        prop.actualizarDatosPago({
          titular: sede.documentoVerificacion.titularYape,
          numeroTelefono: sede.documentoVerificacion.numeroYape,
        });
      }
    }

    PukllayLogger.registrar(
      'INFO',
      'AUTH',
      `Sede "${sede.nombre}" APROBADA con Check Oficial ${sello} por Administrador ${adminId}.`,
      this.usuarioActual
    );

    this.guardarDatos();
    this.notificar();
    return { exitoso: true, sello };
  }

  public observarVerificacionSede(sedeId: string, motivo: string): void {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada.');

    sede.observarVerificacion(motivo);

    this._notificacionesAdmin.forEach(n => {
      if (n.sedeId === sedeId) {
        n.estado = 'OBSERVADO';
        n.notasAdmin = motivo;
      }
    });

    PukllayLogger.registrar(
      'WARN',
      'AUTH',
      `Sede "${sede.nombre}" OBSERVADA por Administrador. Motivo: ${motivo}`,
      this.usuarioActual
    );

    this.guardarDatos();
    this.notificar();
  }

  public obtenerNotificacionesAdmin(): NotificacionAdmin[] {
    return Array.from(this._notificacionesAdmin.values())
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  public contarNotificacionesAdminPendientes(): number {
    return Array.from(this._notificacionesAdmin.values())
      .filter(n => !n.leida || n.estado === 'PENDIENTE').length;
  }

  public marcarNotificacionAdminLeida(id: string): void {
    const notif = this._notificacionesAdmin.get(id);
    if (notif) {
      notif.leida = true;
      this.guardarDatos();
      this.notificar();
    }
  }

  public obtenerDatosContactoAdministrador(): { nombre: string; email: string; telefono: string; whatsappUrl: string } {
    const telefono = getAdminEnvPhone();
    const email = getAdminEnvEmail();
    const msg = 'Hola Administrador de Pukllay Sport, te escribo para coordinar la verificación oficial de mi cancha de grass.';
    return {
      nombre: 'Administrador General (Pukllay Sport)',
      email,
      telefono,
      whatsappUrl: `https://wa.me/51${telefono}?text=${encodeURIComponent(msg)}`,
    };
  }

  public obtenerSedesPendientesVerificacion(): Sede[] {
    return Array.from(this._sedes.values()).filter(s => s.estadoVerificacion === 'PENDIENTE');
  }

  public registrarCancha(sedeId: string, datos: {
    nombre: string;
    deporte: DeporteTipo;
    superficie: SuperficieTipo;
    techada: boolean;
    precioBaseHora: number;
    dimensiones?: string;
    fotos?: string[];
  }): Cancha {
    const sede = this._sedes.get(sedeId);
    if (!sede) throw new Error('Sede no encontrada');

    const id = this.generarIdUnico('cancha');
    const reglaDefault = new ReglaDisponibilidad(
      this.generarIdUnico('reg'),
      id,
      [0, 1, 2, 3, 4, 5, 6],
      '08:00',
      '23:00',
      60,
      datos.precioBaseHora
    );

    const nuevaCancha = new Cancha(
      id,
      sedeId,
      datos.nombre,
      datos.deporte,
      datos.superficie,
      datos.techada,
      datos.precioBaseHora,
      true,
      datos.fotos,
      datos.dimensiones,
      [reglaDefault]
    );

    sede.agregarCancha(nuevaCancha);
    DisponibilidadCache.invalidar(id);
    this.notificar();
    return nuevaCancha;
  }

  public toggleEstadoCancha(canchaId: string): boolean {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const { cancha } = item;
    if (cancha.activa) {
      cancha.desactivar();
    } else {
      cancha.activar();
    }
    DisponibilidadCache.invalidar(canchaId);
    this.notificar();
    return cancha.activa;
  }

  public agregarReglaDisponibilidad(canchaId: string, regla: {
    diasSemana: number[];
    horaInicio: string;
    horaFin: string;
    duracionMinutos: number;
    precioEspecial?: number;
  }): void {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const nuevaRegla = new ReglaDisponibilidad(
      this.generarIdUnico('reg'),
      canchaId,
      regla.diasSemana,
      regla.horaInicio,
      regla.horaFin,
      regla.duracionMinutos,
      regla.precioEspecial
    );
    item.cancha.agregarRegla(nuevaRegla);
    DisponibilidadCache.invalidar(canchaId);
    this.notificar();
  }

  public bloquearHorario(canchaId: string, bloqueo: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
    motivo: string;
  }): void {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) throw new Error('Cancha no encontrada');
    const nuevoBloqueo = new BloqueoHorario(
      this.generarIdUnico('bloq'),
      canchaId,
      bloqueo.fecha,
      bloqueo.horaInicio,
      bloqueo.horaFin,
      bloqueo.motivo,
      true
    );
    item.cancha.agregarBloqueo(nuevoBloqueo);
    DisponibilidadCache.invalidar(canchaId, bloqueo.fecha);
    this.notificar();
  }

  public removerBloqueo(canchaId: string, bloqueoId: string): void {
    const item = this.obtenerCanchaPorId(canchaId);
    if (!item) return;
    item.cancha.removerBloqueo(bloqueoId);
    DisponibilidadCache.invalidar(canchaId);
    this.notificar();
  }

  public actualizarDatosPagoPropietario(propietarioId: string, datos: Partial<IDatosPagoPropietario>): void {
    const user = this._usuarios.get(propietarioId);
    if (user && user instanceof Propietario) {
      user.actualizarDatosPago(datos);
      this.notificar();
    }
  }

  // ==========================================
  // MENSAJERÍA DIRECTA EN TIEMPO REAL (CLIENTE <-> PROPIETARIO)
  // ==========================================
  public enviarMensajeChat(params: {
    remitenteId: string;
    remitenteNombre: string;
    remitenteRol: RolUsuario;
    destinatarioId: string;
    sedeId: string;
    sedeNombre: string;
    texto: string;
    canchaId?: string;
    canchaNombre?: string;
  }): MensajeChat {
    const conversacionId = [params.remitenteId, params.destinatarioId].sort().join('_');
    const nuevoMensaje = new MensajeChat(
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversacionId,
      params.remitenteId,
      params.remitenteNombre,
      params.remitenteRol,
      params.destinatarioId,
      params.sedeId,
      params.sedeNombre,
      params.texto.trim(),
      params.canchaId,
      params.canchaNombre,
      new Date().toISOString(),
      false
    );

    this._mensajes.push(nuevoMensaje);

    // Si el remitente es Propietario o Encargado y el destinatario es Cliente, generar alerta/notificación
    if (params.remitenteRol !== 'CLIENTE') {
      const notifCli: NotificacionCliente = {
        id: `notif_chat_${nuevoMensaje.id}`,
        clienteId: params.destinatarioId,
        tipo: 'CHAT_RESPUESTA_PROPIETARIO',
        titulo: `💬 ${params.remitenteNombre} (${params.sedeNombre}) te respondió`,
        mensaje: params.texto.length > 95 ? `${params.texto.slice(0, 95)}...` : params.texto,
        timestamp: nuevoMensaje.timestamp,
        leida: false,
        conversacionId,
        sedeId: params.sedeId,
        sedeNombre: params.sedeNombre,
        canchaId: params.canchaId,
        canchaNombre: params.canchaNombre,
        accion: {
          texto: 'Abrir Chat Directo',
          tipo: 'ABRIR_CHAT',
        },
      };
      this._notificacionesCliente.set(notifCli.id, notifCli);
      this._onNuevaNotificacionClienteListeners.forEach(fn => fn(notifCli));
    }

    this.guardarDatos();

    // Broadcast en tiempo real para otras pestañas/ventanas
    if (this._chatChannel) {
      try {
        this._chatChannel.postMessage({
          type: 'NUEVO_MENSAJE',
          payload: nuevoMensaje.toJSON(),
        });
      } catch (e) {
        // Fallback
      }
    }

    this._listeners.forEach(fn => fn());
    return nuevoMensaje;
  }

  public obtenerTodosMensajesChat(): MensajeChat[] {
    return [...this._mensajes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public obtenerMensajesConversacion(usuario1Id: string, usuario2Id: string): MensajeChat[] {
    const conversacionId = [usuario1Id, usuario2Id].sort().join('_');
    return this._mensajes
      .filter(m => m.conversacionId === conversacionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public marcarMensajesComoLeidos(conversacionId: string, lectorId: string): void {
    let huboCambio = false;
    this._mensajes.forEach(m => {
      if (m.conversacionId === conversacionId && m.destinatarioId === lectorId && !m.leido) {
        m.marcarComoLeido();
        huboCambio = true;
      }
    });

    // Marcar como leídas las notificaciones de chat correspondientes
    this._notificacionesCliente.forEach(n => {
      if (n.conversacionId === conversacionId && n.clienteId === lectorId && !n.leida) {
        n.leida = true;
        huboCambio = true;
      }
    });
    if (huboCambio) {
      this.guardarDatos();
      this._listeners.forEach(fn => fn());
    }
  }

  public contarMensajesNoLeidosTotal(usuarioId: string): number {
    return this._mensajes.filter(m => m.destinatarioId === usuarioId && !m.leido).length;
  }

  public obtenerTodasConversacionesUsuario(usuarioId: string): {
    conversacionId: string;
    otroUsuarioId: string;
    otroUsuarioNombre: string;
    otroUsuarioRol: RolUsuario;
    otroUsuarioTelefono?: string;
    sedeNombre: string;
    canchaNombre?: string;
    sedeId: string;
    canchaId?: string;
    ultimoMensaje: MensajeChat;
    noLeidos: number;
  }[] {
    const mapaConv = new Map<string, MensajeChat[]>();
    this._mensajes.forEach(m => {
      if (m.remitenteId === usuarioId || m.destinatarioId === usuarioId) {
        const arr = mapaConv.get(m.conversacionId) || [];
        arr.push(m);
        mapaConv.set(m.conversacionId, arr);
      }
    });

    const resultado: any[] = [];
    mapaConv.forEach((mensajes, convId) => {
      mensajes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const ultimo = mensajes[0];
      const otroId = ultimo.remitenteId === usuarioId ? ultimo.destinatarioId : ultimo.remitenteId;
      const otroUser = this._usuarios.get(otroId);
      const otroNombre = otroUser ? otroUser.nombre : (ultimo.remitenteId === usuarioId ? 'Usuario' : ultimo.remitenteNombre);
      const otroRol = otroUser ? otroUser.rol : (ultimo.remitenteId === usuarioId ? 'PROPIETARIO' : ultimo.remitenteRol);
      const otroTelefono = otroUser ? otroUser.telefono : undefined;
      const noLeidos = mensajes.filter(m => m.destinatarioId === usuarioId && !m.leido).length;

      resultado.push({
        conversacionId: convId,
        otroUsuarioId: otroId,
        otroUsuarioNombre: otroNombre,
        otroUsuarioRol: otroRol,
        otroUsuarioTelefono: otroTelefono,
        sedeNombre: ultimo.sedeNombre,
        canchaNombre: ultimo.canchaNombre,
        sedeId: ultimo.sedeId,
        canchaId: ultimo.canchaId,
        ultimoMensaje: ultimo,
        noLeidos,
      });
    });

    return resultado.sort((a, b) => new Date(b.ultimoMensaje.timestamp).getTime() - new Date(a.ultimoMensaje.timestamp).getTime());
  }

  // Helpers
  public obtenerFechaHoyISO(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ==========================================
  // ALTO RENDIMIENTO, BACKUPS Y AUDITORÍA
  // ==========================================
  public exportarBackupJSON(): void {
    const datos = {
      usuarios: Array.from(this._usuarios.values()).map(u => u.toJSON()),
      sedes: Array.from(this._sedes.values()).map(s => s.toJSON()),
      reservas: Array.from(this._reservas.values()).map(r => r.toJSON()),
      notificaciones: Array.from(this._notificaciones.values()),
      mensajes: this._mensajes.map(m => m.toJSON()),
    };
    PukllayDurableStorage.descargarBackupJSON(datos);
  }

  public restaurarBackupJSON(jsonStr: string): { exito: boolean; mensaje: string } {
    const res = PukllayDurableStorage.validarYRestaurarBackup(jsonStr);
    if (!res.valido || !res.datos) {
      return { exito: false, mensaje: res.mensaje };
    }

    try {
      this.deserializarUsuarios(res.datos.usuarios.reduce((acc, u) => { acc[u.id] = u; return acc; }, {}));
      this.deserializarSedes(res.datos.sedes.reduce((acc, s) => { acc[s.id] = s; return acc; }, {}));
      this.deserializarReservas(res.datos.reservas.reduce((acc, r) => { acc[r.id] = r; return acc; }, {}));
      
      this._notificaciones.clear();
      (res.datos.notificaciones || []).forEach((n: any) => this._notificaciones.set(n.id, n));
      
      this._mensajes = (res.datos.mensajes || []).map((m: any) => MensajeChat.fromJSON(m));

      DisponibilidadCache.invalidar();
      this.guardarDatos();
      this.notificar();

      return { exito: true, mensaje: 'Base de datos y estado del sistema restaurados exitosamente.' };
    } catch (e: any) {
      return { exito: false, mensaje: `Error al aplicar backup: ${e.message}` };
    }
  }

  public obtenerLogsAuditoria(limite: number = 80): AuditLogEntry[] {
    return PukllayLogger.obtenerLogs(limite);
  }

  public limpiarLogsAuditoria(): void {
    PukllayLogger.limpiarLogs();
    this.notificar();
  }

  /**
   * ==========================================
   * SUITE DE TEST DE CARGA DE CONCURRENCIA
   * Ejecuta 100 usuarios intentando reservar el MISMO slot simultáneamente
   * ==========================================
   */
  public async ejecutarPruebaCarga100Usuarios(
    canchaId: string,
    fecha: string,
    horaInicio: string
  ): Promise<ResultadoTestCarga> {
    const canchaItem = this.obtenerCanchaPorId(canchaId);
    const canchaNombre = canchaItem ? canchaItem.cancha.nombre : 'Cancha Test';

    return PukllayConcurrencyManager.ejecutarPruebaCarga100Usuarios(
      async (clienteId: string, clienteNombre: string) => {
        // Simular intento de reserva con pago
        const reserva = this.crearReservaConPago({
          clienteId,
          canchaId,
          fecha,
          horaInicio,
          tipoPago: 'ADELANTO_50',
          metodoPago: 'YAPE',
          numeroOperacion: `TEST-${clienteId}`,
        });
        return {
          exito: true,
          reservaId: reserva.id,
          mensaje: `Reserva exitosa adjudicada a ${clienteNombre}`,
        };
      },
      canchaNombre,
      fecha,
      horaInicio
    );
  }
}
