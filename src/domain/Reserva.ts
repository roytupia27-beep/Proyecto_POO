/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Dominio POO: Reservas, Pagos y Políticas de Cancelación (Strategy Pattern)
 */

export type TipoPagoModalidad = 'ADELANTO_50' | 'TOTAL_100';
export type EstadoReserva = 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';
export type MetodoPago = 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'EFECTIVO_CANCHA';
export type EstadoTransaccion = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';

/**
 * Entidad TransaccionPago (POO: Entidad de Dominio)
 */
export class TransaccionPago {
  public readonly id: string;
  public readonly reservaId: string;
  public readonly monto: number;
  public readonly metodo: MetodoPago;
  public readonly tipo: TipoPagoModalidad | 'SALDO_EN_CANCHA';
  public readonly comprobanteUrl?: string;
  public readonly numeroOperacion?: string;
  public readonly fechaRegistro: string;
  private _estado: EstadoTransaccion;
  private _notaAprobacion?: string;

  constructor(
    id: string,
    reservaId: string,
    monto: number,
    metodo: MetodoPago,
    tipo: TipoPagoModalidad | 'SALDO_EN_CANCHA',
    estado: EstadoTransaccion = 'EN_REVISION',
    comprobanteUrl?: string,
    numeroOperacion?: string,
    fechaRegistro?: string,
    notaAprobacion?: string
  ) {
    this.id = id;
    this.reservaId = reservaId;
    this.monto = monto;
    this.metodo = metodo;
    this.tipo = tipo;
    this._estado = estado;
    this.comprobanteUrl = comprobanteUrl;
    this.numeroOperacion = numeroOperacion;
    this.fechaRegistro = fechaRegistro || new Date().toISOString();
    this._notaAprobacion = notaAprobacion;
  }

  get estado(): EstadoTransaccion { return this._estado; }
  get notaAprobacion(): string | undefined { return this._notaAprobacion; }

  public aprobar(nota?: string): void {
    this._estado = 'APROBADO';
    this._notaAprobacion = nota || 'Aprobado por el propietario';
  }

  public rechazar(motivo: string): void {
    this._estado = 'RECHAZADO';
    this._notaAprobacion = motivo;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      reservaId: this.reservaId,
      monto: this.monto,
      metodo: this.metodo,
      tipo: this.tipo,
      estado: this._estado,
      comprobanteUrl: this.comprobanteUrl,
      numeroOperacion: this.numeroOperacion,
      fechaRegistro: this.fechaRegistro,
      notaAprobacion: this._notaAprobacion,
    };
  }
}

/**
 * RF-10: Patrón Strategy para Políticas de Cancelación (POO)
 */
export interface ResultadoCalculoCancelacion {
  porcentajeReembolso: number;
  montoReembolso: number;
  horasDeAntelacion: number;
  aplicaReembolso: boolean;
  politicaAplicada: string;
  explicacion: string;
}

export interface IPoliticaCancelacion {
  calcular(reserva: Reserva, fechaCancelacion: Date): ResultadoCalculoCancelacion;
}

/**
 * RF-10: Criterio especificado:
 * - Reembolso total (100%) con > 24 h de antelación
 * - Reembolso 50% con 12 h a 24 h de antelación
 * - Reembolso 0% (ninguno) con menos de 12 h
 */
export class PoliticaCancelacionEstandar implements IPoliticaCancelacion {
  public calcular(reserva: Reserva, fechaCancelacion: Date = new Date()): ResultadoCalculoCancelacion {
    const fechaHoraInicio = new Date(`${reserva.fecha}T${reserva.horaInicio}:00`);
    const diffMs = fechaHoraInicio.getTime() - fechaCancelacion.getTime();
    const horasAntelacion = Math.max(0, diffMs / (1000 * 60 * 60));

    let porcentaje = 0;
    let explicacion = '';

    if (horasAntelacion >= 24) {
      porcentaje = 100;
      explicacion = `Cancelación con ${horasAntelacion.toFixed(1)}h de anticipación (mayor a 24h). Corresponde reembolso total del 100% de lo pagado.`;
    } else if (horasAntelacion >= 12) {
      porcentaje = 50;
      explicacion = `Cancelación con ${horasAntelacion.toFixed(1)}h de anticipación (entre 12h y 24h). Corresponde reembolso parcial del 50% de lo pagado.`;
    } else {
      porcentaje = 0;
      explicacion = `Cancelación con ${horasAntelacion.toFixed(1)}h de anticipación (menos de 12h). Según la política de la sede, no aplica reembolso monetario.`;
    }

    const montoReembolso = (reserva.montoPagado * porcentaje) / 100;

    return {
      porcentajeReembolso: porcentaje,
      montoReembolso: Math.round(montoReembolso * 100) / 100,
      horasDeAntelacion: Math.round(horasAntelacion * 10) / 10,
      aplicaReembolso: montoReembolso > 0,
      politicaAplicada: 'Política Pukllay Estándar (24h/12h)',
      explicacion,
    };
  }
}

/**
 * RF-08, RF-09, RF-10, RF-11: Clase Reserva
 */
