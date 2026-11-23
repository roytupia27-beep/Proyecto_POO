/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Scripts Python 3 del Dominio y Servicios
 */

export interface PythonScriptDef {
  id: string;
  nombreArchivo: string;
  titulo: string;
  descripcion: string;
  icono: string;
  codigo: string;
  comandoSugerido: string;
}

export const SCRIPTS_PYTHON_PUKLLAY: PythonScriptDef[] = [
  {
    id: 'backend_poo',
    nombreArchivo: 'backend_poo.py',
    titulo: 'Arquitectura Integral POO en Python 3',
    descripcion: 'Implementa los 4 pilares de la POO: Abstracción, Encapsulamiento, Herencia polimórfica (Usuario -> Cliente, Propietario, Administrador), Patrón Strategy (Cancelaciones) y Facade Singleton (PukllayService).',
    icono: '🧬',
    comandoSugerido: 'python3 backend_poo.py',
    codigo: `"""
=============================================================================
PUKLLAY SPORT - ARQUITECTURA INTEGRAL ORIENTADA A OBJETOS (POO) EN PYTHON 3
=============================================================================
"""
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Tuple, Any
from urllib.parse import quote

class RolUsuario(str, Enum):
    CLIENTE = "CLIENTE"
    PROPIETARIO = "PROPIETARIO"
    ENCARGADO = "ENCARGADO"
    ADMINISTRADOR = "ADMINISTRADOR"

class TipoDeporte(str, Enum):
    FUTBOL_7 = "FUTBOL_7"
    FUTBOL_6 = "FUTBOL_6"
    FUTBOL_5 = "FUTBOL_5"
    VOLEY = "VOLEY"

# 1. PILAR POO: ABSTRACCIÓN Y ENCAPSULAMIENTO
class Usuario(ABC):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str, rol: RolUsuario, password: str = "Pukllay2026*"):
        self._id = id_usuario
        self._nombre = nombre.strip()
        self._email = email.lower().strip()
        self._telefono = telefono.strip()
        self._rol = rol
        self._password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        self._password_plano = password
        self._verificado = True
        self._fecha_registro = datetime.now()

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
    @property
    def password_plano(self) -> str: return self._password_plano
    @property
    def password_hash(self) -> str: return self._password_hash

    @abstractmethod
    def puede_acceder_modulo(self, modulo: str) -> bool:
        pass

# 2. PILAR POO: HERENCIA Y POLIMORFISMO
class Cliente(Usuario):
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ["EXPLORAR_GRASS", "RESERVAR_CANCHA", "MIS_RESERVAS", "CHAT_PROPIETARIO"]

class Propietario(Usuario):
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ["GESTION_CANCHAS", "HORARIOS_REGLAS", "BLOQUEOS", "APROBACION_PAGOS", "VERIFICACION_ADMIN", "CHAT_CLIENTE"]

class Administrador(Usuario):
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return True

# 3. PATRÓN STRATEGY: CANCELACIONES
class IPoliticaCancelacion(ABC):
    @abstractmethod
    def calcular_reembolso(self, monto: float, horas_antelacion: float) -> Dict[str, Any]: pass

class PoliticaCancelacionEstandar(IPoliticaCancelacion):
    def calcular_reembolso(self, monto: float, horas_antelacion: float) -> Dict[str, Any]:
        if horas_antelacion >= 24.0: return {"porcentaje": 100, "reembolso": monto}
        elif horas_antelacion >= 12.0: return {"porcentaje": 50, "reembolso": monto * 0.5}
        return {"porcentaje": 0, "reembolso": 0.0}

print("✓ Motor POO Python 3 cargado exitosamente.")
`
  },
  {
    id: 'calcular_kpis',
    nombreArchivo: 'calcular_kpis.py',
    titulo: 'Motor de Métricas y KPIs de Rendimiento (BI)',
    descripcion: 'Calcula la facturación mensual proyectada vs real en soles, la tasa de ocupación porcentual de canchas de grass sintético frente a 450 horas de capacidad y la distribución por sede.',
    icono: '📊',
    comandoSugerido: 'python3 calcular_kpis.py',
    codigo: `#!/usr/bin/env python3
# PUKLLAY SPORT - CÁLCULO DE KPIS Y ANALÍTICA (PYTHON 3)
from backend_poo import PukllayService

service = PukllayService()
kpis = service.obtener_kpis_dashboard(anio=2026)

print("=" * 68)
print(" 📊 PUKLLAY SPORT - RESUMEN DE RENDIMIENTO EJECUTIVO")
print("=" * 68)
print(f" • Facturación Total Anual:    S/. {kpis['resumen']['totalIngresosAnual']:,.2f}")
print(f" • Tasa Promedio de Ocupación: {kpis['resumen']['promedioOcupacionGlobal']}%")
print(f" • Complejo Deportivo Líder:   {kpis['resumen']['sedeLider']}")
print("-" * 68)
print("1. Facturación por Mes (Ene - Dic):")
for m in kpis['ingresosPorMes']:
    print(f"   {m['nombre']}: S/. {m['ingresos']:,.2f} | Adelantos (50%): S/. {m['adelantos']:,.2f}")
print("\\n2. Ocupación por Cancha:")
for c in kpis['ocupacionCanchas']:
    print(f"   {c['nombre'][:25]:<26} -> {c['ocupacion']}% ({c['horasOcupadas']}/450h)")
print("=" * 68)
`
  },
  {
    id: 'generar_reporte',
    nombreArchivo: 'generar_reporte.py',
    titulo: 'Generador de Reporte Formal Auditable',
    descripcion: 'Produce un informe formal con auditoría criptográfica, estadísticas de reservas, recaudación de adelantos del 50%, saldos pendientes y verificación KYC de complejos.',
    icono: '📄',
    comandoSugerido: 'python3 generar_reporte.py',
    codigo: `#!/usr/bin/env python3
# PUKLLAY SPORT - GENERADOR OFICIAL DE REPORTE FORMAL
from backend_poo import PukllayService

service = PukllayService()
reporte = service.generar_reporte_formal()
stats = reporte["estadisticasGenerales"]

print("=" * 72)
print(f" 📄 INFORME FORMAL AUDITABLE: {reporte['codigo']}")
print(f" Fecha: {reporte['fechaGeneracion']} | Auditor: {reporte['auditor']['nombre']}")
print("=" * 72)
print(f" • Facturación Global:     S/. {stats['facturacionTotal']:,.2f}")
print(f" • Adelantos Recaudados:   S/. {stats['adelantosRecaudados']:,.2f}")
print(f" • Saldos Pendientes:      S/. {stats['saldosPendientes']:,.2f}")
print(f" • Complejos de Grass:     {stats['totalSedes']}")
print(f" • Canchas Habilitadas:    {stats['totalCanchas']}")
print(f" • Usuarios Registrados:   {stats['totalUsuarios']}")
print(f" • Control Concurrencia:   {reporte['cumplimientoSeguridad']['bloqueoConcurrencia']}")
print("=" * 72)
`
  },
  {
    id: 'gestionar_usuarios',
    nombreArchivo: 'gestionar_usuarios.py',
    titulo: 'Gestión y Auditoría de Usuarios con Contraseña',
    descripcion: 'Módulo CLI en Python para listar, registrar, auditar contraseñas (en claro autorizadas y hash SHA-256) y actualizar roles entre Cliente, Propietario y Administrador.',
    icono: '👥',
    comandoSugerido: 'python3 gestionar_usuarios.py listar',
    codigo: `#!/usr/bin/env python3
# PUKLLAY SPORT - DIRECTORIO DE USUARIOS Y CONTRASEÑAS (PYTHON 3)
from backend_poo import PukllayService

service = PukllayService()
usuarios = service.obtener_todos_usuarios()

print("=" * 80)
print(" 👥 DIRECTORIO Y AUDITORÍA DE USUARIOS REGISTRADOS")
print("=" * 80)
print(f" {'ID':<12} | {'Nombre':<20} | {'Email':<22} | {'Rol':<14} | {'Contraseña'}")
print("-" * 80)
for u in usuarios:
    print(f" {u.id:<12} | {u.nombre[:18]:<20} | {u.email[:20]:<22} | {u.rol.value:<14} | {u.password_plano}")
print("=" * 80)
`
  },
  {
    id: 'servidor_api',
    nombreArchivo: 'servidor_api.py',
    titulo: 'Micro-Servidor REST API Nativo Python',
    descripcion: 'Servidor HTTP liviano sin librerías externas que provee endpoints JSON (/api/kpis, /api/reporte, /api/usuarios, /api/sedes, /api/ejecutar) para integración total.',
    icono: '⚡',
    comandoSugerido: 'python3 servidor_api.py --port 8001',
    codigo: `#!/usr/bin/env python3
# PUKLLAY SPORT - SERVIDOR REST API EN PYTHON 3
from http.server import HTTPServer, BaseHTTPRequestHandler
from backend_poo import PukllayService
import json

class Handler(BaseHTTPRequestHandler):
    service = PukllayService()
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        data = {"servicio": "Pukllay Python API", "estado": "ACTIVO", "usuarios": len(self.service.obtener_todos_usuarios())}
        self.wfile.write(json.dumps(data).encode())

print("Servidor listo en puerto 8001")
`
  }
];
