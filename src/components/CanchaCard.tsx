/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Tarjeta de Cancha de Grass Sintético
 */

import React from 'react';
import { Cancha, Sede } from '../domain/Sede.ts';
import { MapPin, Navigation, Star, ShieldCheck, ShieldAlert, Clock, ArrowRight, Sparkles, Check, MessageCircle } from 'lucide-react';

interface CanchaCardProps {
  cancha: Cancha;
  sede: Sede;
  distanciaKm: number;
  slotsLibresCount: number;
  esSedeEnfocada?: boolean;
  onReservar: () => void;
  onVerEnMapa: () => void;
  onAbrirChat?: () => void;
}

export const CanchaCard: React.FC<CanchaCardProps> = ({
  cancha,
  sede,
  distanciaKm,
  slotsLibresCount,
  esSedeEnfocada,
  onReservar,
  onVerEnMapa,
  onAbrirChat,
}) => {
  const getDeporteLabel = (dep: string) => {
    switch (dep) {
      case 'FUTBOL_5': return 'Fútbol 5';
      case 'FUTBOL_6': return 'Fútbol 6';
      case 'FUTBOL_7': return 'Fútbol 7';
      case 'FUTBOL_8': return 'Fútbol 8';
      case 'FUTSAL': return 'Futsal Pro';
      case 'PADEL': return 'Pádel Techado';
      case 'VOLEY': return 'Vóley';
      default: return dep;
    }
  };

  const getSuperficieLabel = (sup: string) => {
    switch (sup) {
      case 'GRASS_PREMIUM_CAUCHO': return 'Grass Sintético + Caucho';
      case 'GRASS_MONOFILAMENTO': return 'Grass Monofilamento';
      case 'GRASS_FIBRILADO': return 'Grass Fibrilado';
      case 'LOSA_DEPORTIVA': return 'Losa Pro';
      default: return sup;
    }
  };

  const adelanto50 = Math.round(cancha.precioBaseHora * 0.5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/90 dark:border-slate-800 flex flex-col group">
      
      {/* Imagen & Badges Superiores */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={cancha.fotos[0] || 'https://images.unsplash.com/photo-1529900245534-47fbf866b35e?auto=format&fit=crop&w=800&q=80'}
          alt={cancha.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 pointer-events-none" />

        {/* Badges de Deporte y Techado */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider shadow-md">
            ⚽ {getDeporteLabel(cancha.deporte)}
          </span>
          {cancha.techada && (
            <span className="px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold shadow-md">
              Techada
            </span>
          )}
        </div>

        {/* Distancia en KM en vivo / Ubicar en Google Maps */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerEnMapa();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg backdrop-blur-md text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
              esSedeEnfocada
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-emerald-900/30'
                : 'bg-white/95 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
            title={`Ubicar ${sede.nombre} en Google Maps (a ${distanciaKm} km)`}
          >
            <Navigation className={`w-3 h-3 ${esSedeEnfocada ? 'text-white fill-white' : 'text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400'}`} />
            <span>a {distanciaKm} km</span>
            {esSedeEnfocada && <span className="ml-0.5 text-[10px] uppercase font-black tracking-wider text-emerald-100">• En mapa</span>}
          </button>
        </div>

        {/* Información en pie de foto */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-medium text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {getSuperficieLabel(cancha.superficie)}
            </p>
            <h3 className="text-base sm:text-lg font-bold leading-tight drop-shadow-md">
              {cancha.nombre}
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold">{sede.calificacionPromedio}</span>
          </div>
        </div>
      </div>

      {/* Contenido / Detalles */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Sede y Dirección */}
          <div className="mb-2">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider truncate">
                {sede.nombre}
              </p>
              {sede.esVerificada ? (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 shadow-xs" title="Sede con Check Verificado oficial otorgado por el Administrador">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>✓ Verificado Admin</span>
                </span>
              ) : (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-xs" title="Complejo en proceso de verificación con el Administrador">
                  <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>En Verificación</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">{sede.ubicacion.distrito} • {sede.ubicacion.direccion}</span>
            </p>
          </div>

          {/* Dimensiones y Amenidades clave */}
          <div className="flex flex-wrap gap-1.5 my-3">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              📐 {cancha.dimensiones}
            </span>
            {sede.amenidades.slice(0, 2).map((a, idx) => (
              <span key={idx} className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                ✓ {a}
              </span>
            ))}
          </div>

          {/* Estado de disponibilidad inmediata hoy */}
          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-3">
            <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Disponibilidad:
            </span>
            {slotsLibresCount > 0 ? (
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200/40 dark:border-emerald-800/60">
                {slotsLibresCount} horarios libres hoy
              </span>
            ) : (
              <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200/40 dark:border-amber-800/60">
                Consultar otra fecha
              </span>
            )}
          </div>
        </div>

        {/* Precios y Botones de Acción (Mensajería Directa con el Dueño + Reserva) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-400 font-bold">Desde</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                S/. {cancha.precioBaseHora}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/hr</span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Reserva con solo el 50% (S/. {adelanto50})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* BOTÓN AL LADO DERECHO DEL GRASS PUBLICADO: MENSAJERÍA DIRECTA EN TIEMPO REAL CON EL DUEÑO */}
            {onAbrirChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirChat();
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 font-bold text-xs shadow-md border border-slate-700/80 active:scale-95 transition-all cursor-pointer group/chat"
                title="Chatear en tiempo real con el dueño del grass para consultar dudas"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 group-hover/chat:scale-110 transition-transform" />
                <span className="hidden sm:inline">Consultar</span>
              </button>
            )}

            <button
              onClick={onReservar}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Reservar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
