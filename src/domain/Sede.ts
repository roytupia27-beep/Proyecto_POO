/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Dominio POO: Sedes y Canchas Deportivas
 */

import { ReglaDisponibilidad, BloqueoHorario } from './Disponibilidad.ts';

export type DeporteTipo = 
  | 'FUTBOL_5'
  | 'FUTBOL_6'
  | 'FUTBOL_7'
  | 'FUTBOL_8'
  | 'FUTSAL'
  | 'VOLEY'
  | 'PADEL';

export type SuperficieTipo = 
  | 'GRASS_MONOFILAMENTO'
  | 'GRASS_FIBRILADO'
  | 'GRASS_PREMIUM_CAUCHO'
  | 'LOSA_DEPORTIVA';

export interface IUbicacionGeo {
  lat: number;
  lng: number;
  direccion: string;
  distrito: string;
  ciudad: string;
  referencia?: string;
}

export interface IAmenidad {
  id: string;
  nombre: string;
  icono: string;
}

export type EstadoVerificacionSede = 'VERIFICADO' | 'PENDIENTE' | 'OBSERVADO';

export interface IDocumentoVerificacionSede {
  ruc?: string;
  dni?: string;
  razonSocial?: string;
  tipoDocumento: 'COORDINACION_WHATSAPP' | 'CONTACTO_DIRECTO' | 'LICENCIA_MUNICIPAL' | 'RECIBO_SERVICIOS' | 'CONTRATO_ARRENDAMIENTO' | 'TITULO_PROPIEDAD' | 'FOTO_FACHADA';
  documentoUrl?: string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  verificadoPor?: string;
  titularYapeValidado?: boolean;
  titularYape?: string;
  numeroYape?: string;
  nombreContacto?: string;
  contactoWhatsApp?: string;
  contactoEmail?: string;
  notasAdmin?: string;
  motivoObservacion?: string;
  checkVerificadoAdmin?: boolean;
}

/**
 * RF-03: Clase Cancha (POO: Encapsulamiento y Gestión de Estado)
 */
export class Cancha {
  private _id: string;
  private _sedeId: string;
  private _nombre: string;
  private _deporte: DeporteTipo;
  private _superficie: SuperficieTipo;
  private _techada: boolean;
  private _precioBaseHora: number;
  private _activa: boolean;
  private _fotos: string[];
  private _dimensiones: string;
  private _reglasDisponibilidad: ReglaDisponibilidad[];
  private _bloqueos: BloqueoHorario[];

  constructor(
    id: string,
    sedeId: string,
    nombre: string,
    deporte: DeporteTipo,
    superficie: SuperficieTipo,
    techada: boolean,
    precioBaseHora: number,
    activa: boolean = true,
    fotos: string[] = [],
    dimensiones: string = '20m x 30m',
    reglas: ReglaDisponibilidad[] = [],
    bloqueos: BloqueoHorario[] = []
  ) {
    this._id = id;
    this._sedeId = sedeId;
    this._nombre = nombre;
    this._deporte = deporte;
    this._superficie = superficie;
    this._techada = techada;
    this._precioBaseHora = precioBaseHora;
    this._activa = activa;
    this._fotos = fotos.length > 0 ? fotos : [
      'https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=800&q=80',
    ];
    this._dimensiones = dimensiones;
    this._reglasDisponibilidad = reglas;
    this._bloqueos = bloqueos;
  }

  // Getters
  get id(): string { return this._id; }
  get sedeId(): string { return this._sedeId; }
  get nombre(): string { return this._nombre; }
  get deporte(): DeporteTipo { return this._deporte; }
  get superficie(): SuperficieTipo { return this._superficie; }
  get techada(): boolean { return this._techada; }
  get precioBaseHora(): number { return this._precioBaseHora; }
  get activa(): boolean { return this._activa; }
  get fotos(): string[] { return [...this._fotos]; }
  get dimensiones(): string { return this._dimensiones; }
  get reglasDisponibilidad(): ReglaDisponibilidad[] { return [...this._reglasDisponibilidad]; }
  get bloqueos(): BloqueoHorario[] { return [...this._bloqueos]; }

  // Setters de negocio
  public setNombre(nuevoNombre: string): void {
    if (!nuevoNombre || nuevoNombre.trim().length === 0) throw new Error('Nombre inválido');
    this._nombre = nuevoNombre;
  }

  public setPrecioBaseHora(precio: number): void {
    if (precio <= 0) throw new Error('El precio debe ser mayor a 0');
    this._precioBaseHora = precio;
  }

