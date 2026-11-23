/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Notificación Push del Autenticador Real & Entrada OTP de 6 Dígitos
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MessageSquare, Copy, Check, ExternalLink, X, Smartphone, Sparkles, KeyRound } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthenticatorNotificationProps {
  codigo: string;
  telefono: string;
  nombre?: string;
  onCopiar?: () => void;
  onAutoLlenar?: (codigo: string) => void;
  onCerrar?: () => void;
}

export const AuthenticatorNotification: React.FC<AuthenticatorNotificationProps> = ({
  codigo,
  telefono,
  nombre,
  onCopiar,
  onAutoLlenar,
  onCerrar,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleCopiar = () => {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    if (onCopiar) onCopiar();
    if (onAutoLlenar) onAutoLlenar(codigo);
    setTimeout(() => setCopiado(false), 2500);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[94vw] max-w-md animate-in slide-in-from-top-6 fade-in duration-500">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-4 shadow-2xl shadow-emerald-500/20 text-white relative overflow-hidden group">
        
        {/* Glow animado superior */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/30 rounded-full blur-2xl pointer-events-none animate-pulse"></div>

        {/* Encabezado del Push Notification */}
        <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-600/40">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wide">Pukllay Sport</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 font-extrabold rounded-md border border-emerald-500/30">
                  SMS / WhatsApp
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Autenticador Oficial • Ahora</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setVisible(false);
              if (onCerrar) onCerrar();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Ocultar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido del mensaje */}
        <div className="relative z-10 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 mb-3">
          <p className="text-xs text-slate-300">
            {nombre ? `Hola ${nombre}, tu` : 'Tu'} código de verificación para <strong>{telefono}</strong> es:
          </p>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="font-mono text-2xl font-black tracking-widest text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-inner select-all">
              {codigo}
            </div>

            <button
              type="button"
              onClick={handleCopiar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              {copiado ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Auto-completar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer rápido con opción WhatsApp */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 relative z-10 pt-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Válido por 10 minutos
          </span>

          <a
            href={`https://wa.me/51${telefono.replace(/\D/g, '')}?text=Tu%20c%C3%B3digo%20de%20verificaci%C3%B3n%20Pukllay%20Sport%20es:%20${codigo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 hover:underline"
          >
            <span>Ver en WhatsApp</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split('').concat(Array(Math.max(0, length - value.length)).fill(''));

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      // Borró
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join('').slice(0, length));
      return;
    }

    if (rawVal.length > 1) {
      // Pegó varios dígitos
      const pasted = rawVal.slice(0, length);
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = rawVal[rawVal.length - 1];
    const finalVal = newDigits.join('').slice(0, length);
    onChange(finalVal);

    if (index < length - 1 && rawVal) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-2xl border transition-all duration-200 focus:outline-none focus:scale-105 select-all ${
            digits[i]
              ? 'bg-slate-900 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/20'
              : 'bg-slate-950/70 text-white border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40'
          }`}
        />
      ))}
    </div>
  );
};
