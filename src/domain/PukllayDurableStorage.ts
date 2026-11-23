/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Almacenamiento Permanente, Backups y Recuperación ante Fallos
 * Soporta IndexedDB + LocalStorage con recuperación automática y exportación/importación JSON.
 */

import { PukllayLogger } from './SecurityEngine.ts';

export interface PukllayBackupSnapshot {
  version: string;
  timestamp: string;
  checksum: string;
  data: {
    usuarios: any[];
    sedes: any[];
    reservas: any[];
    notificaciones: any[];
    mensajes: any[];
  };
}

export class PukllayDurableStorage {
  private static readonly DB_NAME = 'pukllay_master_db';
  private static readonly DB_VERSION = 1;
  private static readonly BACKUP_PREFIX = 'pukllay_backup_';
  private static _dbPromise: Promise<IDBDatabase | null> | null = null;

  /**
   * Inicializa conexión a IndexedDB en segundo plano
   */
  public static async obtenerIndexedDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = req.result;
            if (!db.objectStoreNames.contains('snapshots')) {
              db.createObjectStore('snapshots', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('transacciones')) {
              db.createObjectStore('transacciones', { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            console.warn('[PukllayDurableStorage] Fallback a localStorage (IndexedDB no disponible).');
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }

    return this._dbPromise;
  }

  /**
   * Guarda de forma duradera en IndexedDB y localStorage con mitigación de cuota
   */
  public static async persistirEstadoDuradero(clave: string, payload: any): Promise<boolean> {
    // 1. Persistir en localStorage
    try {
      localStorage.setItem(clave, JSON.stringify(payload));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        PukllayLogger.registrar('WARN', 'SISTEMA', 'Cuota de localStorage excedida. Limpiando caché temporal.');
        // Limpiar logs antiguos
        PukllayLogger.limpiarLogs();
        try {
          localStorage.setItem(clave, JSON.stringify(payload));
        } catch {
          // Continuar a IndexedDB
        }
      }
    }

    // 2. Persistir permanentemente en IndexedDB
    try {
      const db = await this.obtenerIndexedDB();
      if (db) {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        store.put({ id: clave, timestamp: Date.now(), data: payload });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Genera un Checksum simple para verificar integridad del backup
   */
  private static calcularChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `chk_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Crea un Backup Completo del Sistema
   */
  public static crearBackup(datos: PukllayBackupSnapshot['data']): PukllayBackupSnapshot {
    const rawData = JSON.stringify(datos);
    const checksum = this.calcularChecksum(rawData);

    const snapshot: PukllayBackupSnapshot = {
      version: '2.0.0-PRO',
      timestamp: new Date().toISOString(),
      checksum,
      data: datos,
    };

    // Guardar en el histórico de backups locales (últimos 3)
    try {
      const key = `${this.BACKUP_PREFIX}${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(snapshot));

      // Limpiar backups antiguos si hay más de 3
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith(this.BACKUP_PREFIX));
      if (allKeys.length > 3) {
        allKeys.sort();
        for (let i = 0; i < allKeys.length - 3; i++) {
          localStorage.removeItem(allKeys[i]);
        }
      }

      PukllayLogger.registrar('INFO', 'BACKUP', `Backup automático creado exitosamente. Checksum: ${checksum}`);
    } catch {
      // Ignorar si cuota
    }

    return snapshot;
  }

  /**
   * Descarga el Backup como archivo JSON
   */
  public static descargarBackupJSON(datos: PukllayBackupSnapshot['data']): void {
    const snapshot = this.crearBackup(datos);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pukllaysport_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida y Restaura un Backup desde un objeto JSON
   */
  public static validarYRestaurarBackup(jsonString: string): {
    valido: boolean;
    datos?: PukllayBackupSnapshot['data'];
    mensaje: string;
  } {
    try {
      const parsed: PukllayBackupSnapshot = JSON.parse(jsonString);

      if (!parsed.data || !Array.isArray(parsed.data.sedes) || !Array.isArray(parsed.data.usuarios)) {
        return { valido: false, mensaje: 'El archivo de backup no contiene la estructura requerida.' };
      }

      const checksumVerificado = this.calcularChecksum(JSON.stringify(parsed.data));
      if (parsed.checksum && parsed.checksum !== checksumVerificado) {
        PukllayLogger.registrar('SECURITY', 'BACKUP', 'Fallo de verificación de integridad en restauración de backup');
        return { valido: false, mensaje: 'Error de integridad: El checksum del backup ha sido adulterado o está corrupto.' };
      }

      PukllayLogger.registrar('INFO', 'BACKUP', `Backup restaurado con éxito. Timestamp original: ${parsed.timestamp}`);
      return { valido: true, datos: parsed.data, mensaje: 'Backup validado y listo para restaurar.' };
    } catch (e: any) {
      return { valido: false, mensaje: `Formato de backup inválido: ${e.message}` };
    }
  }

  /**
   * Obtiene la lista de backups locales disponibles
   */
  public static listarBackupsLocales(): { id: string; fecha: string; checksum: string }[] {
    const resultados: { id: string; fecha: string; checksum: string }[] = [];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(this.BACKUP_PREFIX)) {
        try {
          const item: PukllayBackupSnapshot = JSON.parse(localStorage.getItem(key) || '{}');
          resultados.push({
            id: key,
            fecha: item.timestamp,
            checksum: item.checksum,
          });
        } catch {
          // Ignorar
        }
      }
    }
    return resultados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }
}
