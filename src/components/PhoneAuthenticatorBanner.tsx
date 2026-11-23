/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Notificación Push Interactiva y Realista de Autenticador / SMS
 */

import React, { useEffect, useState } from 'react';
import { Smartphone, Check, Copy, X, ShieldCheck, Zap } from 'lucide-react';
import { reproducirSonidoNotificacionSMS } from '../utils/audioNotification.ts';

interface PhoneAuthenticatorBannerProps {
  codigo: string;
  telefonoDestino: string;
  onAutocompletar: (codigo: string) => void;
  onCerrar: () => void;
  tipoAccion?: 'REGISTRO' | 'RECUPERACION' | 'REENVIO';
}

export const PhoneAuthenticatorBanner: React.FC<PhoneAuthenticatorBannerProps> = ({
  codigo,
  telefonoDestino,
  onAutocompletar,
  onCerrar,
  tipoAccion = 'REGISTRO',
}) => {
  const [copiado, setCopiado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(14);

  // Reproducir sonido real al montarse
  useEffect(() => {
    reproducirSonidoNotificacionSMS();

    // Intentar también con Web Notifications de navegador si tiene permiso concedido
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Pukllay Sport - Código de Autenticación', {
          body: `Tu código de verificación de 6 dígitos es: ${codigo}`,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignorar si falla la notificación del SO
      }
    }

    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [codigo]);

  const handleCopiar = () => {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleAutocompletar = () => {
    handleCopiar();
    onAutocompletar(codigo);
  };

  const formatearTelefono = (tel: string) => {
    const limpio = tel.replace(/\D/g, '');
    if (limpio.length === 9) {
      return `+51 ${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
    }
    return tel;
  };

  return (
    <div className="fixed top-3 left-0 right-0 z-[120] flex justify-center px-3 sm:px-4 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border-2 border-emerald-500/70 rounded-2xl shadow-2xl shadow-emerald-500/25 p-3.5 text-white animate-slide-down-bounce select-none">
        
        {/* Cabecera estilo iOS / Notificación de Smartphone */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-400 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Smartphone className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wide text-white uppercase">
                  SMS AUTENTICADOR
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verificado
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pukllay Security • {formatearTelefono(telefonoDestino)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              hace un momento
            </span>
            <button
              onClick={onCerrar}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Mensaje SMS */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 mb-3">
          <p className="text-xs text-slate-300 leading-relaxed mb-2">
            {tipoAccion === 'REGISTRO' && (
              <>Tu código de confirmación para activar tu cuenta en <strong>Pukllay Sport</strong> es:</>
            )}
            {tipoAccion === 'RECUPERACION' && (
              <>Tu código de seguridad para restablecer tu contraseña en <strong>Pukllay Sport</strong> es:</>
            )}
            {tipoAccion === 'REENVIO' && (
              <>Nuevo código de verificación solicitado:</>
            )}
          </p>

          <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {codigo.split('').map((digito, idx) => (
                <span
                  key={idx}
                  className="w-7 h-8 sm:w-8 sm:h-9 bg-slate-950 border border-emerald-500/50 rounded-lg flex items-center justify-center font-mono font-black text-lg text-emerald-400 shadow-inner"
                >
                  {digito}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopiar}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-200 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
            >
              {copiado ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
            <span>⚠️ Válido durante 10 minutos. No lo compartas.</span>
            <span className="text-slate-400 font-mono text-[9px]">Autocierre en {segundosRestantes}s</span>
          </p>
        </div>

        {/* Botón de acción rápida: 1-Clic Autocompletar */}
        <button
          type="button"
          onClick={handleAutocompletar}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>⚡ 1-Clic: Copiar y Autocompletar Código</span>
        </button>

      </div>
    </div>
  );
};
