/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Componente de Entrada OTP de 6 Dígitos con Animaciones Elegantes
 */

import React, { useRef, useEffect } from 'react';

interface OtpBoxesInputProps {
  valor: string;
  onChange: (codigo: string) => void;
  onCompletado?: (codigo: string) => void;
  deshabilitado?: boolean;
}

export const OtpBoxesInput: React.FC<OtpBoxesInputProps> = ({
  valor,
  onChange,
  onCompletado,
  deshabilitado = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Array de 6 caracteres
  const digitos = Array.from({ length: 6 }, (_, i) => valor[i] || '');

  useEffect(() => {
    // Si está vacío, enfocar el primer input
    if (valor.length === 0 && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      // Vaciado manual
      const nuevoArray = [...digitos];
      nuevoArray[index] = '';
      const nuevoString = nuevoArray.join('').slice(0, 6);
      onChange(nuevoString);
      return;
    }

    // Tomar el último dígito ingresado
    const char = rawVal.slice(-1);
    const nuevoArray = [...digitos];
    nuevoArray[index] = char;
    const nuevoCodigo = nuevoArray.join('').slice(0, 6);
    onChange(nuevoCodigo);

    // Avanzar foco si hay siguiente input
    if (index < 5 && char) {
      inputsRef.current[index + 1]?.focus();
    }

    if (nuevoCodigo.length === 6 && onCompletado) {
      onCompletado(nuevoCodigo);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digitos[index] && index > 0) {
        // Si el actual está vacío, retroceder y borrar el anterior
        inputsRef.current[index - 1]?.focus();
        const nuevoArray = [...digitos];
        nuevoArray[index - 1] = '';
        onChange(nuevoArray.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const textoPegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (textoPegado) {
      onChange(textoPegado);
      // Enfocar el último digit o el siguiente vacío
      const focusIndex = Math.min(textoPegado.length, 5);
      inputsRef.current[focusIndex]?.focus();
      if (textoPegado.length === 6 && onCompletado) {
        onCompletado(textoPegado);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-3">
      {Array.from({ length: 6 }).map((_, index) => {
        const digito = digitos[index];
        const tieneValor = !!digito;

        return (
          <div key={index} className="relative">
            <input
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digito}
              disabled={deshabilitado}
              onChange={(e) => handleInputChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-11 h-14 sm:w-12 sm:h-16 text-center font-mono text-2xl font-black rounded-2xl border-2 transition-all duration-200 outline-none select-none ${
                tieneValor
                  ? 'bg-slate-900 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/30 scale-105'
                  : 'bg-slate-950 border-slate-700 text-white hover:border-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20'
              } ${deshabilitado ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
            />
            {/* Pequeño punto inferior si está vacío */}
            {!tieneValor && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-700 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
};
