/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Selector Interactivo de Tema (Claro / Oscuro / Sistema)
 * Ofrece cambio táctil con iconos animados y persistencia automática en el estado.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../context/ThemeContext.tsx';
import { Sun, Moon, Laptop, ChevronDown, Check } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'segmented' | 'dropdown';
  mostrarTexto?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'button',
  mostrarTexto = false,
}) => {
  const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Variante 1: Switch Segmentado de 3 posiciones [ Claro | Oscuro | Auto ]
  if (variant === 'segmented') {
    const opciones: { id: Theme; label: string; icon: React.ReactNode }[] = [
      { id: 'light', label: 'Claro', icon: <Sun className="w-3.5 h-3.5" /> },
      { id: 'dark', label: 'Oscuro', icon: <Moon className="w-3.5 h-3.5" /> },
      { id: 'system', label: 'Auto', icon: <Laptop className="w-3.5 h-3.5" /> },
    ];

    return (
      <div
        className={`inline-flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700/80 backdrop-blur-sm shadow-inner transition-colors ${className}`}
        role="group"
        aria-label="Selector de tema de la aplicación"
      >
        {opciones.map((op) => {
          const activo = theme === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setTheme(op.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activo
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`Activar tema ${op.label}`}
              aria-pressed={activo}
            >
              <span className={activo ? (op.id === 'light' ? 'text-amber-500' : op.id === 'dark' ? 'text-indigo-400' : 'text-emerald-400') : ''}>
                {op.icon}
              </span>
              <span>{op.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variante 2: Dropdown con selector explícito de Claro / Oscuro / Sistema
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownAbierto((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-sm group"
          title={`Tema actual: ${theme === 'system' ? `Sistema (${isDark ? 'Oscuro' : 'Claro'})` : theme === 'dark' ? 'Oscuro' : 'Claro'}`}
          aria-expanded={dropdownAbierto}
          aria-haspopup="listbox"
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
          )}
          {mostrarTexto && (
            <span className="text-xs font-bold">
              {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
        </button>

        {dropdownAbierto && (
          <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-700/90 shadow-2xl p-1.5 z-50 animate-pop-in">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                setDropdownAbierto(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Tema Claro</span>
              </div>
              {theme === 'light' && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                setDropdownAbierto(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 text-indigo-400'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Tema Oscuro</span>
              </div>
              {theme === 'dark' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('system');
                setDropdownAbierto(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                theme === 'system'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                <span>Automático</span>
              </div>
              {theme === 'system' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Variante 3 por defecto: Botón Toggle Rápido Sol / Luna (Directo, Ultra-reactivo)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/90 hover:border-slate-600 transition-all cursor-pointer shadow-sm active:scale-95 group ${className}`}
      title={isDark ? 'Cambiar a Tema Claro (☀️)' : 'Cambiar a Tema Oscuro (🌙)'}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Icono de Sol (Modo Claro) */}
        <Sun
          className={`w-5 h-5 text-amber-400 transition-all duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 absolute'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        {/* Icono de Luna (Modo Oscuro) */}
        <Moon
          className={`w-5 h-5 text-indigo-300 group-hover:text-indigo-200 transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>

      {mostrarTexto && (
        <span className="ml-2 text-xs font-bold hidden sm:inline">
          {isDark ? 'Oscuro' : 'Claro'}
        </span>
      )}
    </button>
  );
};
