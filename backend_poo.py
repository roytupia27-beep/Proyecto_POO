"""
PUKLLAY SPORT - BACKEND ORIENTADO A OBJETOS (PYTHON 3)
Ordenado por pilares de la POO para sustentación:
  1. Abstracción       -> Usuario, IPoliticaCancelacion
  2. Encapsulamiento   -> Atributos privados, @property, setters y validaciones
  3. Herencia          -> Cliente, Propietario, Administrador heredan de Usuario
  4. Polimorfismo      -> puede_acceder_modulo() distinto por rol
  5. Patrón Strategy   -> Politica (cálculo dinámico de reembolsos)
  6. Singleton/Facade  -> PukllayService + KPIs y Reporte con datos reales
"""

from __future__ import annotations

import hashlib
import os
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


def _cargar_env_local() -> None:
    """Carga variables desde .env si existe sin sobrescribir variables del sistema."""
    try:
        ruta_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        if not os.path.isfile(ruta_env):
            return
        with open(ruta_env, "r", encoding="utf-8") as archivo:
            for linea in archivo:
                linea = linea.strip()
                if not linea or linea.startswith("#") or "=" not in linea:
                    continue
                clave, valor = linea.split("=", 1)
                clave = clave.strip()
                valor = valor.strip().strip('"').strip("'")
                if clave and clave not in os.environ:
                    os.environ[clave] = valor
    except Exception:
        pass


_cargar_env_local()


# =============================================================================
# ENUMS DEL DOMINIO
# =============================================================================

class RolUsuario(str, Enum):
    CLIENTE = "CLIENTE"
    PROPIETARIO = "PROPIETARIO"
    ADMINISTRADOR = "ADMINISTRADOR"


class TipoDeporte(str, Enum):
    FUTBOL_7 = "FUTBOL_7"
    FUTBOL_6 = "FUTBOL_6"
    FUTBOL_5 = "FUTBOL_5"
    VOLEY = "VOLEY"


class TipoSuperficie(str, Enum):
    SINTETICO_MONOFILAMENTO = "SINTETICO_MONOFILAMENTO"
    SINTETICO_FIBRILADO = "SINTETICO_FIBRILADO"
    CESPED_HIBRIDO = "CESPED_HIBRIDO"


class EstadoReserva(str, Enum):
    PENDIENTE_PAGO = "PENDIENTE_PAGO"
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"


class EstadoVerificacion(str, Enum):
    PENDIENTE = "PENDIENTE"
    VERIFICADO = "VERIFICADO"


# =============================================================================
# 1. ABSTRACCIÓN (Clases abstractas que definen contratos, no se instancian)
# =============================================================================

# Pilar: Abstracción (define el contrato común para toda estrategia de cancelación)
class IPoliticaCancelacion(ABC):
    @abstractmethod
    def calcular_reembolso(self, monto_abonado: float, horas_antelacion: float) -> Dict[str, Any]:
        """Calcula porcentaje, monto devuelto y retención según horas de anticipación."""
        pass


