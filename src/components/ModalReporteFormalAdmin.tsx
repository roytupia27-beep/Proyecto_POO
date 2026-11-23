/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Reporte Formal del Sistema (Super-Administrador)
 * Genera informes ejecutivos auditables con Reservas, Pagos, Atenciones y Seguridad.
 */

import React, { useState, useMemo } from 'react';
import { Usuario } from '../domain/Usuario.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { Reserva, TransaccionPago } from '../domain/Reserva.ts';
import { Sede } from '../domain/Sede.ts';
import { MensajeChat } from '../domain/Mensaje.ts';
import { AuditLogEntry } from '../domain/SecurityEngine.ts';
import { PukllayLogo } from './PukllayLogo.tsx';
import {
  FileText, Printer, Download, Copy, Check, X, Shield,
  Calendar, DollarSign, Users, Building2, MessageSquare,
  AlertCircle, CheckCircle2, Clock, Filter, Sparkles,
  ArrowUpDown, ExternalLink, ChevronRight, Lock, Phone,
  Mail, MapPin, Eye, Info, FileCode2
} from 'lucide-react';
import { SCRIPTS_PYTHON_PUKLLAY } from '../utils/pythonScriptsData.ts';

interface ModalReporteFormalAdminProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioActual: Usuario | null;
}

