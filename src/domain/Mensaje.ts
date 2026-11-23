/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Dominio POO: Mensajería Directa en Tiempo Real (Cliente <-> Dueño del Grass)
 */

import { RolUsuario } from './Usuario.ts';

export interface IMensajeChatJSON {
  id: string;
  conversacionId: string;
  remitenteId: string;
  remitenteNombre: string;
  remitenteRol: RolUsuario;
  destinatarioId: string;
  sedeId: string;
  sedeNombre: string;
  canchaId?: string;
  canchaNombre?: string;
  texto: string;
  timestamp: string;
  leido: boolean;
}

export class MensajeChat {
  public readonly id: string;
  public readonly conversacionId: string;
  public readonly remitenteId: string;
  public readonly remitenteNombre: string;
  public readonly remitenteRol: RolUsuario;
  public readonly destinatarioId: string;
  public readonly sedeId: string;
  public readonly sedeNombre: string;
  public readonly canchaId?: string;
  public readonly canchaNombre?: string;
  public readonly texto: string;
  public readonly timestamp: string;
  private _leido: boolean;

  constructor(
    id: string,
    conversacionId: string,
    remitenteId: string,
    remitenteNombre: string,
    remitenteRol: RolUsuario,
    destinatarioId: string,
    sedeId: string,
    sedeNombre: string,
    texto: string,
    canchaId?: string,
    canchaNombre?: string,
    timestamp?: string,
    leido: boolean = false
  ) {
    this.id = id;
    this.conversacionId = conversacionId;
    this.remitenteId = remitenteId;
    this.remitenteNombre = remitenteNombre;
    this.remitenteRol = remitenteRol;
    this.destinatarioId = destinatarioId;
    this.sedeId = sedeId;
    this.sedeNombre = sedeNombre;
    this.canchaId = canchaId;
    this.canchaNombre = canchaNombre;
    this.texto = texto;
    this.timestamp = timestamp || new Date().toISOString();
    this._leido = leido;
  }

  get leido(): boolean {
    return this._leido;
  }

  public marcarComoLeido(): void {
    this._leido = true;
  }

  public toJSON(): IMensajeChatJSON {
    return {
      id: this.id,
      conversacionId: this.conversacionId,
      remitenteId: this.remitenteId,
      remitenteNombre: this.remitenteNombre,
      remitenteRol: this.remitenteRol,
      destinatarioId: this.destinatarioId,
      sedeId: this.sedeId,
      sedeNombre: this.sedeNombre,
      canchaId: this.canchaId,
      canchaNombre: this.canchaNombre,
      texto: this.texto,
      timestamp: this.timestamp,
      leido: this._leido,
    };
  }

  public static fromJSON(data: IMensajeChatJSON): MensajeChat {
    return new MensajeChat(
      data.id,
      data.conversacionId,
      data.remitenteId,
      data.remitenteNombre,
      data.remitenteRol,
      data.destinatarioId,
      data.sedeId,
      data.sedeNombre,
      data.texto,
      data.canchaId,
      data.canchaNombre,
      data.timestamp,
      data.leido
    );
  }
}