# Pilar: Abstracción + Encapsulamiento (clase base abstracta de todos los usuarios)
class Usuario(ABC):
    def __init__(
        self,
        id_usuario: str,
        nombre: str,
        email: str,
        telefono: str,
        rol: RolUsuario,
        password: str,
        verificado: bool = True,
    ):
        self._id = id_usuario
        self._rol = rol
        self._verificado = bool(verificado)
        self._fecha_registro = datetime.now()
        self.nombre = nombre
        self.email = email
        self.telefono = telefono
        self._password_hash = ""
        self.cambiar_password(password)

    @staticmethod
    def _hashear_password(password: str, sal: str = "") -> str:
        sal_final = sal or os.urandom(8).hex()
        digest = hashlib.sha256(f"{sal_final}:{password}".encode("utf-8")).hexdigest()
        return f"{sal_final}${digest}"

    # =========================================================================
    # 2. ENCAPSULAMIENTO (Atributos privados, @property y setters con validación)
    # =========================================================================

    @property
    def id(self) -> str:
        return self._id

    @property
    def nombre(self) -> str:
        return self._nombre

    @nombre.setter
    def nombre(self, valor: str) -> None:
        if not valor or len(valor.strip()) < 2:
            raise ValueError("El nombre debe tener mínimo 2 caracteres.")
        self._nombre = valor.strip()

    @property
    def email(self) -> str:
        return self._email

    @email.setter
    def email(self, valor: str) -> None:
        correo = (valor or "").lower().strip()
        if not correo or "@" not in correo:
            raise ValueError("El correo debe contener '@'.")
        self._email = correo

    @property
    def telefono(self) -> str:
        return self._telefono

    @telefono.setter
    def telefono(self, valor: str) -> None:
        digitos = "".join(c for c in str(valor or "") if c.isdigit())
        if len(digitos) < 7:
            raise ValueError("El teléfono debe tener mínimo 7 dígitos.")
        self._telefono = digitos

    @property
    def rol(self) -> RolUsuario:
        return self._rol

    @rol.setter
    def rol(self, nuevo_rol: RolUsuario) -> None:
        self._rol = nuevo_rol

    @property
    def verificado(self) -> bool:
        return self._verificado

    @verificado.setter
    def verificado(self, valor: bool) -> None:
        self._verificado = bool(valor)

    def cambiar_password(self, nueva_clave: str) -> None:
        if not nueva_clave or len(nueva_clave) < 6:
            raise ValueError("La contraseña debe tener mínimo 6 caracteres.")
        self._password_hash = self._hashear_password(nueva_clave)

    def verificar_password(self, password: str) -> bool:
        if "$" not in self._password_hash:
            return False
        sal, _ = self._password_hash.split("$", 1)
        return self._hashear_password(password, sal) == self._password_hash

    @abstractmethod
    def puede_acceder_modulo(self, modulo: str) -> bool:
        """Método polimórfico implementado por cada rol."""
        pass

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "nombre": self._nombre,
            "email": self._email,
            "telefono": self._telefono,
            "rol": self._rol.value,
            "verificado": self._verificado,
            "fechaRegistro": self._fecha_registro.isoformat(),
        }


# Pilar: Encapsulamiento (regla de horario y tarifa asociada a una Cancha)
class ReglaDisponibilidad:
    def __init__(
        self,
        id_regla: str,
        cancha_id: str,
        dias_semana: List[int],
        hora_inicio: str,
        hora_fin: str,
        precio_hora: float,
    ):
        self._id = id_regla
        self._cancha_id = cancha_id
        self._dias_semana = list(dias_semana)
        self._hora_inicio = hora_inicio
        self._hora_fin = hora_fin
        self.precio_hora = precio_hora

    @property
    def id(self) -> str:
        return self._id

    @property
    def cancha_id(self) -> str:
        return self._cancha_id

    @property
    def dias_semana(self) -> List[int]:
        return list(self._dias_semana)

    @property
    def horario(self) -> str:
        return f"{self._hora_inicio} - {self._hora_fin}"

    @property
    def precio_hora(self) -> float:
        return self._precio_hora

    @precio_hora.setter
    def precio_hora(self, valor: float) -> None:
        if valor is None or float(valor) <= 0:
            raise ValueError("El precio por hora debe ser mayor que 0.")
        self._precio_hora = float(valor)


# Pilar: Encapsulamiento (bloqueo puntual de horario en una Cancha)
class Bloqueo:
    def __init__(
        self,
        id_bloqueo: str,
        cancha_id: str,
        fecha: str,
        hora_inicio: str,
        motivo: str = "Mantenimiento",
    ):
        self._id = id_bloqueo
        self._cancha_id = cancha_id
        self._fecha = fecha
        self._hora_inicio = hora_inicio
        self._motivo = motivo.strip() or "Mantenimiento"

    @property
    def id(self) -> str:
        return self._id

    @property
    def cancha_id(self) -> str:
        return self._cancha_id

    @property
    def fecha(self) -> str:
        return self._fecha

    @property
    def hora_inicio(self) -> str:
        return self._hora_inicio

    @property
    def motivo(self) -> str:
        return self._motivo


