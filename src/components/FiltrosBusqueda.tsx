/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - RF-07: Búsqueda y Filtrado de Canchas
 */

import React from 'react';
import { DeporteTipo, SuperficieTipo } from '../domain/Sede.ts';
import { FiltrosBusquedaCanchas } from '../domain/PukllayService.ts';
import { Filter, Calendar, DollarSign, MapPin, Sparkles, SlidersHorizontal, Check } from 'lucide-react';

interface FiltrosBusquedaProps {
  filtros: FiltrosBusquedaCanchas;
  onFiltrosChange: (nuevosFiltros: FiltrosBusquedaCanchas) => void;
  totalResultados: number;
}

export const FiltrosBusqueda: React.FC<FiltrosBusquedaProps> = ({
  filtros,
  onFiltrosChange,
  totalResultados,
}) => {
  const deportes: { id: DeporteTipo | 'TODOS'; label: string; icono: string }[] = [
    { id: 'TODOS', label: 'Todos', icono: '⚡' },
    { id: 'FUTBOL_7', label: 'Fútbol 7', icono: '⚽' },
    { id: 'FUTBOL_6', label: 'Fútbol 6', icono: '⚽' },
    { id: 'FUTBOL_5', label: 'Fútbol 5', icono: '⚽' },
    { id: 'FUTSAL', label: 'Futsal', icono: '🥅' },
    { id: 'PADEL', label: 'Pádel', icono: '🎾' },
    { id: 'VOLEY', label: 'Vóley', icono: '🏐' },
  ];

  const superficies: { id: SuperficieTipo | 'TODOS'; label: string }[] = [
    { id: 'TODOS', label: 'Cualquier Superficie' },
    { id: 'GRASS_PREMIUM_CAUCHO', label: 'Grass Premium + Caucho Criogénico' },
    { id: 'GRASS_MONOFILAMENTO', label: 'Grass Monofilamento Anti-abrasión' },
    { id: 'GRASS_FIBRILADO', label: 'Grass Fibrilado' },
    { id: 'LOSA_DEPORTIVA', label: 'Losa / Polideportivo' },
  ];

  const handleDeporteClick = (deporte: DeporteTipo | 'TODOS') => {
    onFiltrosChange({ ...filtros, deporte });
  };

  const handleSuperficieChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltrosChange({ ...filtros, superficie: e.target.value as SuperficieTipo | 'TODOS' });
  };

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltrosChange({ ...filtros, fecha: e.target.value });
  };

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltrosChange({ ...filtros, precioMax: Number(e.target.value) });
  };

  const handleSoloDisponiblesToggle = () => {
    onFiltrosChange({ ...filtros, soloDisponiblesHoy: !filtros.soloDisponiblesHoy });
  };

  const handleOrdenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltrosChange({ ...filtros, ordenPor: e.target.value as any });
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    onFiltrosChange({ ...filtros, distanciaMaximaKm: val === 0 ? undefined : val });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 mb-6 transition-colors">
      {/* Selector de Deporte Rápido tipo Pills horizontales */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Deporte
          </label>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
            {totalResultados} {totalResultados === 1 ? 'cancha disponible' : 'canchas disponibles'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
          {deportes.map((dep) => {
            const activo = (filtros.deporte || 'TODOS') === dep.id;
            return (
              <button
                key={dep.id}
                onClick={() => handleDeporteClick(dep.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activo
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md shadow-slate-900/20 dark:shadow-emerald-900/40 scale-[1.02]'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{dep.icono}</span>
                <span>{dep.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controles de Filtro Avanzados (Fecha, Rango de Precio, Cercanía, Superficie) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        
        {/* Fecha */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Fecha del Partido
          </label>
          <input
            type="date"
            value={filtros.fecha || ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={handleFechaChange}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Superficie de Grass */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Tipo de Superficie
          </label>
          <select
            value={filtros.superficie || 'TODOS'}
            onChange={handleSuperficieChange}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          >
            {superficies.map((s) => (
              <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Radio de Cercanía / Distancia */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Radio de Cercanía
          </label>
          <select
            value={filtros.distanciaMaximaKm || 0}
            onChange={handleRadioChange}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          >
            <option value={0} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Sin límite de distancia</option>
            <option value={3} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">A menos de 3 km</option>
            <option value={5} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">A menos de 5 km</option>
            <option value={10} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">A menos de 10 km</option>
            <option value={20} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">A menos de 20 km</option>
          </select>
        </div>

        {/* Ordenar por */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Ordenar Resultados
          </label>
          <select
            value={filtros.ordenPor || 'cercania'}
            onChange={handleOrdenChange}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          >
            <option value="cercania" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Más cercanas a mí (GPS)</option>
            <option value="precio_asc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Precio: Menor a Mayor</option>
            <option value="precio_desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Precio: Mayor a Menor</option>
            <option value="calificacion" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Mejor calificación</option>
          </select>
        </div>
      </div>

      {/* Barra de Precio y Switch de Disponibilidad Inmediata */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        
        {/* Slider de Precio Máximo */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            <span>Precio Máximo por Hora:</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold font-mono bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded">
              S/. {filtros.precioMax || 200}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="250"
            step="5"
            value={filtros.precioMax || 200}
            onChange={handlePrecioChange}
            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>

        {/* Toggle Disponibilidad Inmediata (RF-07) */}
        <div className="flex items-center">
          <button
            onClick={handleSoloDisponiblesToggle}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filtros.soloDisponiblesHoy
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
              filtros.soloDisponiblesHoy ? 'bg-white text-emerald-700 border-white' : 'border-slate-300 dark:border-slate-600'
            }`}>
              {filtros.soloDisponiblesHoy && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>Solo con horarios libres hoy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