export class Reserva {
  public readonly id: string;
  public readonly clienteId: string;
  public readonly clienteNombre: string;
  public readonly clienteTelefono: string;
  public readonly sedeId: string;
  public readonly sedeNombre: string;
  public readonly canchaId: string;
  public readonly canchaNombre: string;
  public readonly fecha: string;       // "YYYY-MM-DD"
  public readonly horaInicio: string;  // "19:00"
  public readonly horaFin: string;     // "20:00"
  public readonly precioTotal: number;
  public readonly tipoPagoModalidad: TipoPagoModalidad;
  
  private _montoPagado: number;
  private _saldoPendiente: number;
  private _estado: EstadoReserva;
  private _transacciones: TransaccionPago[];
  private _motivoCancelacion?: string;
  private _montoReembolsado?: number;
  private _politicaCancelacion: IPoliticaCancelacion;
  public readonly createdAt: string;
  public updatedAt: string;

  constructor(
    id: string,
    clienteId: string,
    clienteNombre: string,
    clienteTelefono: string,
    sedeId: string,
    sedeNombre: string,
    canchaId: string,
    canchaNombre: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    precioTotal: number,
    tipoPagoModalidad: TipoPagoModalidad,
    montoPagado: number,
    estado: EstadoReserva = 'PENDIENTE_PAGO',
    transacciones: TransaccionPago[] = [],
    politica?: IPoliticaCancelacion,
    createdAt?: string
  ) {
    this.id = id;
    this.clienteId = clienteId;
    this.clienteNombre = clienteNombre;
    this.clienteTelefono = clienteTelefono;
    this.sedeId = sedeId;
    this.sedeNombre = sedeNombre;
    this.canchaId = canchaId;
    this.canchaNombre = canchaNombre;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.precioTotal = precioTotal;
    this.tipoPagoModalidad = tipoPagoModalidad;
    this._montoPagado = montoPagado;
    this._saldoPendiente = Math.max(0, precioTotal - montoPagado);
    this._estado = estado;
    this._transacciones = transacciones;
    this._politicaCancelacion = politica || new PoliticaCancelacionEstandar();
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Encapsulamiento
  get montoPagado(): number { return this._montoPagado; }
  get saldoPendiente(): number { return this._saldoPendiente; }
  get estado(): EstadoReserva { return this._estado; }
  get transacciones(): TransaccionPago[] { return [...this._transacciones]; }
  get motivoCancelacion(): string | undefined { return this._motivoCancelacion; }
  get montoReembolsado(): number | undefined { return this._montoReembolsado; }

  public agregarTransaccion(tx: TransaccionPago): void {
    this._transacciones.push(tx);
    if (tx.estado === 'APROBADO') {
      this._montoPagado += tx.monto;
      this._saldoPendiente = Math.max(0, this.precioTotal - this._montoPagado);
      if (this._estado === 'PENDIENTE_PAGO') {
        this._estado = 'CONFIRMADA';
      }
    }
    this.updatedAt = new Date().toISOString();
  }

  public confirmarReserva(): void {
    this._estado = 'CONFIRMADA';
    this.updatedAt = new Date().toISOString();
  }

  public aprobarPagoPropietario(nota?: string): void {
    if (this._transacciones.length > 0) {
      this._transacciones[0].aprobar(nota);
    }
    this._estado = 'CONFIRMADA';
    this.updatedAt = new Date().toISOString();
  }

  public rechazarPagoPropietario(motivo: string): void {
    if (this._transacciones.length > 0) {
      this._transacciones[0].rechazar(motivo);
    }
    this._estado = 'CANCELADA';
    this._motivoCancelacion = motivo;
    this.updatedAt = new Date().toISOString();
  }

  public completarReserva(): void {
    this._estado = 'COMPLETADA';
    this._saldoPendiente = 0;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * RF-10: Pre-cálculo de reembolso según política sin mutar el estado
   */
  public precalcularCancelacion(ahora: Date = new Date()): ResultadoCalculoCancelacion {
    return this._politicaCancelacion.calcular(this, ahora);
  }

  /**
   * RF-10: Cancelación de reservas con política
   */
  public cancelar(motivo: string, ahora: Date = new Date()): ResultadoCalculoCancelacion {
    if (this._estado === 'CANCELADA') {
      throw new Error('Esta reserva ya se encuentra cancelada.');
    }
    if (this._estado === 'COMPLETADA') {
      throw new Error('No se puede cancelar un partido que ya fue disputado.');
    }

    const calculo = this._politicaCancelacion.calcular(this, ahora);
    this._estado = 'CANCELADA';
    this._motivoCancelacion = motivo;
    this._montoReembolsado = calculo.montoReembolso;
    this.updatedAt = new Date().toISOString();

    return calculo;
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      clienteId: this.clienteId,
      clienteNombre: this.clienteNombre,
      clienteTelefono: this.clienteTelefono,
      sedeId: this.sedeId,
      sedeNombre: this.sedeNombre,
      canchaId: this.canchaId,
      canchaNombre: this.canchaNombre,
      fecha: this.fecha,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      precioTotal: this.precioTotal,
      tipoPagoModalidad: this.tipoPagoModalidad,
      montoPagado: this._montoPagado,
      saldoPendiente: this._saldoPendiente,
      estado: this._estado,
      transacciones: this._transacciones.map(t => t.toJSON()),
      motivoCancelacion: this._motivoCancelacion,
      montoReembolsado: this._montoReembolsado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