# Pilar: Encapsulamiento (cancha deportiva con tarifa validada, reglas y bloqueos)
class Cancha:
    def __init__(
        self,
        id_cancha: str,
        sede_id: str,
        nombre: str,
        deporte: TipoDeporte,
        superficie: TipoSuperficie,
        precio_base_hora: float,
        techada: bool = False,
    ):
        self._id = id_cancha
        self._sede_id = sede_id
        self._nombre = nombre.strip()
        self._deporte = deporte
        self._superficie = superficie
        self.precio_base_hora = precio_base_hora
        self._techada = bool(techada)
        self._reglas: List[ReglaDisponibilidad] = []
        self._bloqueos: List[Bloqueo] = []

    @property
    def id(self) -> str:
        return self._id

    @property
    def sede_id(self) -> str:
        return self._sede_id

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def deporte(self) -> TipoDeporte:
        return self._deporte

    @property
    def precio_base_hora(self) -> float:
        return self._precio_base_hora

    @precio_base_hora.setter
    def precio_base_hora(self, nuevo_precio: float) -> None:
        if nuevo_precio is None or float(nuevo_precio) <= 0:
            raise ValueError("El precio por hora debe ser mayor que 0.")
        self._precio_base_hora = float(nuevo_precio)

    @property
    def reglas(self) -> List[ReglaDisponibilidad]:
        return list(self._reglas)

    @property
    def bloqueos(self) -> List[Bloqueo]:
        return list(self._bloqueos)

    def agregar_regla(self, regla: ReglaDisponibilidad) -> None:
        self._reglas.append(regla)

    def agregar_bloqueo(self, bloqueo: Bloqueo) -> None:
        self._bloqueos.append(bloqueo)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "sedeId": self._sede_id,
            "nombre": self._nombre,
            "deporte": self._deporte.value,
            "superficie": self._superficie.value,
            "precioBaseHora": self._precio_base_hora,
            "techada": self._techada,
            "reglas": len(self._reglas),
            "bloqueos": len(self._bloqueos),
        }


# Pilar: Encapsulamiento (complejo deportivo que agrupa canchas)
class Sede:
    def __init__(
        self,
        id_sede: str,
        propietario_id: str,
        nombre: str,
        direccion: str,
        distrito: str,
        telefono: str,
        coordenadas: Tuple[float, float] = (-12.0464, -77.0428),
    ):
        self._id = id_sede
        self._propietario_id = propietario_id
        self._nombre = nombre.strip()
        self._direccion = direccion.strip()
        self._distrito = distrito.strip()
        self._telefono = telefono.strip()
        self._lat = coordenadas[0]
        self._lng = coordenadas[1]
        self._canchas: List[Cancha] = []
        self._estado_verificacion = EstadoVerificacion.PENDIENTE
        self._check_verificado_admin = False

    @property
    def id(self) -> str:
        return self._id

    @property
    def propietario_id(self) -> str:
        return self._propietario_id

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def distrito(self) -> str:
        return self._distrito

    @property
    def canchas(self) -> List[Cancha]:
        return list(self._canchas)

    @property
    def check_verificado_admin(self) -> bool:
        return self._check_verificado_admin

    def agregar_cancha(self, cancha: Cancha) -> None:
        self._canchas.append(cancha)

    def aprobar_verificacion(self) -> None:
        self._estado_verificacion = EstadoVerificacion.VERIFICADO
        self._check_verificado_admin = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "propietarioId": self._propietario_id,
            "nombre": self._nombre,
            "direccion": self._direccion,
            "distrito": self._distrito,
            "telefono": self._telefono,
            "lat": self._lat,
            "lng": self._lng,
            "esVerificada": self._check_verificado_admin,
            "estadoVerificacion": self._estado_verificacion.value,
            "canchas": [c.to_dict() for c in self._canchas],
        }


