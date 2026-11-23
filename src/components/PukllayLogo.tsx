/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Componente Oficial del Logo Deportivo
 * Diseño: Silueta de futbolista con balón, nevados andinos, sol radiante,
 * estelas de velocidad rojo/dorado, tipografía Pukllay Sport y Chakana andina.
 */

import React, { useState } from 'react';
import logo128 from '../assets/images/pukllay-logo-128.png';
import logo256 from '../assets/images/pukllay-logo-256.png';
import logo512 from '../assets/images/pukllay-logo-512.png';
import logoFull from '../assets/images/pukllay-logo-clean.png';

interface PukllayLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'horizontal' | 'svg';
  transparent?: boolean;
  withImage?: boolean;
}

export const PukllayLogo: React.FC<PukllayLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  transparent = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Dimensiones según el tamaño
  const sizeMap = {
    xs: { px: 28, src: logo128, text: 'text-xs' },
    sm: { px: 40, src: logo128, text: 'text-sm' },
    md: { px: 56, src: logo256, text: 'text-base' },
    lg: { px: 84, src: logo256, text: 'text-xl' },
    xl: { px: 120, src: logo512, text: 'text-2xl' },
    '2xl': { px: 180, src: logoFull, text: 'text-3xl' },
  };

  const { px, src } = sizeMap[size] || sizeMap.md;

  // Si no se solicita exclusivamente 'svg' y la imagen carga correctamente,
  // mostramos el escudo oficial PNG con transparencia 100% limpia (sin ningún fondo blanco)
  if (variant !== 'svg' && !imageFailed) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center select-none bg-transparent ${className}`}
        style={{ width: px, height: 'auto' }}
      >
        <img
          src={src}
          alt="Pukllay Sport Logo"
          style={{ width: px, height: 'auto', maxHeight: Math.round(px * 1.2) }}
          className="object-contain drop-shadow-md bg-transparent pointer-events-none select-none"
          loading="eager"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  // Render Vectorial SVG de alta fidelidad 100% transparente (sin ningún fondo blanco ni halo)
  return (
    <div className={`relative inline-flex items-center justify-center select-none bg-transparent ${className}`}>
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: px, height: px }}
        className="overflow-visible drop-shadow-md bg-transparent"
      >
        <defs>
          {/* Degradado del Sol */}
          <linearGradient id="pukllaySun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD200" />
            <stop offset="100%" stopColor="#FF9000" />
          </linearGradient>

          {/* Degradado Estela Roja */}
          <linearGradient id="pukllayRedTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FF1E27" />
            <stop offset="100%" stopColor="#C40018" />
          </linearGradient>

          {/* Degradado Estela Amarilla */}
          <linearGradient id="pukllayGoldTrail" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FFD200" />
            <stop offset="100%" stopColor="#FFA000" />
          </linearGradient>

          {/* Sombra para el texto y siluetas */}
          <filter id="pukllayGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* FONDO (Opcional si transparent es falso) */}
        {!transparent && (
          <rect width="500" height="500" rx="90" fill="#0D0F14" />
        )}

        {/* SOL RADIANTE ANDINO */}
        <circle cx="330" cy="115" r="75" fill="url(#pukllaySun)" filter="url(#pukllayGlow)" />

        {/* CORDILLERA DE LOS ANDES (Nevados en blanco con facetas) */}
        <g opacity="0.95">
          {/* Pico secundario */}
          <path
            d="M170 185 L225 105 L280 185 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="14"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Pico principal */}
          <path
            d="M210 185 L275 75 L345 185"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="16"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Filo nevado derecho */}
          <path
            d="M345 140 L380 160 L415 175"
            stroke="#FFFFFF"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </g>

        {/* ESTELAS DINÁMICAS DE VELOCIDAD (Rojo y Amarillo) */}
        {/* Estela Roja exterior */}
        <path
          d="M 85 220 C 130 145, 230 200, 290 240 C 210 260, 130 250, 85 220 Z"
          fill="url(#pukllayRedTrail)"
        />
        <path
          d="M 105 240 C 150 200, 240 245, 300 250 C 230 270, 150 265, 105 240 Z"
          fill="url(#pukllayRedTrail)"
        />
        {/* Estela Amarilla interior */}
        <path
          d="M 120 225 C 160 170, 250 215, 305 245 C 235 255, 160 250, 120 225 Z"
          fill="url(#pukllayGoldTrail)"
        />

        {/* SILUETA DEL FUTBOLISTA ATLETA (Blanco) */}
        <g fill="#FFFFFF" filter="url(#pukllayGlow)">
          {/* Cabeza */}
          <circle cx="340" cy="118" r="28" />

          {/* Torso inclinado en carrera */}
          <path
            d="M 315 150 C 330 140, 360 155, 335 185 L 265 245 C 245 235, 255 210, 280 185 Z"
          />

          {/* Brazo izquierdo hacia adelante */}
          <path
            d="M 315 155 C 265 145, 210 160, 205 180 C 205 195, 230 195, 255 175 C 285 165, 305 165, 315 155 Z"
          />

          {/* Brazo derecho extendido hacia atrás */}
          <path
            d="M 345 160 L 390 190 L 375 198 L 335 175 Z"
          />
          <circle cx="385" cy="192" r="7" />

          {/* Pierna izquierda adelantada (impactando la pelota) */}
          <path
            d="M 270 235 L 235 265 L 195 275 C 200 285, 220 285, 245 275 L 285 245 Z"
          />

          {/* Pierna derecha de apoyo y carrera */}
          <path
            d="M 285 220 L 305 260 L 280 280 C 265 270, 275 250, 285 220 Z"
          />
        </g>

        {/* BALÓN DE FÚTBOL OFICIAL */}
        <g transform="translate(355, 230)">
          {/* Base blanca del balón */}
          <circle cx="38" cy="38" r="36" fill="#FFFFFF" stroke="#0D0F14" strokeWidth="3" />
          
          {/* Pentágono central negro */}
          <polygon
            points="38,24 51,33 46,48 30,48 25,33"
            fill="#1E232F"
          />

          {/* Pentágonos periféricos con costuras */}
          <polygon points="38,2 47,15 29,15" fill="#1E232F" />
          <polygon points="69,20 62,31 73,42" fill="#1E232F" />
          <polygon points="60,63 50,56 59,71" fill="#1E232F" />
          <polygon points="17,63 26,56 17,71" fill="#1E232F" />
          <polygon points="7,20 14,31 3,42" fill="#1E232F" />

          {/* Líneas de costura */}
          <line x1="38" y1="24" x2="38" y2="15" stroke="#0D0F14" strokeWidth="2.5" />
          <line x1="51" y1="33" x2="62" y2="31" stroke="#0D0F14" strokeWidth="2.5" />
          <line x1="46" y1="48" x2="50" y2="56" stroke="#0D0F14" strokeWidth="2.5" />
          <line x1="30" y1="48" x2="26" y2="56" stroke="#0D0F14" strokeWidth="2.5" />
          <line x1="25" y1="33" x2="14" y2="31" stroke="#0D0F14" strokeWidth="2.5" />
        </g>

        {/* TIPOGRAFÍA: PUKLLAY */}
        {variant !== 'icon' && (
          <>
            <g filter="url(#pukllayGlow)">
              <text
                x="250"
                y="350"
                textAnchor="middle"
                fill="#FFFFFF"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '78px',
                  letterSpacing: '-2px',
                }}
              >
                Pukllay
              </text>
            </g>

            {/* TIPOGRAFÍA: SPORT CON ALAS DINÁMICAS */}
            <g filter="url(#pukllayGlow)">
              {/* Ala izquierda */}
              <path d="M 100 375 L 140 370 L 125 385 Z" fill="#FDB813" />
              <path d="M 115 390 L 140 387 L 130 398 Z" fill="#FDB813" />

              {/* Texto Sport */}
              <text
                x="250"
                y="415"
                textAnchor="middle"
                fill="#FDB813"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: '60px',
                  letterSpacing: '1px',
                }}
              >
                Sport
              </text>

              {/* Ala derecha */}
              <path d="M 400 375 L 360 370 L 375 385 Z" fill="#FDB813" />
              <path d="M 385 390 L 360 387 L 370 398 Z" fill="#FDB813" />
            </g>

            {/* CHAKANA ANDINA (Cruz escalonada incaica) */}
            <g transform="translate(250, 442) scale(1.1)">
              {/* Líneas horizontales laterales */}
              <line x1="-80" y1="0" x2="-35" y2="0" stroke="#E52424" strokeWidth="4" strokeLinecap="round" />
              <line x1="35" y1="0" x2="80" y2="0" stroke="#E52424" strokeWidth="4" strokeLinecap="round" />

              {/* Chakana Escalonada Roja */}
              <path
                d="M -5 -22 L 5 -22 L 5 -15 L 12 -15 L 12 -8 L 20 -8 L 20 8 L 12 8 L 12 15 L 5 15 L 5 22 L -5 22 L -5 15 L -12 15 L -12 8 L -20 8 L -20 -8 L -12 -8 L -12 -15 L -5 -15 Z"
                fill="#D32F2F"
                stroke="#8A0000"
                strokeWidth="1.5"
              />

              {/* Rombo / Diamante Dorado Central */}
              <polygon points="0,-7 7,0 0,7 -7,0" fill="#FFC107" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};
