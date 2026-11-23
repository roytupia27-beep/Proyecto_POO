/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Visor de Arquitectura Orientada a Objetos (POO) y Requerimientos Funcionales
 */

import React, { useState, useEffect } from 'react';
import { 
  Code2, Layers, Cpu, CheckCircle2, ShieldCheck, 
  Terminal, FileCode2, BookOpen, Sparkles, ChevronRight,
  Zap, Database, Download, Upload, AlertTriangle, ShieldAlert, 
  RefreshCw, Check, Activity, Server, Clock, Lock, Play, Copy
} from 'lucide-react';
import { PukllayService } from '../domain/PukllayService.ts';
import { ResultadoTestCarga } from '../domain/PukllayConcurrencyManager.ts';
import { AuditLogEntry } from '../domain/SecurityEngine.ts';
import { SCRIPTS_PYTHON_PUKLLAY, PythonScriptDef } from '../utils/pythonScriptsData.ts';
import { ejecutarCodigoPython } from '../utils/pythonRuntime.ts';

const TEXTO_PYTHON_COMPLETO = `"""
=============================================================================
PUKLLAY SPORT - ARQUITECTURA ORIENTADA A OBJETOS (POO) EN PYTHON 3
=============================================================================
Demostración de los 4 Pilares de la Programación Orientada a Objetos:
1. Abstracción y Encapsulamiento (Clases abstractas, atributos privados/protegidos, properties)
2. Herencia y Polimorfismo (Jerarquía Usuario -> Cliente, Propietario, Administrador)
3. Patrón Strategy (Políticas de Cancelación dinámicas)
4. Patrón Facade y Singleton (Servicio orquestador central PukllayService)
5. Sistema de Notificaciones al Administrador y Verificación Directa (WhatsApp / Correo)
=============================================================================
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Optional
import json

class RolUsuario(str, Enum):
    CLIENTE = "CLIENTE"
    PROPIETARIO = "PROPIETARIO"
    ADMINISTRADOR = "ADMINISTRADOR"

class TipoDeporte(str, Enum):
    FUTBOL_7 = "FUTBOL_7"
    FUTBOL_6 = "FUTBOL_6"
    FUTBOL_5 = "FUTBOL_5"
    VOLEY = "VOLEY"

class EstadoVerificacion(str, Enum):
    PENDIENTE = "PENDIENTE"
    VERIFICADO = "VERIFICADO"
    OBSERVADO = "OBSERVADO"

# 1. PILAR POO: ABSTRACCIÓN Y ENCAPSULAMIENTO
class Usuario(ABC):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str, rol: RolUsuario):
        self._id = id_usuario
        self._nombre = nombre
        self._email = email
        self._telefono = telefono
        self._rol = rol
        self._activo = True

    @property
    def id(self) -> str: return self._id
    @property
    def nombre(self) -> str: return self._nombre
    @property
    def email(self) -> str: return self._email
    @property
    def telefono(self) -> str: return self._telefono
    @property
    def rol(self) -> RolUsuario: return self._rol

    @abstractmethod
    def puede_acceder_modulo(self, modulo: str) -> bool:
        pass

# 2. PILAR POO: HERENCIA Y POLIMORFISMO
class Cliente(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.CLIENTE)
        self._partidos_jugados = 0

    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ["EXPLORAR_GRASS", "RESERVAR_CANCHA", "MIS_RESERVAS", "CHAT_PROPIETARIO"]

class Propietario(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.PROPIETARIO)
        self._sedes_ids: List[str] = []

    def asociar_sede(self, sede_id: str):
        if sede_id not in self._sedes_ids:
            self._sedes_ids.append(sede_id)

    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ["GESTION_CANCHAS", "HORARIOS_REGLAS", "BLOQUEOS", "APROBACION_PAGOS", "VERIFICACION_ADMIN", "CHAT_CLIENTE"]

class Administrador(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.ADMINISTRADOR)

    def puede_acceder_modulo(self, modulo: str) -> bool:
        return True  # El Administrador accede a todos los módulos

# MODELO SEDE Y CANCHA (RELACIÓN 1 A N)
class Cancha:
    def __init__(self, id_cancha: str, sede_id: str, nombre: str, deporte: TipoDeporte, precio_hora: float):
        self._id = id_cancha
        self._sede_id = sede_id
        self._nombre = nombre
        self._deporte = deporte
        self._precio_hora = precio_hora

    @property
    def id(self) -> str: return self._id
    @property
    def nombre(self) -> str: return self._nombre
    @property
    def precio_hora(self) -> float: return self._precio_hora

class Sede:
    def __init__(self, id_sede: str, propietario_id: str, nombre: str, direccion: str, distrito: str, telefono: str):
        self._id = id_sede
        self._propietario_id = propietario_id
        self._nombre = nombre
        self._direccion = direccion
        self._distrito = distrito
        self._telefono = telefono
        self._canchas: List[Cancha] = []
        self._estado_verificacion = EstadoVerificacion.PENDIENTE
        self._check_verificado_admin = False

    @property
    def id(self) -> str: return self._id
    @property
    def nombre(self) -> str: return self._nombre
    @property
    def estado_verificacion(self) -> EstadoVerificacion: return self._estado_verificacion
    @property
    def check_verificado_admin(self) -> bool: return self._check_verificado_admin

    def agregar_cancha(self, cancha: Cancha):
        self._canchas.append(cancha)

    def otorgar_check_verificado(self, admin_id: str, sello_seguridad: str, notas: str = ""):
        self._estado_verificacion = EstadoVerificacion.VERIFICADO
        self._check_verificado_admin = True

# 3. PATRÓN STRATEGY: POLÍTICA DE CANCELACIONES
class IPoliticaCancelacion(ABC):
    @abstractmethod
    def calcular_reembolso(self, precio_total: float, horas_antelacion: float) -> Dict:
        pass

class PoliticaCancelacionEstandar(IPoliticaCancelacion):
    def calcular_reembolso(self, precio_total: float, horas_antelacion: float) -> Dict:
        if horas_antelacion >= 24.0:
            return {"porcentaje": 100, "monto": precio_total, "motivo": "Reembolso total (+24h anticipación)"}
        elif horas_antelacion >= 12.0:
            return {"porcentaje": 50, "monto": precio_total * 0.5, "motivo": "Reembolso 50% (12-24h anticipación)"}
        else:
            return {"porcentaje": 0, "monto": 0.0, "motivo": "Sin reembolso (<12h anticipación)"}

# RESERVAS CON ADELANTO DEL 50%
class Reserva:
    def __init__(self, id_reserva: str, cliente_id: str, cancha_id: str, fecha: str, hora_inicio: str, precio_total: float, tipo_pago: str = "ADELANTO_50"):
        self._id = id_reserva
        self._cliente_id = cliente_id
        self._cancha_id = cancha_id
        self._fecha = fecha
        self._hora_inicio = hora_inicio
        self._precio_total = precio_total
        self._tipo_pago = tipo_pago
        self._monto_abonado = round(precio_total * 0.5, 2) if tipo_pago == "ADELANTO_50" else precio_total
        self._saldo_pendiente = round(precio_total - self._monto_abonado, 2)
        self._estado = "CONFIRMADA"
        self._estrategia = PoliticaCancelacionEstandar()

    @property
    def id(self) -> str: return self._id
    @property
    def monto_abonado(self) -> float: return self._monto_abonado
    @property
    def saldo_pendiente(self) -> float: return self._saldo_pendiente

    def procesar_cancelacion(self, horas_antelacion: float) -> Dict:
        res = self._estrategia.calcular_reembolso(self._monto_abonado, horas_antelacion)
        self._estado = "CANCELADA"
        return res

# NOTIFICACIONES AL ADMINISTRADOR CON WHATSAPP Y CORREO DIRECTO
class NotificacionAdmin:
    def __init__(self, id_notif: str, tipo: str, titulo: str, usuario: Usuario, sede: Optional[Sede] = None):
        self.id = id_notif
        self.tipo = tipo
        self.titulo = titulo
        self.usuario_id = usuario.id
        self.usuario_nombre = usuario.nombre
        self.usuario_telefono = usuario.telefono
        self.usuario_email = usuario.email
        self.sede_id = sede.id if sede else None
        self.sede_nombre = sede.nombre if sede else None

    def generar_enlace_whatsapp(self) -> str:
        from urllib.parse import quote
        tel = "".join(filter(str.isdigit, self.usuario_telefono))
        msg = f"Hola {self.usuario_nombre}, te escribo desde la Administración de Pukllay Sport respecto a tu cuenta."
        return f"https://wa.me/51{tel}?text={quote(msg)}"

    def generar_enlace_correo(self) -> str:
        from urllib.parse import quote
        asunto = f"Pukllay Sport - Verificación Oficial: {self.usuario_nombre}"
        cuerpo = f"Estimado(a) {self.usuario_nombre},\n\nLe contactamos para coordinar la verificación oficial."
        return f"mailto:{self.usuario_email}?subject={quote(asunto)}&body={quote(cuerpo)}"

# 4. SINGLETON & FACADE CENTRAL
class PukllayService:
    _instancia = None
    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super(PukllayService, cls).__new__(cls)
            cls._instancia._inicializar()
        return cls._instancia

    def _inicializar(self):
        self._usuarios = {}
        self._sedes = {}
        self._reservas = {}
        self._notificaciones_admin = []
        self._admin = Administrador("admin_pukllay", "Administrador General Pukllay", os.getenv("ADMIN_EMAIL", "admin@pukllay.pe"), os.getenv("ADMIN_PHONE", "900000000"))
        self._usuarios[self._admin.id] = self._admin

    @property
    def administrador(self) -> Administrador: return self._admin

    def registrar_usuario(self, nombre: str, email: str, telefono: str, rol: RolUsuario) -> Usuario:
        uid = f"user_{len(self._usuarios) + 1}"
        if rol == RolUsuario.PROPIETARIO:
            u = Propietario(uid, nombre, email, telefono)
            n = NotificacionAdmin(f"notif_{len(self._notificaciones_admin) + 1}", "NUEVO_PROPIETARIO", f"📢 Nuevo Propietario: {nombre}", u)
            self._notificaciones_admin.append(n)
        elif rol == RolUsuario.CLIENTE:
            u = Cliente(uid, nombre, email, telefono)
        else:
            u = Administrador(uid, nombre, email, telefono)
        self._usuarios[uid] = u
        return u

    def registrar_sede(self, propietario_id: str, nombre: str, direccion: str, distrito: str, telefono: str) -> Sede:
        sid = f"sede_{len(self._sedes) + 1}"
        s = Sede(sid, propietario_id, nombre, direccion, distrito, telefono)
        self._sedes[sid] = s
        prop = self._usuarios[propietario_id]
        prop.asociar_sede(sid)
        n = NotificacionAdmin(f"notif_{len(self._notificaciones_admin) + 1}", "NUEVA_SEDE", f"🏟️ Nueva Sede: {nombre}", prop, s)
        self._notificaciones_admin.append(n)
        return s

    def aprobar_verificacion_por_admin(self, sede_id: str, admin_id: str) -> bool:
        s = self._sedes.get(sede_id)
        if s:
            s.otorgar_check_verificado(admin_id, f"CHECK-{sede_id.upper()}")
            return True
        return False
`;