# Pilar: Encapsulamiento (registro de pago asociado a una Reserva)
class Pago:
    def __init__(
        self,
        id_pago: str,
        reserva_id: str,
        monto: float,
        metodo: str = "YAPE",
        numero_operacion: str = "",
    ):
        if monto is None or float(monto) <= 0:
            raise ValueError("El monto del pago debe ser mayor que 0.")
        self._id = id_pago
        self._reserva_id = reserva_id
        self._monto = round(float(monto), 2)
        self._metodo = metodo
        self._numero_operacion = numero_operacion.strip()
        self._fecha = datetime.now()

    @property
    def id(self) -> str:
        return self._id

    @property
    def reserva_id(self) -> str:
        return self._reserva_id

    @property
    def monto(self) -> float:
        return self._monto

    @property
    def metodo(self) -> str:
        return self._metodo

    @property
    def numero_operacion(self) -> str:
        return self._numero_operacion

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "reservaId": self._reserva_id,
            "monto": self._monto,
            "metodo": self._metodo,
            "numeroOperacion": self._numero_operacion,
            "fecha": self._fecha.isoformat(),
        }


# Pilar: Encapsulamiento + Delegación Strategy (vincula cliente, cancha, pago y política)
class Reserva:
    def __init__(
        self,
        id_reserva: str,
        cliente_id: str,
        cancha_id: str,
        sede_id: str,
        fecha: str,
        hora_inicio: str,
        precio_total: float,
        tipo_pago: str = "ADELANTO_50",
        numero_operacion: str = "",
        politica: Optional[IPoliticaCancelacion] = None,
    ):
        if float(precio_total) <= 0:
            raise ValueError("El precio de la reserva debe ser mayor que 0.")
        self._id = id_reserva
        self._cliente_id = cliente_id
        self._cancha_id = cancha_id
        self._sede_id = sede_id
        self._fecha = fecha
        self._hora_inicio = hora_inicio
        self._precio_total = round(float(precio_total), 2)
        self._tipo_pago = tipo_pago
        monto_inicial = round(self._precio_total * 0.5, 2) if tipo_pago == "ADELANTO_50" else self._precio_total
        self._pago = Pago(f"pago_{id_reserva}", id_reserva, monto_inicial, "YAPE", numero_operacion)
        self._saldo_pendiente = round(self._precio_total - self._pago.monto, 2)
        self._estado = EstadoReserva.CONFIRMADA
        self._politica: IPoliticaCancelacion = politica or Politica()
        self._fecha_creacion = datetime.now()

    @property
    def id(self) -> str:
        return self._id

    @property
    def cliente_id(self) -> str:
        return self._cliente_id

    @property
    def cancha_id(self) -> str:
        return self._cancha_id

    @property
    def sede_id(self) -> str:
        return self._sede_id

    @property
    def fecha(self) -> str:
        return self._fecha

    @property
    def hora_inicio(self) -> str:
        return self._hora_inicio

    @property
    def precio_total(self) -> float:
        return self._precio_total

    @property
    def monto_pagado(self) -> float:
        return self._pago.monto

    @property
    def saldo_pendiente(self) -> float:
        return self._saldo_pendiente

    @property
    def pago(self) -> Pago:
        return self._pago

    @property
    def estado(self) -> EstadoReserva:
        return self._estado

    def cancelar(self, horas_antelacion: float) -> Dict[str, Any]:
        if self._estado == EstadoReserva.CANCELADA:
            raise ValueError("La reserva ya fue cancelada.")
        resultado = self._politica.calcular_reembolso(self._pago.monto, horas_antelacion)
        self._estado = EstadoReserva.CANCELADA
        return resultado

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self._id,
            "clienteId": self._cliente_id,
            "canchaId": self._cancha_id,
            "sedeId": self._sede_id,
            "fecha": self._fecha,
            "hora": self._hora_inicio,
            "precioTotal": self._precio_total,
            "montoPagado": self._pago.monto,
            "saldoPendiente": self._saldo_pendiente,
            "pago": self._pago.to_dict(),
            "estado": self._estado.value,
            "createdAt": self._fecha_creacion.isoformat(),
        }


# =============================================================================
# 3. HERENCIA Y 4. POLIMORFISMO (Subclases de Usuario con permisos distintos)
# =============================================================================

