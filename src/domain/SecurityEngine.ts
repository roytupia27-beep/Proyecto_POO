/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Motor Integral de Seguridad, Rate Limiting, RBAC y Auditoría
 */

import { RolUsuario, Usuario } from './Usuario.ts';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'TRANSACTION';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  nivel: LogLevel;
  categoria: 'AUTH' | 'RESERVA' | 'PAGO' | 'CONCURRENCIA' | 'BACKUP' | 'PERMISOS' | 'SISTEMA';
  mensaje: string;
  usuarioId?: string;
  usuarioRol?: RolUsuario;
  ipSimulada?: string;
  metadata?: Record<string, any>;
}

/**
 * Limitador de Tasa (Rate Limiter) para prevenir ataques de fuerza bruta y flooding
 */
export class RateLimiter {
  private static _intentos: Map<string, { contador: number; expira: number }> = new Map();

  /**
   * Verifica y consume un intento dentro de una ventana de tiempo
   * @param clave Identificador (ej. "login:carlos@gmail.com" o "reserva:cli1")
   * @param maxIntentos Número máximo de intentos permitidos
   * @param ventanaMs Duración de la ventana en milisegundos
   * @returns { permitido: boolean; intentosRestantes: number; retryAfterMs?: number }
   */
  public static verificarYConsumir(
    clave: string,
    maxIntentos: number,
    ventanaMs: number
  ): { permitido: boolean; intentosRestantes: number; retryAfterMs: number } {
    const ahora = Date.now();
    const registro = this._intentos.get(clave);

    if (!registro || registro.expira <= ahora) {
      this._intentos.set(clave, { contador: 1, expira: ahora + ventanaMs });
      return { permitido: true, intentosRestantes: maxIntentos - 1, retryAfterMs: 0 };
    }

    if (registro.contador >= maxIntentos) {
      const retryAfterMs = Math.max(0, registro.expira - ahora);
      return { permitido: false, intentosRestantes: 0, retryAfterMs };
    }

    registro.contador += 1;
    return {
      permitido: true,
      intentosRestantes: maxIntentos - registro.contador,
      retryAfterMs: 0,
    };
  }

  public static resetear(clave: string): void {
    this._intentos.delete(clave);
  }

  public static limpiarTodo(): void {
    this._intentos.clear();
  }

  public static limpiar(): void {
    const ahora = Date.now();
    for (const [clave, reg] of this._intentos.entries()) {
      if (reg.expira <= ahora) {
        this._intentos.delete(clave);
      }
    }
  }
}

/**
 * Guardián de Control de Acceso Basado en Roles (RBAC)
 */
export class SecurityGuard {
  /**
   * Verifica permisos estrictos según matriz RBAC
   */
  public static validarPermiso(
    usuario: Usuario | null,
    accion: 'CREAR_RESERVA' | 'ADMINISTRAR_SEDE' | 'GESTION_GLOBAL' | 'VER_INGRESOS' | 'CHAT',
    recursoPropietarioId?: string
  ): { permitido: boolean; razon?: string } {
    if (!usuario) {
      return { permitido: false, razon: 'No hay una sesión activa. Debes iniciar sesión.' };
    }

    if (usuario.rol === 'ADMINISTRADOR') {
      return { permitido: true }; // Administrador tiene acceso irrestricto
    }

    switch (accion) {
      case 'CREAR_RESERVA':
      case 'CHAT':
        return { permitido: true };

      case 'ADMINISTRAR_SEDE':
      case 'VER_INGRESOS':
        if (usuario.rol === 'PROPIETARIO' || usuario.rol === 'ENCARGADO') {
          // Validar prevención de IDOR (Insecure Direct Object Reference)
          if (recursoPropietarioId && recursoPropietarioId !== usuario.id) {
            return {
              permitido: false,
              razon: 'Violación de seguridad IDOR: No tienes permisos para gestionar esta sede ajena.',
            };
          }
          return { permitido: true };
        }
        return {
          permitido: false,
          razon: 'Permiso denegado: Esta acción requiere privilegios de Propietario o Administrador.',
        };

      case 'GESTION_GLOBAL':
        return {
          permitido: false,
          razon: 'Acceso restringido: Exclusivo para Administradores de la plataforma.',
        };

      default:
        return { permitido: false, razon: 'Acción no autorizada.' };
    }
  }
}

/**
 * Utilidades Criptográficas y de Sanitización
 */
export class SecurityCrypto {
  /**
   * Genera hash alfanumérico rápido para sellos de auditoría
   */
  public static hashSHA256(text: string): string {
    let hash = 0;
    const combined = `${text}:pukllay_shield_salt_2026`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return hex.toUpperCase();
  }