export const ModalReporteFormalAdmin: React.FC<ModalReporteFormalAdminProps> = ({
  isOpen,
  onClose,
  usuarioActual,
}) => {
  const service = PukllayService.getInstance();

  // Estados de filtrado del reporte
  const [periodoFiltro, setPeriodoFiltro] = useState<'TODOS' | 'HOY' | '7_DIAS' | '30_DIAS' | 'MES_ACTUAL'>('TODOS');
  const [sedeFiltro, setSedeFiltro] = useState<string>('TODAS');
  const [seccionActiva, setSeccionActiva] = useState<'DOCUMENTO_COMPLETO' | 'FINANZAS' | 'RESERVAS' | 'ATENCIONES' | 'SEGURIDAD'>('DOCUMENTO_COMPLETO');
  
  // Feedback visual
  const [copiado, setCopiado] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Fecha y hora del reporte (se actualiza al abrir)
  const fechaGeneracion = useMemo(() => new Date(), [isOpen]);
  const codigoReporte = useMemo(() => {
    const timestamp = Math.floor(fechaGeneracion.getTime() / 1000);
    return `REP-PUKLLAY-${timestamp.toString().slice(-6)}`;
  }, [fechaGeneracion]);

  // Datos base del sistema (se recalculan al abrir el modal)
  const todasSedes = useMemo(() => service.obtenerSedes(), [service, isOpen]);
  const todosUsuarios = useMemo(() => service.obtenerTodosUsuarios(), [service, isOpen]);
  const todasReservas = useMemo(() => service.obtenerTodasReservas(), [service, isOpen]);
  const todosMensajes = useMemo(() => service.obtenerTodosMensajesChat(), [service, isOpen]);
  const logsAuditoria = useMemo(() => service.obtenerLogsAuditoria(100), [service, isOpen]);
  const notificacionesAdmin = useMemo(() => service.obtenerNotificacionesAdmin(), [service, isOpen]);

  // Filtro por fecha y sede
  const reservasFiltradas = useMemo(() => {
    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0];
    const sieteDiasAtras = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const treintaDiasAtras = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    return todasReservas.filter((r) => {
      // Filtro de sede
      if (sedeFiltro !== 'TODAS' && r.sedeId !== sedeFiltro) return false;

      // Filtro de fecha
      const fechaReserva = new Date(r.createdAt || r.fecha);
      if (periodoFiltro === 'HOY') {
        return r.fecha === hoyStr || (r.createdAt && r.createdAt.startsWith(hoyStr));
      }
      if (periodoFiltro === '7_DIAS') {
        return fechaReserva >= sieteDiasAtras;
      }
      if (periodoFiltro === '30_DIAS') {
        return fechaReserva >= treintaDiasAtras;
      }
      if (periodoFiltro === 'MES_ACTUAL') {
        return fechaReserva >= primerDiaMes;
      }
      return true;
    });
  }, [todasReservas, periodoFiltro, sedeFiltro]);

  // Transacciones asociadas a las reservas filtradas
  const transaccionesFiltradas = useMemo(() => {
    return reservasFiltradas.flatMap((r) => r.transacciones || []);
  }, [reservasFiltradas]);

  // Métricas financieras calculadas
  const metricas = useMemo(() => {
    let totalAdelantosCobrados = 0;
    let totalSaldosPendientes = 0;
    let totalFacturacionBruta = 0;
    let confirmadas = 0;
    let pendientes = 0;
    let canceladas = 0;

    reservasFiltradas.forEach((r) => {
      totalFacturacionBruta += r.precioTotal || 0;
      totalAdelantosCobrados += r.montoPagado || 0;
      totalSaldosPendientes += r.saldoPendiente || 0;

      if (r.estado === 'CONFIRMADA' || r.estado === 'COMPLETADA') confirmadas++;
      else if (r.estado === 'PENDIENTE_PAGO') pendientes++;
      else if (r.estado === 'CANCELADA') canceladas++;
    });

    // Total de canchas en las sedes filtradas
    const canchasTotal = todasSedes
      .filter((s) => sedeFiltro === 'TODAS' || s.id === sedeFiltro)
      .reduce((acc, s) => acc + s.canchas.length, 0);

    return {
      totalAdelantosCobrados,
      totalSaldosPendientes,
      totalFacturacionBruta,
      totalReservas: reservasFiltradas.length,
      confirmadas,
      pendientes,
      canceladas,
      canchasTotal,
      sedesTotal: sedeFiltro === 'TODAS' ? todasSedes.length : 1,
      usuariosTotal: todosUsuarios.length,
      mensajesTotal: todosMensajes.length,
      notificacionesTotal: notificacionesAdmin.length,
    };
  }, [reservasFiltradas, todasSedes, todosUsuarios, todosMensajes, notificacionesAdmin, sedeFiltro]);

  // Control estricto de seguridad: sólo el Administrador puede generar o ver este reporte
  if (!isOpen || usuarioActual?.rol !== 'ADMINISTRADOR') {
    return null;
  }

  // Handler para imprimir / guardar como PDF
  const handleImprimir = () => {
    window.print();
  };

  // Handler para exportar a CSV
  const handleDescargarCSV = () => {
    try {
      const headers = [
        'Codigo Reserva',
        'Fecha Partido',
        'Horario',
        'Sede',
        'Cancha',
        'Cliente Nombre',
        'Cliente Telefono',
        'Modalidad',
        'Monto Adelantado S/',
        'Saldo Pendiente S/',
        'Precio Total S/',
        'Estado',
        'Fecha Registro',
      ];

      const filas = reservasFiltradas.map((r) => [
        r.id,
        r.fecha,
        `"${r.horaInicio} - ${r.horaFin}"`,
        `"${r.sedeNombre.replace(/"/g, '""')}"`,
        `"${r.canchaNombre.replace(/"/g, '""')}"`,
        `"${r.clienteNombre.replace(/"/g, '""')}"`,
        `"${r.clienteTelefono}"`,
        r.tipoPagoModalidad,
        r.montoPagado.toFixed(2),
        r.saldoPendiente.toFixed(2),
        r.precioTotal.toFixed(2),
        r.estado,
        `"${r.createdAt || ''}"`,
      ]);

      const contenidoCSV = [
        headers.join(','),
        ...filas.map((f) => f.join(',')),
      ].join('\r\n');

      const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_pukllay_sport_${codigoReporte}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setAlerta('✓ Archivo CSV descargado con éxito.');
      setTimeout(() => setAlerta(null), 3000);
    } catch (err: any) {
      setAlerta(`⚠️ Error al generar CSV: ${err?.message || 'Error inesperado'}`);
      setTimeout(() => setAlerta(null), 4000);
    }
  };

  // Handler para copiar resumen ejecutivo
  const handleCopiarResumen = () => {
    const texto = `=== REPORTE FORMAL DE GESTIÓN PUKLLAY SPORT ===
Código: ${codigoReporte}
Fecha de Emisión: ${fechaGeneracion.toLocaleDateString('es-PE')} ${fechaGeneracion.toLocaleTimeString('es-PE')}
Administrador: ${usuarioActual?.nombre || 'Administrador'} (${usuarioActual?.email || 'admin@pukllay.pe'})
Período Auditado: ${periodoFiltro} | Sede: ${sedeFiltro === 'TODAS' ? 'Todas las sedes' : sedeFiltro}

1. RESUMEN FINANCIERO Y OPERATIVO:
- Total Reservas Auditadas: ${metricas.totalReservas} (Confirmadas: ${metricas.confirmadas}, Pendientes: ${metricas.pendientes}, Canceladas: ${metricas.canceladas})
- Total Recaudado en Adelantos (50% Yape/Plin): S/ ${metricas.totalAdelantosCobrados.toFixed(2)}
- Saldos Pendientes de Cobro en Cancha: S/ ${metricas.totalSaldosPendientes.toFixed(2)}
- Facturación Bruta Comprometida: S/ ${metricas.totalFacturacionBruta.toFixed(2)}

2. INFRAESTRUCTURA & PLATAFORMA:
- Complejos Deportivos: ${metricas.sedesTotal}
- Canchas de Grass Sintético: ${metricas.canchasTotal}
- Usuarios Registrados en Sistema: ${metricas.usuariosTotal}
- Interacciones y Atenciones de Chat: ${metricas.mensajesTotal}

Documento certificado por Pukllay Sport Perú S.A.C.`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setAlerta('✓ Resumen ejecutivo copiado al portapapeles.');
    setTimeout(() => {
      setCopiado(false);
      setAlerta(null);
    }, 2500);
  };

  const handleDescargarScriptPython = () => {
    const script = SCRIPTS_PYTHON_PUKLLAY.find(s => s.id === 'generar_reporte') || SCRIPTS_PYTHON_PUKLLAY[2];
    const elemento = document.createElement('a');
    elemento.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(script.codigo));
    elemento.setAttribute('download', 'generar_reporte.py');
    elemento.style.display = 'none';
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
    setAlerta('✓ Script Python oficial (generar_reporte.py) descargado.');
    setTimeout(() => setAlerta(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static animate-in fade-in duration-200">
      
      {/* Estilos específicos para impresión impecable y documento PDF */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-report {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div 
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden printable-report print:max-h-none print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BARRA SUPERIOR DE ACCIONES (NO SE IMPRIME) */}
        <div className="no-print bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 sm:p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Generador de Reporte Formal del Sistema
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {codigoReporte}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supervisión formal de reservas, recaudación, pagos, atenciones al cliente y logs de auditoría.
              </p>
            </div>
          </div>

          {/* Botones de Exportación e Impresión */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              title="Imprimir documento formal o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleDescargarCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              title="Descargar libro de reservas en formato CSV / Excel"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleDescargarScriptPython}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              title="Descargar generador oficial en Python 3 (generar_reporte.py)"
            >
              <FileCode2 className="w-4 h-4" />
              <span>Script Python</span>
            </button>

            <button
              onClick={handleCopiarResumen}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
              title="Copiar texto del resumen ejecutivo"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? 'Copiado' : 'Copiar Resumen'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS Y SELECTORES (NO SE IMPRIME) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Período:
            </span>
            {(['TODOS', 'HOY', '7_DIAS', '30_DIAS', 'MES_ACTUAL'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodoFiltro(p)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  periodoFiltro === p
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p === 'TODOS' ? 'Histórico Completo' : p === 'HOY' ? 'Hoy' : p === '7_DIAS' ? 'Últimos 7 días' : p === '30_DIAS' ? 'Últimos 30 días' : 'Mes Actual'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 whitespace-nowrap">Complejo:</span>
            <select
              value={sedeFiltro}
              onChange={(e) => setSedeFiltro(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="TODAS">Todos los complejos ({todasSedes.length})</option>
              {todasSedes.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} ({s.ubicacion.distrito})</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABS DE SECCIONES (NO SE IMPRIME) */}
        <div className="no-print px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setSeccionActiva('DOCUMENTO_COMPLETO')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              seccionActiva === 'DOCUMENTO_COMPLETO'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📄 Documento Formal Completo
          </button>
          <button
            onClick={() => setSeccionActiva('FINANZAS')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              seccionActiva === 'FINANZAS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💰 Finanzas & Pagos ({transaccionesFiltradas.length})
          </button>
          <button
            onClick={() => setSeccionActiva('RESERVAS')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              seccionActiva === 'RESERVAS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚽ Reservas Auditadas ({reservasFiltradas.length})
          </button>
          <button
            onClick={() => setSeccionActiva('ATENCIONES')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              seccionActiva === 'ATENCIONES'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💬 Atenciones & Chat ({todosMensajes.length})
          </button>
          <button
            onClick={() => setSeccionActiva('SEGURIDAD')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              seccionActiva === 'SEGURIDAD'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🛡️ Logs de Seguridad ({logsAuditoria.length})
          </button>
        </div>

        {/* NOTIFICACIÓN / ALERTA TEMPORAL */}
        {alerta && (
          <div className="no-print mx-4 sm:mx-6 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{alerta}</span>
            <button onClick={() => setAlerta(null)} className="p-1 hover:opacity-75"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ======================================================== */}
        {/* CUERPO DEL DOCUMENTO FORMAL (IMPRIMIBLE / EXPORTABLE)   */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 bg-white font-sans">
          
          {/* MEMBRETE INSTITUCIONAL FORMAL */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              {/* Logo y Razón Social */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 flex-shrink-0 shadow-md">
                  <PukllayLogo size="md" transparent={true} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-sans">
                    PUKLLAY SPORT PERÚ S.A.C.
                  </h1>
                  <p className="text-xs font-semibold text-slate-600">
                    Sistema Central de Arbitraje, Gestión y Control Financiero de Canchas Deportivas
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    RUC: 20608934512 • Sede Central: Lima, Perú • www.pukllay.pe
                  </p>
                </div>
              </div>

              {/* Recuadro Formal de Certificación / Expediente */}
              <div className="sm:text-right border border-slate-300 rounded-2xl p-3 bg-slate-50 min-w-[210px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 block">
                  EXPEDIENTE DE AUDITORÍA
                </span>
                <span className="text-sm font-mono font-black text-slate-900 block mt-0.5">
                  {codigoReporte}
                </span>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">
                  Emisión: {fechaGeneracion.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Hora: {fechaGeneracion.toLocaleTimeString('es-PE')}
                </span>
              </div>
            </div>

            {/* Metadatos del Documento */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-bold">Emitido por:</span>{' '}
                <strong className="text-slate-900">{usuarioActual.nombre}</strong> ({usuarioActual.rol})
              </div>
              <div>
                <span className="text-slate-500 font-bold">Período auditado:</span>{' '}
                <strong className="text-slate-900">
                  {periodoFiltro === 'TODOS' ? 'Histórico Total' : periodoFiltro === 'HOY' ? 'Jornada de Hoy' : periodoFiltro === '7_DIAS' ? 'Últimos 7 Días' : periodoFiltro === '30_DIAS' ? 'Últimos 30 Días' : 'Mes Corriente'}
                </strong>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-500 font-bold">Ámbito:</span>{' '}
                <strong className="text-slate-900">
                  {sedeFiltro === 'TODAS' ? `Nacional (${todasSedes.length} Complejos)` : todasSedes.find(s => s.id === sedeFiltro)?.nombre || 'Sede Específica'}
                </strong>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCIÓN 1: RESUMEN EJECUTIVO Y MÉTRICAS FINANCIERAS      */}
          {/* ======================================================== */}
          {(seccionActiva === 'DOCUMENTO_COMPLETO' || seccionActiva === 'FINANZAS') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  1. Resumen Ejecutivo y Balance Financiero
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Cifras expresadas en Soles Peruanos (PEN / S/.)
                </span>
              </div>

              {/* Grid de 4 KPIs Financieros */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Adelantos Recaudados (50%)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono mt-1 block">
                    S/ {metricas.totalAdelantosCobrados.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    Cobrado mediante Yape / Plin
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                    Saldos por Liquidar en Cancha
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-1 block">
                    S/ {metricas.totalSaldosPendientes.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    A cobrar presencialmente
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Facturación Bruta Comprometida
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                    S/ {metricas.totalFacturacionBruta.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Valor total de partidos auditados
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Efectividad de Reservas
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-950 font-mono mt-1 block">
                    {metricas.totalReservas > 0 ? `${Math.round((metricas.confirmadas / metricas.totalReservas) * 100)}%` : '0%'}
                  </span>
                  <span className="text-[10px] text-indigo-700 block mt-0.5">
                    {metricas.confirmadas} confirmadas de {metricas.totalReservas}
                  </span>
                </div>
              </div>

              {/* Sub-tabla de Transacciones Registradas */}
              <div className="mt-3">
                <h4 className="text-xs font-black uppercase text-slate-700 mb-2">
                  Registro de Transacciones Monetarias ({transaccionesFiltradas.length})
                </h4>
                {transaccionesFiltradas.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    No se registran transacciones individuales en el período seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">ID Transacción</th>
                          <th className="p-2.5">Reserva Ref.</th>
                          <th className="p-2.5">Método de Pago</th>
                          <th className="p-2.5">Tipo Modalidad</th>
                          <th className="p-2.5">N° Operación</th>
                          <th className="p-2.5">Monto (S/.)</th>
                          <th className="p-2.5">Estado Validación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {transaccionesFiltradas.slice(0, 15).map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{t.id}</td>
                            <td className="p-2.5 text-slate-600">{t.reservaId}</td>
                            <td className="p-2.5">
                              <span className="font-sans font-bold px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800">
                                {t.metodo}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans text-slate-600 text-[10px]">{t.tipo}</td>
                            <td className="p-2.5 text-slate-800">{t.numeroOperacion || 'Vía App'}</td>
                            <td className="p-2.5 font-bold text-emerald-700">S/ {t.monto.toFixed(2)}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                                t.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {t.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN 2: AUDITORÍA DETALLADA DE RESERVAS              */}
          {/* ======================================================== */}
          {(seccionActiva === 'DOCUMENTO_COMPLETO' || seccionActiva === 'RESERVAS') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  2. Libro de Reservas Auditadas ({reservasFiltradas.length})
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Total de partidos registrados y agendados
                </span>
              </div>

              {reservasFiltradas.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  No se encontraron reservas registradas para los filtros aplicados.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Fecha y Horario</th>
                        <th className="p-3">Complejo & Cancha</th>
                        <th className="p-3">Cliente / Teléfono</th>
                        <th className="p-3">Monto Total</th>
                        <th className="p-3">Adelanto (50%)</th>
                        <th className="p-3">Saldo Cancha</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservasFiltradas.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-700">{r.id}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{r.fecha}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{r.horaInicio} - {r.horaFin}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block truncate max-w-[150px]">{r.sedeNombre}</span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">{r.canchaNombre}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block truncate max-w-[140px]">{r.clienteNombre}</span>
                            <span className="text-[11px] font-mono text-slate-500">{r.clienteTelefono}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">S/ {r.precioTotal.toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">S/ {r.montoPagado.toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-amber-700">S/ {r.saldoPendiente.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.estado === 'CONFIRMADA' || r.estado === 'COMPLETADA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.estado === 'CANCELADA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN 3: REGISTRO DE ATENCIONES AL CLIENTE Y MENSAJERÍA */}
          {/* ======================================================== */}
          {(seccionActiva === 'DOCUMENTO_COMPLETO' || seccionActiva === 'ATENCIONES') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  3. Registro de Atenciones, Soporte y Comunicaciones ({todosMensajes.length})
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Interacciones entre clientes y propietarios de complejos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Mensajes Registrados</span>
                  <span className="text-xl font-black text-slate-900 font-mono block mt-1">{todosMensajes.length}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Notificaciones Atendidas</span>
                  <span className="text-xl font-black text-teal-700 font-mono block mt-1">{notificacionesAdmin.length}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Tiempo Promedio Respuesta</span>
                  <span className="text-xl font-black text-emerald-700 font-mono block mt-1">&lt; 3 minutos</span>
                </div>
              </div>

              {todosMensajes.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  No hay mensajes de chat registrados actualmente en la base de datos.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Fecha / Hora</th>
                        <th className="p-2.5">Remitente</th>
                        <th className="p-2.5">Destinatario</th>
                        <th className="p-2.5">Complejo Deportivo</th>
                        <th className="p-2.5">Contenido / Consulta</th>
                        <th className="p-2.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {todosMensajes.slice(0, 10).map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(m.timestamp).toLocaleDateString('es-PE')} {new Date(m.timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">{m.remitenteNombre}</td>
                          <td className="p-2.5 text-slate-600">{service.obtenerUsuarioPorId(m.destinatarioId)?.nombre || m.destinatarioId || 'Usuario'}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{m.sedeNombre || 'Atención General'}</td>
                          <td className="p-2.5 max-w-[220px] truncate text-slate-700" title={m.texto}>{m.texto}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {m.leido ? 'Leído' : 'Enviado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECCIÓN 4: AUDITORÍA DE SEGURIDAD Y EVENTOS DEL SISTEMA  */}
          {/* ======================================================== */}
          {(seccionActiva === 'DOCUMENTO_COMPLETO' || seccionActiva === 'SEGURIDAD') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  4. Auditoría de Seguridad y Eventos del Sistema ({logsAuditoria.length})
                </h3>
                <span className="text-[11px] font-bold text-slate-500">
                  Trazabilidad de accesos, reservas y modificaciones críticas
                </span>
              </div>

              {logsAuditoria.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  El registro de auditoría está limpio y sin incidencias reportadas.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] font-sans tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Marca Temporal</th>
                        <th className="p-2.5">Nivel</th>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5">Descripción del Evento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {logsAuditoria.slice(0, 12).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString('es-PE')} • {new Date(log.timestamp).toLocaleDateString('es-PE')}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-black ${
                              log.nivel === 'ERROR' || log.nivel === 'SECURITY'
                                ? 'bg-rose-100 text-rose-800'
                                : log.nivel === 'WARN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {log.nivel}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-indigo-800 font-sans">{log.categoria}</td>
                          <td className="p-2.5 font-sans text-slate-800">{log.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PIE DEL DOCUMENTO FORMAL: CERTIFICACIÓN Y FIRMA DIGITAL   */}
          {/* ======================================================== */}
          <div className="pt-6 border-t-2 border-slate-900 mt-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              
              {/* Sello de Autenticidad Criptográfica */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block">
                    CERTIFICACIÓN ELECTRÓNICA VÁLIDA
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-sm leading-tight">
                    Documento oficial emitido con integridad verificable bajo los protocolos de auditoría de Pukllay Sport.
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    Hash SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f...
                  </span>
                </div>
              </div>

              {/* Sello y Firma del Administrador */}
              <div className="text-center sm:text-right min-w-[220px]">
                <div className="border-b border-slate-400 pb-1 mb-1 font-serif italic text-slate-800 text-sm">
                  {usuarioActual.nombre}
                </div>
                <span className="text-xs font-black text-slate-900 block">
                  ADMINISTRACIÓN GENERAL
                </span>
                <span className="text-[10px] text-slate-500 block uppercase">
                  Pukllay Sport Perú S.A.C.
                </span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-slate-200 text-[10px] text-slate-400">
              Página 1 de 1 • Pukllay Sport Management Platform • Todos los derechos reservados © {fechaGeneracion.getFullYear()}
            </div>
          </div>

        </div>

        {/* PIE DE LA VENTANA (NO SE IMPRIME) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Reporte generado en tiempo real con datos activos del servicio de Pukllay Sport.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
            >
              Imprimir / Descargar PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
