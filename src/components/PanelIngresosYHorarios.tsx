/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Panel de Control de Ingresos y Horarios de Canchas por Fecha con Gráfica Simple
 */

import React, { useState, useMemo, useEffect } from 'react';
import { PukllayService } from '../domain/PukllayService.ts';
import { Usuario } from '../domain/Usuario.ts';
import { Sede, Cancha } from '../domain/Sede.ts';
import { Reserva } from '../domain/Reserva.ts';
import { 
  BarChart3, DollarSign, Calendar, Clock, ChevronLeft, ChevronRight, 
  TrendingUp, CheckCircle2, AlertCircle, Phone, ExternalLink, 
  Eye, Lock, ArrowUpRight, Ban, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';

interface PanelIngresosYHorariosProps {
  usuarioActual: Usuario;
  sede: Sede;
  onVerNotificaciones?: () => void;
}

export const PanelIngresosYHorarios: React.FC<PanelIngresosYHorariosProps> = ({
  usuarioActual,
  sede,
  onVerNotificaciones,
}) => {
  const service = PukllayService.getInstance();
  const hoyISO = service.obtenerFechaHoyISO();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = service.suscribir(() => setTick(t => t + 1));
    return () => unsub();
  }, [service]);

  // Fecha seleccionada para el análisis de ingresos y horarios
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyISO);

  // Modal de detalle de turno / reserva seleccionada
  const [reservaDetalle, setReservaDetalle] = useState<Reserva | null>(null);
  const [errorAprobacion, setErrorAprobacion] = useState<string | null>(null);

  // Reservas de la sede
  const reservasSede = useMemo(() => {
    return service.obtenerReservasPorSede(sede.id);
  }, [sede.id, service, tick]);

  // Navegar días
  const cambiarDia = (offsetDias: number) => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + offsetDias);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFechaSeleccionada(`${yyyy}-${mm}-${dd}`);
  };

  // Formato legible de la fecha en español
  const fechaTextoFormateada = useMemo(() => {
    const d = new Date(fechaSeleccionada + 'T12:00:00');
    return d.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [fechaSeleccionada]);

  // Reservas activas en la fecha seleccionada
  const reservasFecha = useMemo(() => {
    return reservasSede.filter(
      r => r.fecha === fechaSeleccionada && r.estado !== 'CANCELADA'
    );
  }, [reservasSede, fechaSeleccionada]);

  // Métricas financieras del día
  const kpisDia = useMemo(() => {
    let recaudado = 0;
    let porCobrarCancha = 0;
    let totalEsperado = 0;
    let reservasConfirmadas = 0;
    let reservasPendientes = 0;

    reservasFecha.forEach(r => {
      recaudado += r.montoPagado;
      porCobrarCancha += r.saldoPendiente;
      totalEsperado += r.precioTotal;
      if (r.estado === 'CONFIRMADA') reservasConfirmadas++;
      if (r.estado === 'PENDIENTE_PAGO') reservasPendientes++;
    });

    // Calcular ocupación de slots en todas las canchas de la sede
    let totalSlotsDisponibles = 0;
    let slotsOcupados = 0;

    sede.canchas.filter(c => c.activa).forEach(cancha => {
      const slots = service.obtenerSlotsCancha(cancha.id, fechaSeleccionada);
      totalSlotsDisponibles += slots.length;
      slotsOcupados += slots.filter(s => s.estado === 'RESERVADO' || s.estado === 'RETENIDO').length;
    });

    const porcentajeOcupacion = totalSlotsDisponibles > 0 
      ? Math.round((slotsOcupados / totalSlotsDisponibles) * 100) 
      : 0;

    return {
      recaudado,
      porCobrarCancha,
      totalEsperado,
      reservasConfirmadas,
      reservasPendientes,
      totalPartidos: reservasFecha.length,
      totalSlotsDisponibles,
      slotsOcupados,
      porcentajeOcupacion
    };
  }, [reservasFecha, sede, fechaSeleccionada, service]);

  // Datos para la gráfica simple de ingresos de los últimos 7 días
  const datosGrafica7Dias = useMemo(() => {
    const dias: {
      fechaISO: string;
      nombreDia: string;
      diaMes: string;
      recaudado: number;
      saldoPendiente: number;
      totalPartidos: number;
      esSeleccionado: boolean;
    }[] = [];

    const baseDate = new Date(fechaSeleccionada + 'T12:00:00');

    // Generar 7 días centrados o terminando en la fecha
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;

      const resDelDia = reservasSede.filter(
        r => r.fecha === iso && r.estado !== 'CANCELADA'
      );

      const recaudado = resDelDia.reduce((sum, r) => sum + r.montoPagado, 0);
      const saldo = resDelDia.reduce((sum, r) => sum + r.saldoPendiente, 0);

      const nombresCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      dias.push({
        fechaISO: iso,
        nombreDia: nombresCortos[d.getDay()],
        diaMes: `${d.getDate()}/${d.getMonth() + 1}`,
        recaudado,
        saldoPendiente: saldo,
        totalPartidos: resDelDia.length,
        esSeleccionado: iso === fechaSeleccionada,
      });
    }

    const maxMonto = Math.max(...dias.map(d => d.recaudado + d.saldoPendiente), 100);

    return { dias, maxMonto };
  }, [reservasSede, fechaSeleccionada]);

  // Ingresos por cada cancha de la sede en la fecha seleccionada
  const ingresosPorCancha = useMemo(() => {
    return sede.canchas.map(cancha => {
      const resCancha = reservasFecha.filter(r => r.canchaId === cancha.id);
      const recaudado = resCancha.reduce((sum, r) => sum + r.montoPagado, 0);
      const saldo = resCancha.reduce((sum, r) => sum + r.saldoPendiente, 0);
      const total = recaudado + saldo;
      return {
        cancha,
        recaudado,
        saldo,
        total,
        partidosCount: resCancha.length
      };
    });
  }, [sede.canchas, reservasFecha]);

  // Generar la matriz de horarios de cada cancha para el día seleccionado
  const matrizHorariosPorCancha = useMemo(() => {
    return sede.canchas.map(cancha => {
      const slots = service.obtenerSlotsCancha(cancha.id, fechaSeleccionada);
      return {
        cancha,
        slots,
      };
    });
  }, [sede.canchas, fechaSeleccionada, service, tick]);

  // Horas únicas para el encabezado del cronograma (ej. 07:00 a 23:00)
  const horasColumnas = useMemo(() => {
    const setHoras = new Set<string>();
    matrizHorariosPorCancha.forEach(item => {
      item.slots.forEach(slot => {
        setHoras.add(slot.horaInicio);
      });
    });
    return Array.from(setHoras).sort();
  }, [matrizHorariosPorCancha]);

  // Aprobar pago rápido
  const handleAprobarPago = (reservaId: string) => {
    try {
      setErrorAprobacion(null);
      service.aprobarPagoYConfirmarReserva(reservaId, 'Aprobado desde panel de ingresos');
      if (reservaDetalle && reservaDetalle.id === reservaId) {
        const updated = service.obtenerReservasPorSede(sede.id).find(r => r.id === reservaId);
        if (updated) setReservaDetalle(updated);
      }
    } catch (e: any) {
      setErrorAprobacion(e.message || 'Error al aprobar');
      setTimeout(() => setErrorAprobacion(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {errorAprobacion && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorAprobacion}</span>
        </div>
      )}
      
      {/* 1. BARRA SUPERIOR DE CONTROL DE FECHA */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Control de Ingresos & Horarios
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {sede.nombre}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 capitalize">
            {fechaTextoFormateada}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea los ingresos generados, abonos pendientes y la ocupación horaria de tus canchas.
          </p>
        </div>

        {/* Selector de Fecha y Botones Rápidos */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <button
            onClick={() => cambiarDia(-1)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            title="Día anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <button
            onClick={() => setFechaSeleccionada(hoyISO)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              fechaSeleccionada === hoyISO
                ? 'bg-emerald-600 text-white font-black'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            Hoy
          </button>

          <button
            onClick={() => cambiarDia(1)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            title="Día siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. TARJETAS DE KPIS FINANCIEROS Y OPERATIVOS DEL DÍA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ingresos Recaudados */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden border border-emerald-900/50">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Abonos Recaudados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              S/. {kpisDia.recaudado}
            </span>
            <span className="text-xs text-slate-400 font-mono">.00</span>
          </div>
          <p className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{kpisDia.reservasConfirmadas} reservas confirmadas</span>
          </p>
        </div>

        {/* KPI 2: Saldo por Cobrar en Cancha */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Saldo por Cobrar en Cancha</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              S/. {kpisDia.porCobrarCancha}
            </span>
            <span className="text-xs text-slate-400 font-mono">.00</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-1">
            Dinero a cobrar a los clientes antes de entrar a jugar
          </p>
        </div>

        {/* KPI 3: Partidos / Horas Reservadas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Turnos Reservados</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {kpisDia.totalPartidos}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">horas programadas</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpisDia.reservasPendientes > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ⚠️ {kpisDia.reservasPendientes} turno(s) por validar comprobante
              </span>
            ) : (
              'Todos los turnos al día'
            )}
          </p>
        </div>

        {/* KPI 4: Tasa de Ocupación */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Tasa de Ocupación</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center font-black text-indigo-700 dark:text-indigo-400 text-xs">
              %
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {kpisDia.porcentajeOcupacion}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({kpisDia.slotsOcupados}/{kpisDia.totalSlotsDisponibles} slots)
            </span>
          </div>
          
          {/* Barra de progreso de ocupación */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpisDia.porcentajeOcupacion)}%` }}
            ></div>
          </div>
        </div>

      </div>

      {/* 3. SECCIÓN DE GRÁFICA SIMPLE: INGRESOS DE LOS ÚLTIMOS 7 DÍAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfica de Barras Simple: Ingresos Diarios */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Gráfica Simple de Ingresos (Últimos 7 Días)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Haz clic en cualquier barra para saltar a ese día y ver sus horarios detallados.
              </p>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-3 rounded-md bg-emerald-600"></span> Recaudado
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded-md bg-amber-400"></span> Saldo en Cancha
              </span>
            </div>
          </div>

          {/* Gráfica de Barras Verticales SVG / HTML */}
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
            {datosGrafica7Dias.dias.map((d) => {
              const totalDia = d.recaudado + d.saldoPendiente;
              const alturaPorc = Math.max(12, Math.round((totalDia / datosGrafica7Dias.maxMonto) * 100));
              const porcRecaudado = totalDia > 0 ? (d.recaudado / totalDia) * 100 : 100;

              return (
                <div
                  key={d.fechaISO}
                  onClick={() => setFechaSeleccionada(d.fechaISO)}
                  className={`flex-1 flex flex-col items-center cursor-pointer group transition-transform ${
                    d.esSeleccionado ? 'scale-105' : 'hover:scale-102'
                  }`}
                >
                  {/* Etiqueta de Monto encima de la barra */}
                  <span className={`text-[10px] sm:text-xs font-mono font-black mb-1.5 transition-colors ${
                    d.esSeleccionado ? 'text-emerald-700' : 'text-slate-600 group-hover:text-slate-900'
                  }`}>
                    {totalDia > 0 ? `S/.${totalDia}` : 'S/.0'}
                  </span>

                  {/* Barra Visual */}
                  <div className={`w-full max-w-[48px] rounded-2xl overflow-hidden transition-all shadow-sm ${
                    d.esSeleccionado 
                      ? 'ring-2 ring-emerald-500 shadow-md ring-offset-2' 
                      : 'opacity-85 group-hover:opacity-100'
                  }`}
                  style={{ height: `${alturaPorc}%` }}
                  >
                    <div className="w-full h-full flex flex-col justify-end bg-slate-100">
                      {/* Porción Saldo pendiente */}
                      {d.saldoPendiente > 0 && (
                        <div 
                          className="w-full bg-amber-400"
                          style={{ height: `${100 - porcRecaudado}%` }}
                          title={`Saldo por cobrar: S/. ${d.saldoPendiente}`}
                        ></div>
                      )}
                      {/* Porción Recaudada */}
                      <div 
                        className={`w-full ${d.esSeleccionado ? 'bg-gradient-to-t from-emerald-700 to-emerald-500' : 'bg-emerald-600'}`}
                        style={{ height: `${porcRecaudado}%` }}
                        title={`Recaudado: S/. ${d.recaudado}`}
                      ></div>
                    </div>
                  </div>

                  {/* Nombre del Día y Fecha */}
                  <div className="mt-2 text-center">
                    <span className={`text-xs font-black block leading-none ${
                      d.esSeleccionado ? 'text-emerald-800' : 'text-slate-700'
                    }`}>
                      {d.nombreDia}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {d.diaMes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Día seleccionado: <strong className="text-emerald-800">{fechaTextoFormateada}</strong></span>
            <span>Total proyectado del día: <strong className="text-slate-900 font-mono">S/. {kpisDia.totalEsperado}</strong></span>
          </div>
        </div>

        {/* Gráfica 2: Rendimiento por Cancha en la Fecha */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Ingresos por Cancha
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Participación económica en la fecha seleccionada.
            </p>

            <div className="space-y-4">
              {ingresosPorCancha.map(({ cancha, recaudado, saldo, total, partidosCount }) => {
                const porc = kpisDia.totalEsperado > 0 ? Math.round((total / kpisDia.totalEsperado) * 100) : 0;
                return (
                  <div key={cancha.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 truncate max-w-[160px]">{cancha.nombre}</span>
                      <span className="font-mono font-black text-emerald-800">S/. {total}</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 mb-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${porc}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{partidosCount} turno(s)</span>
                      <span>{porc}% de los ingresos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {kpisDia.reservasPendientes > 0 && onVerNotificaciones && (
            <button
              onClick={onVerNotificaciones}
              className="mt-4 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Ver {kpisDia.reservasPendientes} Pago(s) Pendiente(s)</span>
            </button>
          )}
        </div>

      </div>

      {/* 4. MATRIZ VISUAL DE HORARIOS DE LAS CANCHAS SEGÚN LA FECHA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Cronograma y Horarios de Canchas ({fechaTextoFormateada})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Visualiza en tiempo real qué horas están libres, en proceso de abono o reservadas. Haz clic en cualquier turno para ver al cliente.
            </p>
          </div>

          {/* Leyenda de Colores */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-800">
              <span className="w-3 h-3 rounded bg-emerald-500"></span> Libre
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-3 h-3 rounded bg-amber-400"></span> Por Validar
            </span>
            <span className="flex items-center gap-1 text-rose-700">
              <span className="w-3 h-3 rounded bg-rose-500"></span> Reservado
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-3 h-3 rounded bg-slate-300"></span> Bloqueado
            </span>
          </div>
        </div>

        {/* Tablero Horario Horizontal con Scroll */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[800px] space-y-3">
            {matrizHorariosPorCancha.map(({ cancha, slots }) => (
              <div key={cancha.id} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      {cancha.nombre}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {cancha.deporte}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      S/. {cancha.precioBaseHora}/hr
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    {slots.filter(s => s.estado === 'RESERVADO').length} de {slots.length} turnos ocupados
                  </span>
                </div>

                {/* Slots del día */}
                {slots.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay horarios configurados para este día.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                    {slots.map(slot => {
                      // Buscar si existe reserva asociada a este slot
                      const reserva = reservasFecha.find(
                        r => r.canchaId === cancha.id && r.horaInicio === slot.horaInicio
                      );

                      const esLibre = slot.estado === 'LIBRE';
                      const esBloqueado = slot.estado === 'BLOQUEADO';
                      const esPendiente = reserva?.estado === 'PENDIENTE_PAGO' || slot.estado === 'RETENIDO';
                      const esConfirmado = reserva?.estado === 'CONFIRMADA' || (slot.estado === 'RESERVADO' && !esPendiente);

                      return (
                        <div
                          key={slot.id}
                          onClick={() => {
                            if (reserva) setReservaDetalle(reserva);
                          }}
                          className={`p-2 rounded-xl text-center border transition-all select-none ${
                            reserva ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                          } ${
                            esConfirmado
                              ? 'bg-rose-50 text-rose-950 border-rose-300 ring-1 ring-rose-400/20'
                              : esPendiente
                              ? 'bg-amber-50 text-amber-950 border-amber-300 animate-pulse'
                              : esBloqueado
                              ? 'bg-slate-200 text-slate-500 border-slate-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
                          }`}
                          title={
                            reserva
                              ? `${reserva.clienteNombre} (${reserva.clienteTelefono}) - ${reserva.estado}`
                              : esBloqueado
                              ? `Bloqueado: ${slot.motivoBloqueo || 'Mantenimiento'}`
                              : `Disponible: S/. ${slot.precio}`
                          }
                        >
                          <span className="font-mono font-bold text-xs block leading-tight">
                            {slot.horaInicio}
                          </span>
                          <span className="text-[10px] block opacity-80 mt-0.5 truncate">
                            {esConfirmado
                              ? (reserva ? reserva.clienteNombre.split(' ')[0] : 'Ocupado')
                              : esPendiente
                              ? 'Por Validar'
                              : esBloqueado
                              ? 'Bloqueado'
                              : `S/.${slot.precio}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. MODAL DE DETALLE DE RESERVA / CLIENTE SELECCIONADO EN EL CRONOGRAMA */}
      {reservaDetalle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setReservaDetalle(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Detalle del Turno Programado
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {reservaDetalle.canchaNombre}
                </h4>
              </div>
              <button
                onClick={() => setReservaDetalle(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Horario:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {reservaDetalle.fecha} • {reservaDetalle.horaInicio} a {reservaDetalle.horaFin}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  reservaDetalle.estado === 'CONFIRMADA'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}>
                  {reservaDetalle.estado === 'CONFIRMADA' ? 'Confirmado' : 'Por Validar'}
                </span>
              </div>

              {/* Datos del Cliente */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Cliente Pelotero:</span>
                <p className="font-bold text-slate-900 text-sm">{reservaDetalle.clienteNombre}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {reservaDetalle.clienteTelefono}
                  </span>
                  <a
                    href={`https://wa.me/51${reservaDetalle.clienteTelefono}?text=Hola%20${encodeURIComponent(reservaDetalle.clienteNombre)},%20te%20escribo%20de%20${encodeURIComponent(sede.nombre)}%20respecto%20a%20tu%20reserva%20en%20Pukllay%20Sport.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Desglose de Pago */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Abono Inicial:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    S/. {reservaDetalle.montoPagado}.00
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {reservaDetalle.tipoPagoModalidad === 'ADELANTO_50' ? '50% Adelanto' : '100% Total'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Saldo en Cancha:</span>
                  <span className="font-mono font-black text-amber-800 text-sm">
                    S/. {reservaDetalle.saldoPendiente}.00
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {reservaDetalle.saldoPendiente === 0 ? 'Totalmente saldado' : 'Por cobrar en ingreso'}
                  </span>
                </div>
              </div>

              {/* Nro de Operación */}
              <div className="flex items-center justify-between text-slate-500 text-[11px] px-1">
                <span>N° Operación: <strong className="font-mono text-slate-800">{reservaDetalle.transacciones[0]?.numeroOperacion || 'S/N'}</strong></span>
                <span>Código: <strong className="font-mono text-slate-800">{reservaDetalle.id}</strong></span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t flex items-center justify-end gap-2">
              {reservaDetalle.estado === 'PENDIENTE_PAGO' && (
                <button
                  type="button"
                  onClick={() => handleAprobarPago(reservaDetalle.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Aprobar Pago Ahora</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setReservaDetalle(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