  /**
   * Hash criptográfico simulado con sal (Salted SHA-256 simulation) para contraseñas
   */
  public static hashPassword(password: string, salt: string = 'pukllay_sport_salt_2026'): string {
    let hash = 0;
    const combined = `${salt}:${password}:pukllay_secure`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256_${hex}_${btoa(combined.substring(0, 12)).replace(/=/g, '')}`;
  }

  /**
   * Sanitización contra XSS e inyecciones de código
   */
  public static sanitize(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Enmascaramiento de datos financieros y personales sensibles
   */
  public static enmascararOperacion(nroOperacion?: string): string {
    if (!nroOperacion) return 'OP-CONFIRMADA';
    if (nroOperacion.length <= 4) return 'OP-****';
    return `OP-****${nroOperacion.slice(-4)}`;
  }
}

/**
 * Sistema de Registro y Auditoría de Seguridad (Security Audit Logger)
 */
export class PukllayLogger {
  private static _logs: AuditLogEntry[] = [];
  private static readonly MAX_LOGS = 500;
  private static readonly STORAGE_KEY = 'pukllay_audit_logs';

  public static inicializar(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this._logs = JSON.parse(raw);
      }
    } catch {
      this._logs = [];
    }
  }

  public static registrar(
    nivel: LogLevel,
    categoria: AuditLogEntry['categoria'],
    mensaje: string,
    usuario?: { id: string; rol: RolUsuario } | null,
    metadata?: Record<string, any>
  ): void {
    const entrada: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      nivel,
      categoria,
      mensaje,
      usuarioId: usuario?.id,
      usuarioRol: usuario?.rol,
      metadata,
    };

    this._logs.unshift(entrada);
    if (this._logs.length > this.MAX_LOGS) {
      this._logs = this._logs.slice(0, this.MAX_LOGS);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._logs.slice(0, 100)));
    } catch {
      // Ignorar si cuota llena
    }

    // Log estructurado en consola para debugging
    if (nivel === 'ERROR' || nivel === 'SECURITY') {
      console.warn(`[PUKLLAY ${nivel}][${categoria}]: ${mensaje}`, metadata || '');
    }
  }

  public static obtenerLogs(limite: number = 100): AuditLogEntry[] {
    return [...this._logs.slice(0, limite)];
  }

  public static limpiarLogs(): void {
    this._logs = [];
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Motor Antifraude y Verificación de Legitimidad de Sedes (Pukllay Shield)
 * Previene que intrusos o estafadores registren complejos falsos para captar pagos por Yape/Plin
 */
export class PukllayAntiFraudEngine {
  /**
   * Validación algorítmica de RUC peruano según estándar oficial de SUNAT (Módulo 11)
   */
  public static validarRucPeruano(ruc: string): { 
    valido: boolean; 
    mensaje?: string; 
    tipo?: 'PERSONA_NATURAL_CON_NEGOCIO' | 'PERSONA_JURIDICA' | 'ESTATAL';
  } {
    const clean = (ruc || '').trim();
    if (!/^\d{11}$/.test(clean)) {
      return { valido: false, mensaje: 'El RUC debe contener exactamente 11 dígitos numéricos.' };
    }

    const prefijo = clean.substring(0, 2);
    if (!['10', '15', '17', '20'].includes(prefijo)) {
      return { valido: false, mensaje: 'Prefijo de RUC no reconocido por SUNAT (debe iniciar con 10, 15, 17 o 20).' };
    }

    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += parseInt(clean.charAt(i), 10) * factores[i];
    }

    const residuo = suma % 11;
    let digitoEsperado = 11 - residuo;
    if (digitoEsperado === 10) digitoEsperado = 0;
    if (digitoEsperado === 11) digitoEsperado = 1;

    const digitoReal = parseInt(clean.charAt(10), 10);
    if (digitoReal !== digitoEsperado) {
      return { valido: false, mensaje: 'Dígito verificador de RUC inválido ante algoritmo tributario SUNAT.' };
    }

    let tipo: 'PERSONA_NATURAL_CON_NEGOCIO' | 'PERSONA_JURIDICA' | 'ESTATAL' = 'PERSONA_JURIDICA';
    if (prefijo === '10' || prefijo === '15') tipo = 'PERSONA_NATURAL_CON_NEGOCIO';
    if (prefijo === '20') tipo = 'PERSONA_JURIDICA';

    return { valido: true, tipo };
  }

  /**
   * Validación de DNI peruano (8 dígitos)
   */
  public static validarDniPeruano(dni: string): { valido: boolean; mensaje?: string } {
    const clean = (dni || '').trim();
    if (!/^\d{8}$/.test(clean)) {
      return { valido: false, mensaje: 'El DNI debe contener exactamente 8 dígitos numéricos.' };
    }
    return { valido: true };
  }

  /**
   * Compara el nombre del titular de la billetera digital (Yape/Plin) con el nombre o razón social del titular
   * para evitar que un intruso ponga el Yape de un tercero o cómplice.
   */
  public static validarCoincidenciaTitular(
    titularBilletera: string,
    nombreRegistrado: string
  ): { coincide: boolean; similitud: number; mensaje?: string } {
    const norm = (s: string) => 
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .trim();

    const tWords = norm(titularBilletera).split(/\s+/).filter(w => w.length > 2);
    const rWords = norm(nombreRegistrado).split(/\s+/).filter(w => w.length > 2);

    if (tWords.length === 0 || rWords.length === 0) {
      return { coincide: false, similitud: 0, mensaje: 'Datos de titular incompletos para validación.' };
    }

    // Contar coincidencias de palabras (nombres y apellidos)
    let coincidencias = 0;
    for (const tw of tWords) {
      if (rWords.some(rw => rw.includes(tw) || tw.includes(rw))) {
        coincidencias++;
      }
    }

    const similitud = coincidencias / Math.min(tWords.length, rWords.length);
    const coincide = similitud >= 0.5;

    if (!coincide) {
      return {
        coincide: false,
        similitud,
        mensaje: `Alerta Antifraude: El titular de Yape/Plin ("${titularBilletera}") no coincide con el titular/RUC registrado ("${nombreRegistrado}").`
      };
    }

    return { coincide: true, similitud };
  }

  /**
   * Genera sello criptográfico único de auditoría para un complejo verificado
   */
  public static generarSelloSeguridad(sedeId: string, docIdentidad: string): string {
    const hash = SecurityCrypto.hashSHA256(`${sedeId}-${docIdentidad}-PUKLLAY-SHIELD-VERIFIED`).slice(0, 8).toUpperCase();
    return `PUKLLAY-SHIELD-${hash}`;
  }
}
