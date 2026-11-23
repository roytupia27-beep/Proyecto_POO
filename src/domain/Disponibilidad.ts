/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Dominio POO: Disponibilidad, Reglas y Control de Concurrencia
 */

export type EstadoSlot = 'LIBRE' | 'RETENIDO' | 'RESERVADO' | 'BLOQUEADO';

/**
 * RF-04: Regla de disponibilidad recurrente
 */
export class ReglaDisponibilidad {
  private _id: string;
  private _canchaId: string;
  private _diasSemana: number[]; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  private _horaInicio: string;   // "08:00"
  private _horaFin: string;      // "23:00"
  private _duracionMinutos: number; // 60
  private _precioEspecial?: number; // Opcional para horas punta / noche

  constructor(
    id: string,
    canchaId: string,
    diasSemana: number[],
    horaInicio: string,
    horaFin: string,
    duracionMinutos: number = 60,
    precioEspecial?: number
  ) {
    this._id = id;
    this._canchaId = canchaId;
    this._diasSemana = diasSemana;
    this._horaInicio = horaInicio;
    this._horaFin = horaFin;
    this._duracionMinutos = duracionMinutos;
    this._precioEspecial = precioEspecial;
  }

  get id(): string { return this._id; }
  get canchaId(): string { return this._canchaId; }
  get diasSemana(): number[] { return [...this._diasSemana]; }
  get horaInicio(): string { return this._horaInicio; }
  get horaFin(): string { return this._horaFin; }
  get duracionMinutos(): number { return this._duracionMinutos; }
  get precioEspecial(): number | undefined { return this._precioEspecial; }

  public aplicaEnDia(diaSemana: number): boolean {
    return this._diasSemana.includes(diaSemana);
  }

  public toJSON(): Record<string, any> {
    return {
      id: this._id,
      canchaId: this._canchaId,
      diasSemana: this._diasSemana,
      horaInicio: this._horaInicio,
      horaFin: this._horaFin,
      duracionMinutos: this._duracionMinutos,
      precioEspecial: this._precioEspecial,
    };
  }
}

/**
 * RF-05: Bloqueo de horario manual por mantenimiento, feriado o uso personal
 */
export class BloqueoHorario {
  private _id: string;
  private _canchaId: string;
  private _fecha: string;      // "YYYY-MM-DD"
  private _horaInicio: string; // "14:00"
  private _horaFin: string;    // "18:00"
  private _motivo: string;
  private _activo: boolean;

  constructor(
    id: string,
    canchaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string = 'Mantenimiento del césped',
    activo: boolean = true
  ) {
    this._id = id;
    this._canchaId = canchaId;
    this._fecha = fecha;
    this._horaInicio = horaInicio;
    this._horaFin = horaFin;
    this._motivo = motivo;
    this._activo = activo;
  }

  get id(): string { return this._id; }
  get canchaId(): string { return this._canchaId; }
  get fecha(): string { return this._fecha; }
  get horaInicio(): string { return this._horaInicio; }
  get horaFin(): string { return this._horaFin; }
  get motivo(): string { return this._motivo; }
  get activo(): boolean { return this._activo; }

  public desactivar(): void {
    this._activo = false;
  }

  public colisionaCon(fecha: string, inicio: string, fin: string): boolean {
    if (!this._activo || this._fecha !== fecha) return false;
    return (inicio < this._horaFin && fin > this._horaInicio);
  }

  public toJSON(): Record<string, any> {
    return {
      id: this._id,
      canchaId: this._canchaId,
      fecha: this._fecha,
      horaInicio: this._horaInicio,
      horaFin: this._horaFin,
      motivo: this._motivo,
      activo: this._activo,
    };
  }
}

/**
 * RF-06 y RF-08: Slot de horario individual con soporte de concurrencia y retención temporal
 */
export class HorarioSlot {
  public readonly id: string;
  public readonly canchaId: string;
  public readonly fecha: string;
  public readonly horaInicio: string;
  public readonly horaFin: string;
  public readonly precio: number;
  private _estado: EstadoSlot;
  private _retenidoPor?: string;
  private _retencionExpira?: number; // Timestamp en ms
  private _reservaId?: string;
  private _motivoBloqueo?: string;

  constructor(
    id: string,
    canchaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    precio: number,
    estado: EstadoSlot = 'LIBRE',
    retenidoPor?: string,
    retencionExpira?: number,
    reservaId?: string,
    motivoBloqueo?: string
  ) {
    this.id = id;
    this.canchaId = canchaId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.precio = precio;
    this._estado = estado;
    this._retenidoPor = retenidoPor;
    this._retencionExpira = retencionExpira;
    this._reservaId = reservaId;
    this._motivoBloqueo = motivoBloqueo;
  }

  get estado(): EstadoSlot {
    this.verificarExpiracionRetencion();
    return this._estado;
  }

  get retenidoPor(): string | undefined { return this._retenidoPor; }
  get retencionExpira(): number | undefined { return this._retencionExpira; }
  get reservaId(): string | undefined { return this._reservaId; }
  get motivoBloqueo(): string | undefined { return this._motivoBloqueo; }

  /**
   * Limpia automáticamente la retención si ya expiraron los minutos
   */
  public verificarExpiracionRetencion(): void {
    if (this._estado === 'RETENIDO' && this._retencionExpira) {
      if (Date.now() > this._retencionExpira) {
        this._estado = 'LIBRE';
        this._retenidoPor = undefined;
        this._retencionExpira = undefined;
      }
    }
  }