# Pilar: Herencia (hereda de Usuario) y Polimorfismo (acceso propio de Cliente)
class Cliente(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str, password: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.CLIENTE, password)

    # Pilar: Polimorfismo
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ("EXPLORAR_CANCHAS", "RESERVAR", "MIS_RESERVAS")


# Pilar: Herencia (hereda de Usuario) y Polimorfismo (acceso propio de Propietario)
class Propietario(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str, password: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.PROPIETARIO, password)
        self._sedes_ids: List[str] = []

    @property
    def sedes_ids(self) -> List[str]:
        return list(self._sedes_ids)

    def asociar_sede(self, sede_id: str) -> None:
        if sede_id not in self._sedes_ids:
            self._sedes_ids.append(sede_id)

    # Pilar: Polimorfismo
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return modulo in ("GESTION_SEDES", "GESTION_CANCHAS", "HORARIOS", "APROBAR_PAGOS")


# Pilar: Herencia (hereda de Usuario) y Polimorfismo (acceso total de Administrador)
class Administrador(Usuario):
    def __init__(self, id_usuario: str, nombre: str, email: str, telefono: str, password: str):
        super().__init__(id_usuario, nombre, email, telefono, RolUsuario.ADMINISTRADOR, password)

    # Pilar: Polimorfismo
    def puede_acceder_modulo(self, modulo: str) -> bool:
        return True


# =============================================================================
# 5. PATRÓN STRATEGY (Política de cancelación y reembolso 100% / 50% / 0%)
# =============================================================================

# Pilar: Patrón Strategy (implementa IPoliticaCancelacion con reglas de reembolso)
class Politica(IPoliticaCancelacion):
    def calcular_reembolso(self, monto_abonado: float, horas_antelacion: float) -> Dict[str, Any]:
        monto = round(float(monto_abonado), 2)
        if horas_antelacion >= 24:
            reembolso = monto
            porcentaje = 100
        elif horas_antelacion >= 12:
            reembolso = round(monto * 0.5, 2)
            porcentaje = 50
        else:
            reembolso = 0.0
            porcentaje = 0

        return {
            "porcentaje": porcentaje,
            "reembolso": reembolso,
            "retencion": round(monto - reembolso, 2),
        }


# =============================================================================
# 6. SINGLETON Y FACADE (Servicio central, KPIs y Reporte con datos reales)
# =============================================================================