  public setDeporte(nuevoDeporte: DeporteTipo): void {
    this._deporte = nuevoDeporte;
  }

  public setSuperficie(nuevaSuperficie: SuperficieTipo): void {
    this._superficie = nuevaSuperficie;
  }

  public setTechada(techada: boolean): void {
    this._techada = techada;
  }

  public setDimensiones(dimensiones: string): void {
    this._dimensiones = dimensiones;
  }

  public setFotos(fotos: string[]): void {
    if (fotos && fotos.length > 0) {
      this._fotos = fotos;
    }
  }

  /**
   * RF-03: Criterio: una cancha desactivada no aparece en la búsqueda ni acepta reservas nuevas.
   */
  public desactivar(): void {
    this._activa = false;
  }

  public activar(): void {
    this._activa = true;
  }

  public agregarFoto(url: string): void {
    if (url && !this._fotos.includes(url)) {
      this._fotos.push(url);
    }
  }

  public eliminarFoto(url: string): void {
    this._fotos = this._fotos.filter(f => f !== url);
  }

  public agregarRegla(regla: ReglaDisponibilidad): void {
    this._reglasDisponibilidad.push(regla);
  }

  public removerRegla(reglaId: string): void {
    this._reglasDisponibilidad = this._reglasDisponibilidad.filter(r => r.id !== reglaId);
  }

  /**
   * RF-05: Bloqueo de horarios por mantenimiento, uso propio o feriados
   */
  public agregarBloqueo(bloqueo: BloqueoHorario): void {
    this._bloqueos.push(bloqueo);
  }

  public removerBloqueo(bloqueoId: string): void {
    this._bloqueos = this._bloqueos.filter(b => b.id !== bloqueoId);
  }

  public estaBloqueadaEn(fecha: string, horaInicio: string, horaFin: string): boolean {
    return this._bloqueos.some(bloqueo => bloqueo.colisionaCon(fecha, horaInicio, horaFin));
  }

  public toJSON(): Record<string, any> {
    return {
      id: this._id,
      sedeId: this._sedeId,
      nombre: this._nombre,
      deporte: this._deporte,
      superficie: this._superficie,
      techada: this._techada,
      precioBaseHora: this._precioBaseHora,
      activa: this._activa,
      fotos: this._fotos,
      dimensiones: this._dimensiones,
      reglasDisponibilidad: this._reglasDisponibilidad.map(r => r.toJSON()),
      bloqueos: this._bloqueos.map(b => b.toJSON()),
    };
  }
}

/**
 * RF-03: Clase Sede (POO: Agregación con Canchas y cálculo geoespacial)
 */
export class Sede {
  private _id: string;
  private _propietarioId: string;
  private _nombre: string;
  private _descripcion: string;
  private _ubicacion: IUbicacionGeo;
  private _telefonoContacto: string;
  private _amenidades: string[];
  private _fotos: string[];
  private _canchas: Cancha[];
  private _calificacionPromedio: number;
  private _totalOpiniones: number;
  private _estadoVerificacion: EstadoVerificacionSede;
  private _documentoVerificacion?: IDocumentoVerificacionSede;
  private _selloSeguridad?: string;

  constructor(
    id: string,
    propietarioId: string,
    nombre: string,
    descripcion: string,
    ubicacion: IUbicacionGeo,
    telefonoContacto: string,
    amenidades: string[] = [],
    fotos: string[] = [],
    canchas: Cancha[] = [],
    calificacionPromedio: number = 4.8,
    totalOpiniones: number = 32,
    estadoVerificacion: EstadoVerificacionSede = 'PENDIENTE',
    documentoVerificacion?: IDocumentoVerificacionSede,
    selloSeguridad?: string
  ) {
    this._id = id;
    this._propietarioId = propietarioId;
    this._nombre = nombre;
    this._descripcion = descripcion;
    this._ubicacion = ubicacion;
    this._telefonoContacto = telefonoContacto;
    this._amenidades = amenidades;
    this._fotos = fotos.length > 0 ? fotos : [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80'
    ];
    this._canchas = canchas;
    this._calificacionPromedio = calificacionPromedio;
    this._totalOpiniones = totalOpiniones;
    this._estadoVerificacion = estadoVerificacion;
    this._documentoVerificacion = documentoVerificacion;
    this._selloSeguridad = selloSeguridad;
  }