  public segundosRestantesRetencion(): number {
    this.verificarExpiracionRetencion();
    if (this._estado !== 'RETENIDO' || !this._retencionExpira) return 0;
    const diff = Math.max(0, Math.floor((this._retencionExpira - Date.now()) / 1000));
    return diff;
  }

  public estaDisponible(): boolean {
    this.verificarExpiracionRetencion();
    return this._estado === 'LIBRE';
  }

  /**
   * RF-08 y RF-09: Retener slot por 5 a 10 minutos (Bloqueo transaccional)
   */
  public retener(clienteId: string, duracionMinutos: number = 7): boolean {
    this.verificarExpiracionRetencion();
    // Criterio RF-09: Si ya está ocupado por otro, rechazar
    if (this._estado !== 'LIBRE') {
      if (this._estado === 'RETENIDO' && this._retenidoPor === clienteId) {
        // Renueva su propia retención
        this._retencionExpira = Date.now() + duracionMinutos * 60 * 1000;
        return true;
      }
      return false;
    }

    this._estado = 'RETENIDO';
    this._retenidoPor = clienteId;
    this._retencionExpira = Date.now() + duracionMinutos * 60 * 1000;
    return true;
  }

  public liberarRetencion(clienteId?: string): void {
    if (!clienteId || this._retenidoPor === clienteId) {
      this._estado = 'LIBRE';
      this._retenidoPor = undefined;
      this._retencionExpira = undefined;
    }
  }

  public confirmarReserva(reservaId: string): void {
    this._estado = 'RESERVADO';
    this._reservaId = reservaId;
    this._retenidoPor = undefined;
    this._retencionExpira = undefined;
  }

  public bloquear(motivo: string): void {
    this._estado = 'BLOQUEADO';
    this._motivoBloqueo = motivo;
  }

  public liberarReserva(): void {
    this._estado = 'LIBRE';
    this._reservaId = undefined;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      canchaId: this.canchaId,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      precio: this.precio,
      estado: this.estado,
      retenidoPor: this._retenidoPor,
      retencionExpira: this._retencionExpira,
      reservaId: this._reservaId,
      motivoBloqueo: this._motivoBloqueo,
    };
  }

  public static fromJSON(data: Record<string, any>): HorarioSlot {
    return new HorarioSlot(
      data.id,
      data.canchaId,
      data.fecha,
      data.horaInicio,
      data.horaFin,
      data.precio,
      data.estado,
      data.retenidoPor,
      data.retencionExpira,
      data.reservaId,
      data.motivoBloqueo
    );
  }
}

/**
 * RF-04, RF-06 y RF-07: Motor POO generador y validador de disponibilidad
 */
export class MotorDisponibilidad {
  /**
   * Genera los slots de horarios para una cancha en una fecha dada
   */
  public static generarSlots(
    canchaId: string,
    precioBase: number,
    reglas: ReglaDisponibilidad[],
    bloqueos: BloqueoHorario[],
    fechaISO: string, // "YYYY-MM-DD"
    reservasConfirmadas: { horaInicio: string; horaFin: string; id: string }[] = [],
    retencionesActivas: Map<string, { clienteId: string; expira: number }> = new Map()
  ): HorarioSlot[] {
    const slots: HorarioSlot[] = [];
    const fechaObj = new Date(fechaISO + 'T12:00:00');
    const diaSemana = fechaObj.getDay(); // 0 a 6

    // Filtrar reglas que aplican para este día de la semana
    const reglasDia = reglas.filter(r => r.aplicaEnDia(diaSemana));

    for (const regla of reglasDia) {
      const minutosInicio = this.horaAMinutos(regla.horaInicio);
      const minutosFin = this.horaAMinutos(regla.horaFin);
      const duracion = regla.duracionMinutos || 60;

      for (let m = minutosInicio; m + duracion <= minutosFin; m += duracion) {
        const horaIniStr = this.minutosAHora(m);
        const horaFinStr = this.minutosAHora(m + duracion);
        const slotId = `${canchaId}_${fechaISO}_${horaIniStr}`;

        const precio = regla.precioEspecial || precioBase;
        const slot = new HorarioSlot(
          slotId,
          canchaId,
          fechaISO,
          horaIniStr,
          horaFinStr,
          precio,
          'LIBRE'
        );

        // 1. Revisar si hay bloqueo (RF-05)
        const bloqueo = bloqueos.find(b => b.colisionaCon(fechaISO, horaIniStr, horaFinStr));
        if (bloqueo) {
          slot.bloquear(bloqueo.motivo);
          slots.push(slot);
          continue;
        }

        // 2. Revisar si hay reserva confirmada (RF-06 y RF-09)
        const reserva = reservasConfirmadas.find(
          r => r.horaInicio === horaIniStr && r.horaFin === horaFinStr
        );
        if (reserva) {
          slot.confirmarReserva(reserva.id);
          slots.push(slot);
          continue;
        }

        // 3. Revisar si hay retención activa (RF-08)
        const retencion = retencionesActivas.get(slotId);
        if (retencion && retencion.expira > Date.now()) {
          slot.retener(retencion.clienteId, Math.ceil((retencion.expira - Date.now()) / 60000));
        }

        slots.push(slot);
      }
    }

    // Ordenar cronológicamente
    return slots.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  private static horaAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private static minutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