class MotorAnaliticaKPIs:
    """Calcula KPIs únicamente a partir de las reservas reales activas del sistema."""

    @staticmethod
    def calcular_kpis(sedes: List[Sede], reservas: List[Reserva], anio: int = 2026) -> Dict[str, Any]:
        nombres_mes = ("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
        meses = [
            {"mesKey": f"{i:02d}", "nombre": n, "ingresos": 0.0, "adelantos": 0.0, "reservas": 0}
            for i, n in enumerate(nombres_mes, 1)
        ]

        reservas_activas = [r for r in reservas if r.estado != EstadoReserva.CANCELADA]

        for r in reservas_activas:
            partes = r.fecha.split("-")
            if len(partes) >= 2 and partes[0].isdigit() and partes[1].isdigit():
                if int(partes[0]) == anio:
                    idx = int(partes[1]) - 1
                    if 0 <= idx < 12:
                        meses[idx]["ingresos"] = round(meses[idx]["ingresos"] + r.precio_total, 2)
                        meses[idx]["adelantos"] = round(meses[idx]["adelantos"] + r.monto_pagado, 2)
                        meses[idx]["reservas"] += 1

        capacidad_mes = 450
        ocupacion_canchas = []
        for s in sedes:
            for c in s.canchas:
                horas = sum(1 for r in reservas_activas if r.cancha_id == c.id)
                pct = round((horas / capacidad_mes) * 100, 1)
                ocupacion_canchas.append({
                    "id": c.id,
                    "nombre": c.nombre,
                    "sede": s.nombre,
                    "ocupacion": pct,
                    "horasOcupadas": horas,
                    "horasDisponibles": capacidad_mes,
                })

        distribucion_sedes = []
        for s in sedes:
            res_sede = [r for r in reservas_activas if r.sede_id == s.id]
            distribucion_sedes.append({
                "id": s.id,
                "nombre": s.nombre,
                "distrito": s.distrito,
                "reservasTotales": len(res_sede),
                "recaudado": round(sum(r.monto_pagado for r in res_sede), 2),
                "facturacion": round(sum(r.precio_total for r in res_sede), 2),
            })

        distribucion_sedes.sort(key=lambda x: x["reservasTotales"], reverse=True)
        total_ingresos = round(sum(r.precio_total for r in reservas_activas), 2)
        promedio_ocup = round(
            sum(o["ocupacion"] for o in ocupacion_canchas) / max(1, len(ocupacion_canchas)), 1
        )

        return {
            "anio": anio,
            "resumen": {
                "totalIngresosAnual": total_ingresos,
                "promedioOcupacionGlobal": promedio_ocup,
                "totalReservasHistoricas": len(reservas_activas),
                "sedeLider": distribucion_sedes[0]["nombre"] if distribucion_sedes else "Ninguna",
            },
            "ingresosPorMes": meses,
            "ocupacionCanchas": ocupacion_canchas,
            "distribucionSedes": distribucion_sedes,
        }


class GeneradorReporteFormal:
    """Genera el reporte resumido con totales reales consistentes con los KPIs."""

    @staticmethod
    def generar_reporte_auditable(
        admin: Administrador,
        sedes: List[Sede],
        usuarios: List[Usuario],
        reservas: List[Reserva],
    ) -> Dict[str, Any]:
        ahora = datetime.now()
        reservas_activas = [r for r in reservas if r.estado != EstadoReserva.CANCELADA]
        recaudado = round(sum(r.monto_pagado for r in reservas_activas), 2)
        saldos = round(sum(r.saldo_pendiente for r in reservas_activas), 2)
        facturacion = round(sum(r.precio_total for r in reservas_activas), 2)

        return {
            "codigo": f"REP-{int(ahora.timestamp()) % 1000000:06d}",
            "fechaGeneracion": ahora.strftime("%Y-%m-%d %H:%M:%S"),
            "auditor": {"nombre": admin.nombre, "email": admin.email, "rol": admin.rol.value},
            "estadisticasGenerales": {
                "totalUsuarios": len(usuarios),
                "totalSedes": len(sedes),
                "totalCanchas": sum(len(s.canchas) for s in sedes),
                "totalReservas": len(reservas_activas),
                "facturacionTotal": facturacion,
                "adelantosRecaudados": recaudado,
                "saldosPendientes": saldos,
            },
            "cumplimientoSeguridad": {
                "politicaCancelacion": "100% (>=24h), 50% (12-24h), 0% (<12h)",
            },
        }


# Pilar: Singleton (una única instancia) y Facade (punto de entrada único al sistema)
class PukllayService:
    _instancia: Optional[PukllayService] = None

    def __new__(cls) -> PukllayService:
        if cls._instancia is None:
            cls._instancia = super().__new__(cls)
            cls._instancia._inicializar()
        return cls._instancia

    def _inicializar(self) -> None:
        self._usuarios: Dict[str, Usuario] = {}
        self._sedes: Dict[str, Sede] = {}
        self._reservas: Dict[str, Reserva] = {}

        admin_email = os.getenv("ADMIN_EMAIL", "admin@pukllay.pe")
        admin_phone = os.getenv("ADMIN_PHONE", "900000000")
        admin_pass = os.getenv("ADMIN_PASSWORD", "AdminPukllay2026#")

        self._admin = Administrador("admin_1", "Administrador General", admin_email, admin_phone, admin_pass)
        self._usuarios[self._admin.id] = self._admin
        self._cargar_datos_iniciales()

    def _cargar_datos_iniciales(self) -> None:
        c1 = Cliente("cli_1", "Carlos Mendoza", "carlos@pukllay.pe", "987654321", "Pelotero2026*")
        p1 = Propietario("prop_1", "Roberto Silva", "roberto@pukllay.pe", "987112233", "Grass2026*")
        self._usuarios[c1.id] = c1
        self._usuarios[p1.id] = p1

        s1 = Sede("sede_1", p1.id, "Complejo La Bombonera", "Av. Marsano 1240", "Surquillo", "987112233")
        cancha1 = Cancha("cancha_1", s1.id, "Cancha Fútbol 7", TipoDeporte.FUTBOL_7, TipoSuperficie.SINTETICO_MONOFILAMENTO, 120.0)
        cancha1.agregar_regla(ReglaDisponibilidad("reg_1", cancha1.id, [1, 2, 3, 4, 5, 6, 7], "08:00", "23:00", 120.0))
        cancha1.agregar_bloqueo(Bloqueo("bloq_1", cancha1.id, "2026-10-20", "14:00", "Limpieza"))
        s1.agregar_cancha(cancha1)
        s1.aprobar_verificacion()
        self._sedes[s1.id] = s1
        p1.asociar_sede(s1.id)

        r1 = Reserva("res_1", c1.id, cancha1.id, s1.id, "2026-10-15", "19:00", 120.0, "ADELANTO_50", "OP-001")
        r2 = Reserva("res_2", c1.id, cancha1.id, s1.id, "2026-10-16", "20:00", 120.0, "TOTAL_100", "OP-002")
        self._reservas[r1.id] = r1
        self._reservas[r2.id] = r2

    @property
    def administrador(self) -> Administrador:
        return self._admin

    def obtener_todos_usuarios(self) -> List[Usuario]:
        return list(self._usuarios.values())

    def obtener_sedes(self) -> List[Sede]:
        return list(self._sedes.values())

    def obtener_todas_reservas(self) -> List[Reserva]:
        return list(self._reservas.values())

    def registrar_usuario(
        self,
        nombre: str,
        email: str,
        telefono: str,
        rol: RolUsuario,
        password: str,
    ) -> Usuario:
        correo_norm = (email or "").lower().strip()
        tel_digitos = "".join(c for c in str(telefono or "") if c.isdigit())

        for u in self._usuarios.values():
            if u.email == correo_norm:
                raise ValueError(f"Ya existe un usuario registrado con el correo '{correo_norm}'.")
            if u.telefono == tel_digitos:
                raise ValueError(f"Ya existe un usuario registrado con el teléfono '{tel_digitos}'.")

        nuevo_id = f"user_{len(self._usuarios) + 1}"
        if rol == RolUsuario.PROPIETARIO:
            usuario: Usuario = Propietario(nuevo_id, nombre, email, telefono, password)
        elif rol == RolUsuario.ADMINISTRADOR:
            usuario = Administrador(nuevo_id, nombre, email, telefono, password)
        else:
            usuario = Cliente(nuevo_id, nombre, email, telefono, password)

        self._usuarios[nuevo_id] = usuario
        return usuario

    def obtener_kpis_dashboard(self, anio: int = 2026) -> Dict[str, Any]:
        return MotorAnaliticaKPIs.calcular_kpis(self.obtener_sedes(), self.obtener_todas_reservas(), anio)

    def generar_reporte_formal(self) -> Dict[str, Any]:
        return GeneradorReporteFormal.generar_reporte_auditable(
            self._admin,
            self.obtener_sedes(),
            self.obtener_todos_usuarios(),
            self.obtener_todas_reservas(),
        )


# =============================================================================
# PRUEBAS DE PILARES Y VALIDACIONES (python backend_poo.py)
# =============================================================================

def ejecutar_pruebas() -> None:
    print("=== PRUEBAS POO Y VALIDACIONES - PUKLLAY SPORT ===")

    # 1. Abstracción: no permitir instanciar clases abstractas
    for clase_abs, args in [
        (Usuario, ("u0", "Test", "test@pukllay.pe", "999888777", RolUsuario.CLIENTE, "Clave123")),
        (IPoliticaCancelacion, ()),
    ]:
        try:
            clase_abs(*args)  # type: ignore[misc]
            raise AssertionError(f"No debía permitir instanciar {clase_abs.__name__}")
        except TypeError:
            print(f"✓ Abstracción: {clase_abs.__name__} bloqueada al intentar instanciar.")

    # 2. Encapsulamiento y validaciones de campos
    cli = Cliente("u_test", "Ana Torres", "ana@pukllay.pe", "998877665", "Clave123")
    assert not hasattr(cli, "_password_plano"), "No debe existir _password_plano"
    assert "password" not in cli.to_dict() and "passwordHash" not in cli.to_dict()
    assert cli.verificar_password("Clave123") is True
    print("✓ Encapsulamiento y seguridad: solo guarda hash con sal y to_dict() no expone contraseña.")

    casos_invalidos = [
        ("Nombre < 2", lambda: setattr(cli, "nombre", "A")),
        ("Correo sin @", lambda: setattr(cli, "email", "anapukllay.pe")),
        ("Teléfono < 7 dígitos", lambda: setattr(cli, "telefono", "12345")),
        ("Contraseña < 6 chars", lambda: cli.cambiar_password("123")),
        ("Precio/hora <= 0", lambda: Cancha("c0", "s0", "Cancha", TipoDeporte.FUTBOL_5, TipoSuperficie.CESPED_HIBRIDO, 0)),
    ]
    for etiqueta, fn in casos_invalidos:
        try:
            fn()
            raise AssertionError(f"Falló validación: {etiqueta}")
        except ValueError:
            print(f"✓ Validación: {etiqueta} rechazada con ValueError.")

    # 3. Herencia y 4. Polimorfismo
    prop = Propietario("p_test", "Luis Gómez", "luis@pukllay.pe", "911223344", "Clave123")
    adm = Administrador("a_test", "Admin Test", "adm@pukllay.pe", "922334455", "Clave123")
    assert isinstance(cli, Usuario) and isinstance(prop, Usuario) and isinstance(adm, Usuario)
    print("✓ Herencia: Cliente, Propietario y Administrador heredan de Usuario.")

    assert cli.puede_acceder_modulo("RESERVAR") is True and cli.puede_acceder_modulo("APROBAR_PAGOS") is False
    assert prop.puede_acceder_modulo("APROBAR_PAGOS") is True and prop.puede_acceder_modulo("PANEL_GLOBAL") is False
    assert adm.puede_acceder_modulo("PANEL_GLOBAL") is True
    print("✓ Polimorfismo: puede_acceder_modulo() responde distinto según el rol.")

    # 5. Patrón Strategy (Politica)
    pol = Politica()
    assert pol.calcular_reembolso(100, 30)["porcentaje"] == 100
    assert pol.calcular_reembolso(100, 18)["porcentaje"] == 50
    assert pol.calcular_reembolso(100, 5)["porcentaje"] == 0
    print("✓ Strategy (Politica): reembolso 100% (>=24h), 50% (12-24h) y 0% (<12h).")

    # 6. Singleton, Facade, duplicados y consistencia KPIs vs Reporte
    s1 = PukllayService()
    s2 = PukllayService()
    assert s1 is s2
    print("✓ Singleton y Facade: PukllayService devuelve siempre la misma instancia.")

    try:
        s1.registrar_usuario("Otro Carlos", "carlos@pukllay.pe", "955443322", RolUsuario.CLIENTE, "Clave123")
        raise AssertionError("Debió rechazar correo repetido")
    except ValueError:
        print("✓ Validación: correo repetido rechazado al registrar.")

    try:
        s1.registrar_usuario("Otro Tel", "nuevo@pukllay.pe", "987654321", RolUsuario.CLIENTE, "Clave123")
        raise AssertionError("Debió rechazar teléfono repetido")
    except ValueError:
        print("✓ Validación: teléfono repetido rechazado al registrar.")

    kpis = s1.obtener_kpis_dashboard(2026)
    rep = s1.generar_reporte_formal()
    assert kpis["resumen"]["totalIngresosAnual"] == rep["estadisticasGenerales"]["facturacionTotal"]
    assert kpis["resumen"]["totalReservasHistoricas"] == rep["estadisticasGenerales"]["totalReservas"]
    print("✓ Datos reales: total de KPIs y Reporte coinciden exactamente.")
    print("=== TODAS LAS PRUEBAS PASARON CORRECTAMENTE ===")


if __name__ == "__main__":
    ejecutar_pruebas()