  get id(): string { return this._id; }
  get propietarioId(): string { return this._propietarioId; }
  get nombre(): string { return this._nombre; }
  get descripcion(): string { return this._descripcion; }
  get ubicacion(): IUbicacionGeo { return { ...this._ubicacion }; }
  get telefonoContacto(): string { return this._telefonoContacto; }
  get amenidades(): string[] { return [...this._amenidades]; }
  get fotos(): string[] { return [...this._fotos]; }
  get canchas(): Cancha[] { return [...this._canchas]; }
  get calificacionPromedio(): number { return this._calificacionPromedio; }
  get totalOpiniones(): number { return this._totalOpiniones; }
  get estadoVerificacion(): EstadoVerificacionSede { return this._estadoVerificacion; }
  get esVerificada(): boolean { return this._estadoVerificacion === 'VERIFICADO'; }
  get checkVerificadoAdmin(): boolean { return this._estadoVerificacion === 'VERIFICADO'; }
  get puedeRecibirPagosDigitales(): boolean { return this._estadoVerificacion === 'VERIFICADO'; }
  get documentoVerificacion(): IDocumentoVerificacionSede | undefined { return this._documentoVerificacion; }
  get selloSeguridad(): string | undefined { return this._selloSeguridad; }

  public solicitarVerificacion(docs: IDocumentoVerificacionSede): void {
    this._documentoVerificacion = docs;
    this._estadoVerificacion = 'PENDIENTE';
  }

  public aprobarVerificacion(adminId: string, sello: string, notasAdmin?: string): void {
    this._estadoVerificacion = 'VERIFICADO';
    this._selloSeguridad = sello;
    if (!this._documentoVerificacion) {
      this._documentoVerificacion = {
        tipoDocumento: 'CONTACTO_DIRECTO',
        fechaSolicitud: new Date().toISOString(),
      };
    }
    this._documentoVerificacion.fechaAprobacion = new Date().toISOString();
    this._documentoVerificacion.verificadoPor = adminId;
    this._documentoVerificacion.checkVerificadoAdmin = true;
    if (notasAdmin) {
      this._documentoVerificacion.notasAdmin = notasAdmin;
    }
    delete this._documentoVerificacion.motivoObservacion;
  }

  public observarVerificacion(motivo: string): void {
    this._estadoVerificacion = 'OBSERVADO';
    if (this._documentoVerificacion) {
      this._documentoVerificacion.motivoObservacion = motivo;
    }
  }

  public setNombre(nombre: string): void {
    if (!nombre || nombre.trim().length === 0) throw new Error('Nombre inválido');
    this._nombre = nombre.trim();
  }

  public setDescripcion(desc: string): void {
    this._descripcion = desc;
  }

  public setTelefonoContacto(tel: string): void {
    this._telefonoContacto = tel;
  }

  public setUbicacion(ubicacion: IUbicacionGeo): void {
    if (!ubicacion || typeof ubicacion.lat !== 'number' || typeof ubicacion.lng !== 'number') {
      throw new Error('Coordenadas de ubicación inválidas');
    }
    this._ubicacion = { ...ubicacion };
  }

  public setAmenidades(amenidades: string[]): void {
    this._amenidades = amenidades;
  }

  public agregarCancha(cancha: Cancha): void {
    this._canchas.push(cancha);
  }

  public actualizarCancha(canchaActualizada: Cancha): void {
    const index = this._canchas.findIndex(c => c.id === canchaActualizada.id);
    if (index >= 0) {
      this._canchas[index] = canchaActualizada;
    }
  }

  public obtenerCanchasActivas(): Cancha[] {
    return this._canchas.filter(c => c.activa);
  }

  public obtenerPrecioMinimo(): number {
    const activas = this.obtenerCanchasActivas();
    if (activas.length === 0) return 0;
    return Math.min(...activas.map(c => c.precioBaseHora));
  }

  /**
   * Cálculo de distancia en KM con la fórmula de Haversine
   */
  public calcularDistanciaA(lat: number, lng: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat - this._ubicacion.lat);
    const dLng = this.deg2rad(lng - this._ubicacion.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this._ubicacion.lat)) *
      Math.cos(this.deg2rad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10; // 1 decimal
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public toJSON(): Record<string, any> {
    return {
      id: this._id,
      propietarioId: this._propietarioId,
      nombre: this._nombre,
      descripcion: this._descripcion,
      ubicacion: this._ubicacion,
      telefonoContacto: this._telefonoContacto,
      amenidades: this._amenidades,
      fotos: this._fotos,
      canchas: this._canchas.map(c => c.toJSON()),
      calificacionPromedio: this._calificacionPromedio,
      totalOpiniones: this._totalOpiniones,
      estadoVerificacion: this._estadoVerificacion,
      documentoVerificacion: this._documentoVerificacion,
      selloSeguridad: this._selloSeguridad,
    };
  }
}
