/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Motor de Caché e Indexación de Consultas de Disponibilidad
 * Reduce la carga de CPU y optimiza las consultas de slots en tiempo real.
 */

import { HorarioSlot } from './Disponibilidad.ts';

interface CacheEntry {
  slots: HorarioSlot[];
  expira: number;
}

export class DisponibilidadCache {
  private static _cache: Map<string, CacheEntry> = new Map();
  private static readonly TTL_MS = 15000; // 15 segundos de micro-caché

  private static generarClave(canchaId: string, fecha: string): string {
    return `${canchaId}__${fecha}`;
  }

  /**
   * Obtiene slots en caché si no han expirado
   */
  public static obtener(canchaId: string, fecha: string): HorarioSlot[] | null {
    const key = this.generarClave(canchaId, fecha);
    const entry = this._cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expira) {
      this._cache.delete(key);
      return null;
    }

    // Retorna copia clonada para evitar mutaciones externas
    return entry.slots.map(s => HorarioSlot.fromJSON(s.toJSON()));
  }

  /**
   * Guarda slots en la micro-caché
   */
  public static guardar(canchaId: string, fecha: string, slots: HorarioSlot[]): void {
    const key = this.generarClave(canchaId, fecha);
    this._cache.set(key, {
      slots: slots.map(s => HorarioSlot.fromJSON(s.toJSON())),
      expira: Date.now() + this.TTL_MS,
    });
  }

  /**
   * Invalida inmediatamente la caché para una cancha o todas las canchas
   */
  public static invalidar(canchaId?: string, fecha?: string): void {
    if (!canchaId) {
      this._cache.clear();
      return;
    }

    if (fecha) {
      this._cache.delete(this.generarClave(canchaId, fecha));
    } else {
      // Invalidar todas las fechas de esta cancha
      for (const key of this._cache.keys()) {
        if (key.startsWith(`${canchaId}__`)) {
          this._cache.delete(key);
        }
      }
    }
  }
}