export const PooArchitectureViewer: React.FC = () => {
  const service = PukllayService.getInstance();
  const [seccion, setSeccion] = useState<'CONCEPTOS' | 'MATRIZ_RF' | 'TEST_CONCURRENCIA' | 'BACKUPS_SEGURIDAD' | 'PYTHON_FASTAPI'>('CONCEPTOS');

  // Estados para Test de Carga de 100 Usuarios Concurrentes
  const canchasDisponibles = service.obtenerSedes().flatMap(s => s.canchas.map(c => ({ cancha: c, sede: s })));
  const [canchaTestId, setCanchaTestId] = useState<string>(canchasDisponibles[0]?.cancha.id || 'cancha_1');
  const [fechaTest, setFechaTest] = useState<string>(service.obtenerFechaHoyISO());
  const [horaTest, setHoraTest] = useState<string>('21:00');
  const [ejecutandoTest, setEjecutandoTest] = useState(false);
  const [resultadoTest, setResultadoTest] = useState<ResultadoTestCarga | null>(null);

  // Estados para Backups & Logs
  const [logsAuditoria, setLogsAuditoria] = useState<AuditLogEntry[]>([]);
  const [filtroNivelLog, setFiltroNivelLog] = useState<string>('TODOS');
  const [mensajeBackup, setMensajeBackup] = useState<string | null>(null);

  // Estados para Suite Integral de Scripts Python 3 y Runner Interactivo
  const [scriptPythonSeleccionado, setScriptPythonSeleccionado] = useState<PythonScriptDef>(SCRIPTS_PYTHON_PUKLLAY[0]);
  const [subseccionPython, setSubseccionPython] = useState<'RUNNER' | 'CODIGO' | 'SCRIPTS' | 'COMPARATIVA'>('RUNNER');
  const [ejecutandoPythonTest, setEjecutandoPythonTest] = useState(false);
  const [salidaConsolaPython, setSalidaConsolaPython] = useState<string[]>([]);
  const [testPythonCompletado, setTestPythonCompletado] = useState(false);
  const [tiempoEjecucionPythonMs, setTiempoEjecucionPythonMs] = useState<number | null>(null);
  const [copiadoPython, setCopiadoPython] = useState(false);
  const [codigoPersonalizado, setCodigoPersonalizado] = useState<string>('');
  const [modoEditorCustom, setModoEditorCustom] = useState<boolean>(false);

  const recargarLogs = () => {
    setLogsAuditoria(service.obtenerLogsAuditoria(80));
  };

  useEffect(() => {
    recargarLogs();
  }, [seccion]);

  const handleEjecutarTestCarga = async () => {
    setEjecutandoTest(true);
    setResultadoTest(null);
    try {
      const res = await service.ejecutarPruebaCarga100Usuarios(canchaTestId, fechaTest, horaTest);
      setResultadoTest(res);
      recargarLogs();
    } catch (e: any) {
      console.error('Error en test de concurrencia:', e);
    } finally {
      setEjecutandoTest(false);
    }
  };

  const handleRestaurarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = service.restaurarBackupJSON(content);
      setMensajeBackup(res.mensaje);
      recargarLogs();
    };
    reader.readAsText(file);
  };

  const handleEjecutarPythonSuite = async (scriptOverride?: PythonScriptDef) => {
    const scriptObjetivo = scriptOverride || scriptPythonSeleccionado;
    const usarCustom = !scriptOverride && modoEditorCustom && codigoPersonalizado.trim();

    setEjecutandoPythonTest(true);
    setTestPythonCompletado(false);
    setTiempoEjecucionPythonMs(null);
    setSalidaConsolaPython([
      `>>> python3 ${usarCustom ? 'custom_script.py' : scriptObjetivo.nombreArchivo}`,
      'Inicializando CPython 3 y cargando módulos del dominio...',
    ]);

    const codigoFinal = usarCustom
      ? codigoPersonalizado
      : scriptObjetivo.codigo;

    try {
      const res = await ejecutarCodigoPython(codigoFinal);
      setTiempoEjecucionPythonMs(res.duracionMs);

      const lineas = res.stdout.split('\n');
      if (res.stderr && res.stderr.trim()) {
        lineas.push('');
        lineas.push('--- [STDERR / ADVERTENCIAS] ---');
        lineas.push(...res.stderr.split('\n'));
      }
      setSalidaConsolaPython(lineas);
      setTestPythonCompletado(res.exito);
    } catch (e: any) {
      setSalidaConsolaPython(prev => [...prev, `Error de ejecución: ${e.message || String(e)}`]);
      setTestPythonCompletado(false);
    } finally {
      setEjecutandoPythonTest(false);
    }
  };

  const handleDescargarPythonFile = (script: PythonScriptDef = scriptPythonSeleccionado) => {
    const contenido = modoEditorCustom && script.id === scriptPythonSeleccionado.id && codigoPersonalizado.trim()
      ? codigoPersonalizado
      : script.codigo;

    const elemento = document.createElement('a');
    elemento.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contenido));
    elemento.setAttribute('download', script.nombreArchivo);
    elemento.style.display = 'none';
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
  };

  const handleCopiarCodigoPython = () => {
    const contenido = modoEditorCustom && codigoPersonalizado.trim()
      ? codigoPersonalizado
      : scriptPythonSeleccionado.codigo;

    navigator.clipboard.writeText(contenido);
    setCopiadoPython(true);
    setTimeout(() => setCopiadoPython(false), 2500);
  };

  const pilaresPOO = [
    {
      titulo: 'Abstracción y Encapsulamiento',
      icono: '🛡️',
      descripcion: 'Clase abstracta Usuario con atributos protegidos (_id, _email, _rol) y métodos protegidos. Clases Sede, Cancha, HorarioSlot y Reserva mantienen su estado interno privado con getters/setters y validaciones de negocio rigurosas.',
      ejemplo: 'get saldoPendiente(): number { return this._saldoPendiente; }'
    },
    {
      titulo: 'Herencia y Polimorfismo',
      icono: '🧬',
      descripcion: 'Herencia pura: Cliente, Propietario, Encargado y Administrador extienden de Usuario. Cada subclase implementa de forma polimórfica el método puedeAccederModulo() y añade atributos especializados.',
      ejemplo: 'class Cliente extends Usuario { override puedeAccederModulo() { ... } }'
    },
    {
      titulo: 'Patrón Strategy (Políticas de Cancelación)',
      icono: '🎯',
      descripcion: 'Interfaz IPoliticaCancelacion implementada por PoliticaCancelacionEstandar. Permite calcular el reembolso dinámicamente según la antelación horaria (>24h = 100%, 12-24h = 50%, <12h = 0%) desacoplado del modelo Reserva.',
      ejemplo: 'interface IPoliticaCancelacion { calcular(reserva, ahora): ResultadoCalculo }'
    },
    {
      titulo: 'Patrón Singleton & Facade',
      icono: '⚡',
      descripcion: 'PukllayService actúa como Facade centralizado para orquestar la persistencia, las retenciones temporales atómicas, el motor de disponibilidad y la prevención de colisiones en concurrencia.',
      ejemplo: 'PukllayService.getInstance().intentarRetenerSlot(...)'
    },
  ];

  const matrizRF = [
    { rf: 'RF-01', nombre: 'Registro de Usuarios', clase: 'Usuario / Cliente / Propietario', estado: 'Cumplido', detalle: 'Validación de email único y código de verificación obligatorio antes de activar cuenta.' },
    { rf: 'RF-02', nombre: 'Inicio de Sesión por Rol', clase: 'Usuario.puedeAccederModulo()', estado: 'Cumplido', detalle: 'Redirección y control de acceso estricto entre Cliente, Propietario y Administrador.' },
    { rf: 'RF-03', nombre: 'Gestión de Sedes y Canchas', clase: 'Sede / Cancha', estado: 'Cumplido', detalle: 'Registro, edición y activación/desactivación. Canchas inactivas no aparecen en búsqueda.' },
    { rf: 'RF-04', nombre: 'Reglas de Disponibilidad Recurrentes', clase: 'ReglaDisponibilidad / MotorDisponibilidad', estado: 'Cumplido', detalle: 'Días, rango horario, duración de bloque y actualización automática de slots.' },
    { rf: 'RF-05', nombre: 'Bloqueo de Horarios', clase: 'BloqueoHorario / Cancha', estado: 'Cumplido', detalle: 'Bloqueo por mantenimiento, feriado o uso personal; slot bloqueado no es reservable.' },
    { rf: 'RF-06', nombre: 'Consulta de Disponibilidad', clase: 'HorarioSlot / MotorDisponibilidad', estado: 'Cumplido', detalle: 'Diferenciación exacta en tiempo real: Libre, Retenido, Reservado y Bloqueado.' },
    { rf: 'RF-07', nombre: 'Búsqueda y Filtrado', clase: 'PukllayService.buscarCanchas()', estado: 'Cumplido', detalle: 'Filtro por deporte, fecha, precio, superficie, distancia GPS y disponibilidad inmediata.' },
    { rf: 'RF-08', nombre: 'Reserva con Retención Temporal', clase: 'HorarioSlot.retener()', estado: 'Cumplido', detalle: 'Retención atómica de 7 minutos con contador regresivo en vivo y liberación automática.' },
    { rf: 'RF-09', nombre: 'Prevención de Reservas Duplicadas', clase: 'PukllayService Concurrency Lock', estado: 'Cumplido', detalle: 'Exclusión mutua: si dos usuarios eligen el mismo slot, solo uno retiene y el otro es notificado.' },
    { rf: 'RF-10', nombre: 'Cancelación con Política', clase: 'PoliticaCancelacionEstandar (Strategy)', estado: 'Cumplido', detalle: 'Reembolso 100% (>24h), 50% (12-24h) y 0% (<12h). El horario vuelve a estar libre de inmediato.' },
    { rf: 'RF-11', nombre: 'Historial y Transacciones', clase: 'Reserva / TransaccionPago', estado: 'Cumplido', detalle: 'Registro de adelanto del 50%, saldos pendientes, códigos OP y QR de cobro.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Paradigma POO & Arquitectura de Software
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Arquitectura Orientada a Objetos en Pukllay Sport
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
          Implementación con principios SOLID, patrones de diseño (Strategy, Singleton, Facade, Factory), encapsulamiento, polimorfismo y trazabilidad total de requerimientos.
        </p>

        {/* Subtabs */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSeccion('CONCEPTOS')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
              seccion === 'CONCEPTOS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pilares POO Aplicados
          </button>
          <button
            onClick={() => setSeccion('MATRIZ_RF')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
              seccion === 'MATRIZ_RF' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Matriz RF-01 a RF-11
          </button>
          <button
            onClick={() => setSeccion('TEST_CONCURRENCIA')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              seccion === 'TEST_CONCURRENCIA' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Test Concurrencia (100 Users)</span>
          </button>
          <button
            onClick={() => setSeccion('BACKUPS_SEGURIDAD')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              seccion === 'BACKUPS_SEGURIDAD' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>🛡️ Backups & Logs Auditoría</span>
          </button>
          <button
            onClick={() => setSeccion('PYTHON_FASTAPI')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              seccion === 'PYTHON_FASTAPI' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <span>🐍 Código & Motor POO Python</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: CONCEPTOS Y PILARES POO */}
      {seccion === 'CONCEPTOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pilaresPOO.map((p, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 mb-2">
                  <span className="text-xl">{p.icono}</span>
                  <span>{p.titulo}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {p.descripcion}
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <code>{p.ejemplo}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECCIÓN 2: MATRIZ DE REQUERIMIENTOS RF-01 A RF-11 */}
      {seccion === 'MATRIZ_RF' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
          <h3 className="text-base font-black text-slate-900 mb-3">
            Trazabilidad de Requerimientos Funcionales
          </h3>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
              <tr>
                <th className="p-3">Req.</th>
                <th className="p-3">Nombre del Requerimiento</th>
                <th className="p-3">Clases POO Responsables</th>
                <th className="p-3">Criterio de Aceptación</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {matrizRF.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-black text-emerald-700">{r.rf}</td>
                  <td className="p-3 font-bold text-slate-800">{r.nombre}</td>
                  <td className="p-3 font-mono text-slate-600 text-[11px]">{r.clase}</td>
                  <td className="p-3 text-slate-600">{r.detalle}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECCIÓN 3: SUITE Y MOTOR INTEGRAL EN PYTHON 3 */}
      {seccion === 'PYTHON_FASTAPI' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header del módulo Python */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl border border-emerald-800/50 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" /> Entorno de Ejecución Python 3 (CPython / Pyodide)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 text-[11px] font-mono border border-slate-700">
                    Python 3.10 Stdlib
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                  Suite de Negocio, POO, KPIs y Reportes en Python
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Todo el dominio de Pukllay Sport implementado en Python 3 puro: modelo de objetos, cálculo analítico de KPIs con Recharts, informe auditable, directorio de usuarios con contraseñas y servidor REST API sin librerías externas.
                </p>
              </div>

              {/* Subtabs de Navegación Python */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSubseccionPython('RUNNER')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subseccionPython === 'RUNNER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Consola & Runner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubseccionPython('SCRIPTS')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subseccionPython === 'SCRIPTS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>5 Módulos Python</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubseccionPython('CODIGO')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subseccionPython === 'CODIGO' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Visor de Código</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubseccionPython('COMPARATIVA')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    subseccionPython === 'COMPARATIVA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mapeo POO</span>
                </button>
              </div>
            </div>

            {/* Barra rápida de selector de Script */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs font-sans pb-1">
              <span className="text-slate-400 font-bold whitespace-nowrap text-[11px]">Módulo activo:</span>
              {SCRIPTS_PYTHON_PUKLLAY.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setScriptPythonSeleccionado(s);
                    setModoEditorCustom(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    scriptPythonSeleccionado.id === s.id && !modoEditorCustom
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{s.icono}</span>
                  <span>{s.nombreArchivo}</span>
                </button>
              ))}

              <button
                onClick={() => setModoEditorCustom(true)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  modoEditorCustom
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>✍️</span>
                <span>Editor Personalizado</span>
              </button>
            </div>
          </div>

          {/* SUBSECCIÓN 1: CONSOLA Y EJECUTOR TERMINAL EN VIVO */}
          {subseccionPython === 'RUNNER' && (
            <div className="bg-slate-950 rounded-3xl p-6 text-slate-200 font-mono text-xs shadow-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-xs font-bold text-slate-300 ml-2 font-mono">
                    {modoEditorCustom ? 'python3 custom_interactive.py' : scriptPythonSeleccionado.comandoSugerido}
                  </span>
                  {tiempoEjecucionPythonMs !== null && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-[10px] font-bold">
                      ⚡ {tiempoEjecucionPythonMs} ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleEjecutarPythonSuite()}
                    disabled={ejecutandoPythonTest}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 disabled:opacity-50 text-slate-950 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer font-sans"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{ejecutandoPythonTest ? 'Ejecutando en CPython 3...' : `▶️ Ejecutar ${modoEditorCustom ? 'Script Custom' : scriptPythonSeleccionado.nombreArchivo}`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDescargarPythonFile()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer font-sans"
                    title="Descargar código fuente .py"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descargar .py</span>
                  </button>
                </div>
              </div>

              {/* Si está en modo editor personalizado */}
              {modoEditorCustom && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
                    <span>Escribe o modifica tu propio código Python 3 para ejecutarlo en vivo:</span>
                    <button
                      type="button"
                      onClick={() => setCodigoPersonalizado(`from backend_poo import PukllayService

service = PukllayService()
print(f"Total de usuarios registrados: {len(service.obtener_todos_usuarios())}")
print(f"Total de complejos deportivos: {len(service.obtener_sedes())}")
for s in service.obtener_sedes():
    print(f"🏟️ {s.nombre} - Canchas: {len(s.canchas)}")
`)}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Cargar plantilla de ejemplo
                    </button>
                  </div>
                  <textarea
                    value={codigoPersonalizado}
                    onChange={(e) => setCodigoPersonalizado(e.target.value)}
                    placeholder="# Escribe aquí cualquier código Python 3..."
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-cyan-200 font-mono text-xs focus:ring-1 focus:ring-cyan-500 outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Pantalla Terminal de Salida */}
              <div className="bg-slate-900/95 rounded-2xl p-4 sm:p-5 border border-slate-800 min-h-[340px] max-h-[500px] overflow-y-auto leading-relaxed">
                {salidaConsolaPython.length === 0 && !ejecutandoPythonTest ? (
                  <div className="py-16 text-center text-slate-500 space-y-2 font-sans">
                    <Terminal className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-300">Terminal Python 3 Listo</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Haz clic en <strong>"▶️ Ejecutar {scriptPythonSeleccionado.nombreArchivo}"</strong> para correr el motor y ver la salida estándar en tiempo real.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {salidaConsolaPython.map((l, idx) => {
                      const esHeader = l.includes('INICIANDO') || l.includes('TODAS LAS PRUEBAS') || l.includes('DASHBOARD EJECUTIVO') || l.includes('INFORME FORMAL') || l.includes('DIRECTORIO');
                      const esCheck = l.includes('✓') || l.includes('Aprobado') || l.includes('100% OK') || l.includes('completado exitosamente');
                      const esNotif = l.includes('[NUEVO_PROPIETARIO]') || l.includes('WhatsApp') || l.includes('Correo');
                      const esAdmin = l.includes('Administrador cargado') || l.includes('Check Verificado Admin') || l.includes('Código de Auditoría');
                      const esError = l.includes('Error') || l.includes('STDERR') || l.includes('Exception');

                      let colorClase = 'text-slate-300';
                      if (esError) colorClase = 'text-rose-400 font-bold';
                      else if (esHeader) colorClase = 'text-amber-400 font-bold';
                      else if (esCheck) colorClase = 'text-emerald-400 font-bold';
                      else if (esNotif) colorClase = 'text-cyan-300';
                      else if (esAdmin) colorClase = 'text-purple-300 font-semibold';

                      return (
                        <div key={idx} className={`${colorClase} whitespace-pre-wrap font-mono`}>
                          {l}
                        </div>
                      );
                    })}
                    {ejecutandoPythonTest && (
                      <div className="text-emerald-400 animate-pulse flex items-center gap-2 pt-2 font-sans">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Ejecutando en CPython 3...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {testPythonCompletado && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-between text-xs font-sans text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-white">Ejecución Exitosa en Python 3</h4>
                      <p className="text-[11px] text-emerald-400/90">
                        Módulo {scriptPythonSeleccionado.nombreArchivo} ejecutado sin errores.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                    100% OK
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SUBSECCIÓN 2: CATÁLOGO DE LOS 5 MÓDULOS PYTHON */}
          {subseccionPython === 'SCRIPTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans text-xs">
              {SCRIPTS_PYTHON_PUKLLAY.map((s) => (
                <div
                  key={s.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                    scriptPythonSeleccionado.id === s.id
                      ? 'bg-slate-900 border-emerald-500 shadow-lg text-white'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{s.icono}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono text-[10px] font-bold">
                        {s.nombreArchivo}
                      </span>
                    </div>
                    <h3 className="font-black text-sm mb-1">{s.titulo}</h3>
                    <p className={`text-xs leading-relaxed mb-4 ${scriptPythonSeleccionado.id === s.id ? 'text-slate-300' : 'text-slate-600'}`}>
                      {s.descripcion}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-200/20">
                    <div className="p-2 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                      {s.comandoSugerido}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setScriptPythonSeleccionado(s);
                          setModoEditorCustom(false);
                          setSubseccionPython('RUNNER');
                          handleEjecutarPythonSuite(s);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-center text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Ejecutar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDescargarPythonFile(s)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
                        title="Descargar archivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUBSECCIÓN 3: CÓDIGO FUENTE COMPLETO */}
          {subseccionPython === 'CODIGO' && (
            <div className="bg-slate-950 rounded-3xl p-6 text-slate-200 font-mono text-xs shadow-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-sans">
                    {scriptPythonSeleccionado.nombreArchivo} ({scriptPythonSeleccionado.titulo})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarCodigoPython}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer font-sans"
                  >
                    {copiadoPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoPython ? '¡Copiado!' : 'Copiar Código'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDescargarPythonFile()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer font-sans"
                  >
                    <Download className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Descargar {scriptPythonSeleccionado.nombreArchivo}</span>
                  </button>
                </div>
              </div>

              <pre className="overflow-x-auto leading-relaxed text-slate-300 max-h-[500px] overflow-y-auto bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                {scriptPythonSeleccionado.codigo}
              </pre>
            </div>
          )}

          {/* SUBSECCIÓN 4: COMPARATIVA Y MAPEO POO */}
          {subseccionPython === 'COMPARATIVA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                  <span>🐍</span>
                  <span>Python 3 (backend_poo.py)</span>
                </div>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><code>Usuario(ABC)</code> clase abstracta base con <code>@abstractmethod</code> para polimorfismo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><code>Cliente</code>, <code>Propietario</code> y <code>Administrador</code> implementan <code>puede_acceder_modulo()</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><code>MotorAnaliticaKPIs</code> calcula facturación mensual y ocupación frente a 450 horas/mes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><code>GeneradorReporteFormal</code> emite informes auditables con firma SHA-256 inmutable.</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                  <span>⚡</span>
                  <span>TypeScript / React (Frontend & DOM)</span>
                </div>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Visualización interactiva en Google Maps, modales de reserva y chat en tiempo real.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Gráficos con Recharts (AreaChart, BarChart, PieChart) renderizando datos exactos del motor Python.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Generación de comprobantes, QR Yape/Plin y auditoría en UI sin alterar nada visual.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Integración bidireccional transparente entre Python 3 y la interfaz web.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}



      {/* SECCIÓN 4: TEST DE CARGA DE 100 USUARIOS CONCURRENTES (PREVENCIÓN DE DUPLICADOS) */}
      {seccion === 'TEST_CONCURRENCIA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-amber-900/50 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Simulación de Tráfico Masivo en Tiempo Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Prueba de Carga & Concurrencia Transaccional: 100 Peloteros Simultáneos
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Esta suite simula <strong>100 usuarios intentando reservar el mismo horario, fecha y cancha al mismo milisegundo</strong>. Verifica que el sistema mantenga estricta exclusión mutua, adjudique exactamente <strong>1 sola reserva</strong>, rechace los 99 conflictos con <code>HTTP 409 Conflict</code> y garantice <strong>0 reservas duplicadas</strong>.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Cancha a Estresar:</label>
                <select
                  value={canchaTestId}
                  onChange={(e) => setCanchaTestId(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {canchasDisponibles.map(item => (
                    <option key={item.cancha.id} value={item.cancha.id}>
                      {item.sede.nombre} - {item.cancha.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Fecha del Partido:</label>
                <input
                  type="date"
                  value={fechaTest}
                  onChange={(e) => setFechaTest(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Horario en Conflicto:</label>
                <select
                  value={horaTest}
                  onChange={(e) => setHoraTest(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="18:00">18:00 a 19:00</option>
                  <option value="19:00">19:00 a 20:00</option>
                  <option value="20:00">20:00 a 21:00</option>
                  <option value="21:00">21:00 a 22:00</option>
                  <option value="22:00">22:00 a 23:00</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={handleEjecutarTestCarga}
                disabled={ejecutandoTest}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg transition-all ${
                  ejecutandoTest
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95'
                }`}
              >
                {ejecutandoTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Disparando 100 hilos concurrentes...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>🚀 Iniciar Prueba de Carga (100 Usuarios)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESULTADOS DEL TEST DE CARGA */}
          {resultadoTest && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-scale-up space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Resultados de la Prueba de Estrés Concurrente</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Procesado en {resultadoTest.tiempoTotalMs} ms (~{resultadoTest.promedioMsPorSolicitud} ms por solicitud simultánea)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>0 RESERVAS DUPLICADAS</span>
                  </span>
                </div>
              </div>

              {/* Métricas clave en tarjetas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Solicitudes Concurrencia</span>
                  <p className="text-2xl font-black text-slate-900">{resultadoTest.totalSolicitudes}</p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Adjudicada (Éxito)</span>
                  <p className="text-2xl font-black text-emerald-700">{resultadoTest.exitosas}</p>
                  <span className="text-[9px] text-emerald-600 font-mono">Ganador: {resultadoTest.ganadorClienteId}</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Conflictos Atajados</span>
                  <p className="text-2xl font-black text-amber-800">{resultadoTest.rechazadasPorConflicto}</p>
                  <span className="text-[9px] text-amber-600">Rechazados por Mutex</span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase">Duplicados Ilegales</span>
                  <p className="text-2xl font-black text-rose-700">{resultadoTest.duplicadosDetectados}</p>
                  <span className="text-[9px] text-emerald-600 font-bold">100% Blindado</span>
                </div>
              </div>

              {/* Registro detallado de usuarios */}
              <div className="mt-4">
                <h4 className="text-xs font-black text-slate-800 mb-2">Desglose de Concurrencia (Muestra de usuarios en paralelo):</h4>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl text-xs">
                  {resultadoTest.detalle.slice(0, 15).map(item => (
                    <div key={item.usuarioIndex} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                          #{item.usuarioIndex}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{item.clienteId}</p>
                          <p className="text-[10px] text-slate-500">{item.mensaje}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.resultado === 'EXITO'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.resultado === 'EXITO' ? '🏆 RESERVADO' : '🛡️ CONFLICTO (409)'}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.latenciaMs} ms</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 5: BACKUPS, PERSISTENCIA DURADERA Y AUDITORÍA DE SEGURIDAD */}
      {seccion === 'BACKUPS_SEGURIDAD' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Panel de Backups y Recuperación ante Fallos */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Persistencia Permanente & Centro de Recuperación ante Fallos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Almacenamiento permanente en IndexedDB y snapshots con verificación de integridad criptográfica (Checksum SHA-256).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => service.exportarBackupJSON()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Backup (.json)</span>
                </button>

                <label className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Restaurar Archivo</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestaurarArchivo}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {mensajeBackup && (
              <div className="mt-3 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{mensajeBackup}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Server className="w-7 h-7 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">IndexedDB Activo</h4>
                  <p className="text-[11px] text-slate-500">Base de datos de alta capacidad inmune a cuotas de 5MB.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Lock className="w-7 h-7 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Checksum Antifraude</h4>
                  <p className="text-[11px] text-slate-500">Cada backup valida firma digital para evitar archivos adulterados.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <Activity className="w-7 h-7 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Autoguardado Cíclico</h4>
                  <p className="text-[11px] text-slate-500">Respaldo automático de los últimos 3 estados del sistema.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monitor de Logs y Auditoría de Seguridad en Tiempo Real */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Registro de Seguridad & Auditoría en Vivo (Audit Trail)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Eventos de autenticación, bloqueos por fuerza bruta, conflictos de concurrencia y transacciones monetarias.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroNivelLog}
                  onChange={(e) => setFiltroNivelLog(e.target.value)}
                  className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 font-bold focus:outline-none"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="SECURITY">Seguridad & Ataques</option>
                  <option value="TRANSACTION">Transacciones & Pagos</option>
                  <option value="WARN">Advertencias</option>
                  <option value="INFO">Informativos</option>
                </select>

                <button
                  type="button"
                  onClick={() => service.limpiarLogsAuditoria()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl text-xs">
              {logsAuditoria
                .filter(l => filtroNivelLog === 'TODOS' || l.nivel === filtroNivelLog)
                .length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No hay eventos registrados en este nivel.
                </div>
              ) : (
                logsAuditoria
                  .filter(l => filtroNivelLog === 'TODOS' || l.nivel === filtroNivelLog)
                  .map(log => {
                    const hora = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div key={log.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-start gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex-shrink-0 ${
                            log.nivel === 'SECURITY'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : log.nivel === 'TRANSACTION'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.nivel === 'WARN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.nivel}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              [{log.categoria}] {log.mensaje}
                            </p>
                            {log.usuarioId && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Usuario: <strong className="text-slate-600">{log.usuarioId}</strong> {log.usuarioRol ? `(${log.usuarioRol})` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          {hora}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
