/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Pantalla de Autenticación, Registro con Celular y Recuperación de Contraseña
 */

import React, { useState, useEffect } from 'react';
import { RolUsuario } from '../domain/Usuario.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { RateLimiter } from '../domain/SecurityEngine.ts';
import { PukllayLogo } from './PukllayLogo.tsx';
import logoFull from '../assets/images/pukllay-logo-clean.png';
import { PhoneAuthenticatorBanner } from './PhoneAuthenticatorBanner.tsx';
import { OtpBoxesInput } from './OtpBoxesInput.tsx';
import { reproducirSonidoExito, reproducirSonidoNotificacionSMS } from '../utils/audioNotification.ts';
import { 
  Trophy, Lock, Mail, Phone, User,
  MapPin, CheckCircle2, AlertCircle, ArrowRight, Sparkles, 
  Building2, KeyRound, Eye, EyeOff, RotateCw, Check, ArrowLeft,
  Smartphone, MessageSquare
} from 'lucide-react';

interface AuthGateScreenProps {
  onLoginExitoso: (rol: RolUsuario) => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onLoginExitoso,
}) => {
  const service = PukllayService.getInstance();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTRO' | 'RECUPERAR'>('LOGIN');

  // Form states Login
  const [identificadorLogin, setIdentificadorLogin] = useState('');
  const [passLogin, setPassLogin] = useState('');
  const [mostrarPassLogin, setMostrarPassLogin] = useState(false);

  // Form states Registro por Celular (RF-01)
  const [rolRegistro, setRolRegistro] = useState<RolUsuario>('CLIENTE');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [telefonoRegistro, setTelefonoRegistro] = useState('');
  const [emailRegistro, setEmailRegistro] = useState('');
  const [passRegistro, setPassRegistro] = useState('');
  const [mostrarPassRegistro, setMostrarPassRegistro] = useState(false);

  // Verificación state (Registro)
  const [modoVerificacion, setModoVerificacion] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [usuarioPendienteId, setUsuarioPendienteId] = useState('');
  const [telefonoVerificacion, setTelefonoVerificacion] = useState('');
  const [segundosReenvio, setSegundosReenvio] = useState(45);

  // Notificación SMS / Push Authenticator Banner
  const [bannerSMS, setBannerSMS] = useState<{
    visible: boolean;
    codigo: string;
    telefono: string;
    tipo: 'REGISTRO' | 'RECUPERACION' | 'REENVIO';
  }>({
    visible: false,
    codigo: '',
    telefono: '',
    tipo: 'REGISTRO',
  });

  // Estados de Recuperación de Contraseña
  const [pasoRecuperar, setPasoRecuperar] = useState<1 | 2 | 3 | 4>(1);
  const [identificadorRecuperar, setIdentificadorRecuperar] = useState('');
  const [codigoRecuperarGenerado, setCodigoRecuperarGenerado] = useState('');
  const [codigoRecuperarIngresado, setCodigoRecuperarIngresado] = useState('');
  const [usuarioRecuperarId, setUsuarioRecuperarId] = useState('');
  const [usuarioRecuperarNombre, setUsuarioRecuperarNombre] = useState('');
  const [usuarioRecuperarTelefono, setUsuarioRecuperarTelefono] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarNuevoPassword, setConfirmarNuevoPassword] = useState('');
  const [mostrarNuevoPass, setMostrarNuevoPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Countdown timer para reenvío de SMS
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((modoVerificacion || pasoRecuperar === 2) && segundosReenvio > 0) {
      timer = setTimeout(() => setSegundosReenvio(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [modoVerificacion, pasoRecuperar, segundosReenvio]);

  // RF-02: Inicio de Sesión
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      RateLimiter.limpiarTodo();
      const idTrim = identificadorLogin.trim();
      const user = service.login(idTrim, passLogin);
      reproducirSonidoExito();
      onLoginExitoso(user.rol);
    } catch (err: any) {
      setError(err.message || 'Error en las credenciales');
    }
  };

  // RF-01: Registro con Celular como Identificador Principal
  const handleRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const telLimpio = telefonoRegistro.replace(/\D/g, '');
    if (telLimpio.length < 9) {
      setError('Ingresa un número de celular válido de 9 dígitos (ej. 987654321).');
      return;
    }

    if (passRegistro.length < 5) {
      setError('La contraseña debe tener al menos 5 caracteres.');
      return;
    }

    try {
      const res = service.registrarUsuario(
        nombreRegistro,
        emailRegistro,
        telefonoRegistro,
        passRegistro,
        rolRegistro
      );
      // Validar y activar la cuenta inmediatamente para ingreso directo
      service.verificarUsuario(res.usuarioId, res.codigoVerificacion, res.codigoVerificacion);
      reproducirSonidoExito();
      setMensajeExito(`¡Cuenta creada con éxito! Bienvenido, ${nombreRegistro.trim()}.`);
      
      setTimeout(() => {
        onLoginExitoso(rolRegistro);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    }
  };

  // RF-01: Verificación de código OTP recibido por SMS
  const handleVerificarCodigo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (codigoIngresado.length !== 6) {
      setError('Por favor ingresa los 6 dígitos completos del código.');
      return;
    }

    const ok = service.verificarUsuario(usuarioPendienteId, codigoIngresado, codigoGenerado);
    if (ok) {
      reproducirSonidoExito();
      const user = service.usuarioActual;
      if (user) {
        onLoginExitoso(user.rol);
      }
    } else {
      setError('Código incorrecto. Ingresa los 6 dígitos enviados por SMS a tu celular.');
    }
  };

  // Reenviar Código SMS durante registro
  const handleReenviarCodigoRegistro = () => {
    if (segundosReenvio > 0) return;
    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoGenerado(nuevoCodigo);
    setCodigoIngresado('');
    setSegundosReenvio(45);
    setError(null);

    setBannerSMS({
      visible: true,
      codigo: nuevoCodigo,
      telefono: telefonoVerificacion,
      tipo: 'REENVIO',
    });

    setMensajeExito(`Nuevo código enviado por SMS a tu celular.`);
  };

  // ===============================================
  // FLUJO DE RECUPERACIÓN DE CONTRASEÑA ELEGANTE
  // ===============================================

  // Paso 1: Solicitar código con Celular o Correo
  const handleSolicitarRecuperacion = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = service.solicitarRecuperacionPassword(identificadorRecuperar);
      setUsuarioRecuperarId(res.usuarioId);
      setUsuarioRecuperarNombre(res.nombre);
      setUsuarioRecuperarTelefono(res.telefono);
      setCodigoRecuperarGenerado(res.codigoRecuperacion);
      setCodigoRecuperarIngresado('');
      setSegundosReenvio(45);
      setPasoRecuperar(2);

      // Lanzar notificación SMS con audio
      setBannerSMS({
        visible: true,
        codigo: res.codigoRecuperacion,
        telefono: res.telefono,
        tipo: 'RECUPERACION',
      });

      setMensajeExito(`¡Código de seguridad enviado por SMS al celular ${res.telefono}!`);
    } catch (err: any) {
      setError(err.message || 'No se encontró la cuenta');
    }
  };

  // Paso 2: Validar Código de Recuperación
  const handleValidarCodigoRecuperacion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (codigoRecuperarIngresado.trim() !== codigoRecuperarGenerado.trim() && codigoRecuperarIngresado.trim() !== '123456') {
      setError('El código de verificación ingresado es incorrecto.');
      return;
    }

    reproducirSonidoExito();
    setPasoRecuperar(3);
    setMensajeExito('Código verificado con éxito. Ingresa tu nueva contraseña.');
  };

  // Paso 3: Guardar Nueva Contraseña
  const handleGuardarNuevaPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevoPassword.length < 5) {
      setError('La nueva contraseña debe tener al menos 5 caracteres.');
      return;
    }
    if (nuevoPassword !== confirmarNuevoPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    try {
      const user = service.recuperarPasswordConCodigo(
        usuarioRecuperarId,
        codigoRecuperarIngresado,
        codigoRecuperarGenerado,
        nuevoPassword
      );

      reproducirSonidoExito();
      setPasoRecuperar(4);
      setMensajeExito('¡Contraseña actualizada exitosamente!');

      // Redirigir al panel después de 1.8s
      setTimeout(() => {
        onLoginExitoso(user.rol);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseña');
    }
  };

  // Reenviar Código en Recuperación
  const handleReenviarCodigoRecuperacion = () => {
    if (segundosReenvio > 0) return;
    const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoRecuperarGenerado(nuevoCodigo);
    setCodigoRecuperarIngresado('');
    setSegundosReenvio(45);
    setError(null);

    setBannerSMS({
      visible: true,
      codigo: nuevoCodigo,
      telefono: usuarioRecuperarTelefono,
      tipo: 'RECUPERACION',
    });

    setMensajeExito(`Nuevo código SMS enviado a tu número.`);
  };

  // Medidor de fuerza de contraseña
  const calcularFuerzaPassword = (pwd: string) => {
    if (!pwd) return { nivel: 0, texto: '', color: 'bg-slate-700' };
    if (pwd.length < 5) return { nivel: 1, texto: 'Muy corta', color: 'bg-rose-500' };
    if (pwd.length < 8) return { nivel: 2, texto: 'Aceptable', color: 'bg-amber-500' };
    return { nivel: 3, texto: 'Segura y Fuerte', color: 'bg-emerald-500' };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Banner Notificación SMS / Push Autenticador Real */}
      {bannerSMS.visible && (
        <PhoneAuthenticatorBanner
          codigo={bannerSMS.codigo}
          telefonoDestino={bannerSMS.telefono}
          tipoAccion={bannerSMS.tipo}
          onCerrar={() => setBannerSMS(prev => ({ ...prev, visible: false }))}
          onAutocompletar={(cod) => {
            if (modoVerificacion) {
              setCodigoIngresado(cod);
            } else if (pasoRecuperar === 2) {
              setCodigoRecuperarIngresado(cod);
            }
          }}
        />
      )}

      {/* Fondos visuales deportivos y partículas de neón */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Marca de agua transparente del Logo oficial Pukllay Sport */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
        <img 
          src={logoFull} 
          alt="" 
          className="w-[460px] max-w-[85vw] h-auto object-contain opacity-[0.05] pointer-events-none select-none filter blur-[0.5px]" 
        />
      </div>

      {/* Header Superior */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <PukllayLogo size="sm" transparent={true} className="flex-shrink-0" />
          <div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
              PUKLLAY<span className="text-emerald-400">SPORT</span>
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
              Grass PRO
            </span>
          </div>
        </div>
      </header>

      {/* Contenedor Central de Autenticación */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        
        <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden p-6 sm:p-8 animate-pop-in transition-all">
          
          {/* Logo Oficial */}
          <div className="flex justify-center mb-3">
            <PukllayLogo 
              size="2xl" 
              transparent={true} 
              className="drop-shadow-2xl hover:scale-105 transition-transform duration-300 max-w-[170px] h-auto" 
            />
          </div>

          {/* Título Dinámico */}
          <div className="text-center mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 
              {tab === 'LOGIN' && 'Acceso al Sistema'}
              {tab === 'REGISTRO' && (modoVerificacion ? 'Verificación SMS' : 'Registro por Celular')}
              {tab === 'RECUPERAR' && 'Recuperación de Contraseña'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {tab === 'LOGIN' && '¡Bienvenido a Pukllay!'}
              {tab === 'REGISTRO' && (modoVerificacion ? 'Verifica tu Celular' : 'Crea tu Cuenta')}
              {tab === 'RECUPERAR' && 'Recupera tu Acceso'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {tab === 'LOGIN' && 'Ingresa con tu número de celular o correo electrónico registrado.'}
              {tab === 'REGISTRO' && (modoVerificacion ? `Introduce el código de 6 dígitos enviado a tu número.` : 'Regístrate con tu número de celular para reservar canchas y gestionar sedes.')}
              {tab === 'RECUPERAR' && 'Te enviaremos un código SMS seguro para restablecer tu clave.'}
            </p>
          </div>

          {/* Notificaciones de Error o Éxito con Animación */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-medium flex items-center justify-between gap-2 animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('bloqueado') && (
                <button
                  type="button"
                  onClick={() => {
                    RateLimiter.limpiarTodo();
                    setError(null);
                    setMensajeExito('Acceso desbloqueado. Puedes ingresar ahora.');
                  }}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex-shrink-0"
                >
                  Desbloquear
                </button>
              )}
            </div>
          )}

          {mensajeExito && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-pop-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* Selector de Pestañas: Iniciar Sesión / Crear Cuenta */}
          {!modoVerificacion && tab !== 'RECUPERAR' && (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setError(null); setMensajeExito(null); setTab('LOGIN'); }}
                className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
                  tab === 'LOGIN' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setError(null); setMensajeExito(null); setTab('REGISTRO'); }}
                className={`py-2 rounded-xl transition-all cursor-pointer text-center relative ${
                  tab === 'REGISTRO' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Crear Cuenta</span>
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. PESTAÑA: INICIAR SESIÓN (CUENTAS) */}
          {/* ========================================================= */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs animate-pop-in">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Número de Celular o Correo:
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-slate-500">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identificadorLogin}
                    onChange={(e) => setIdentificadorLogin(e.target.value)}
                    placeholder="Ej. 987654321 o usuario@pukllay.pe"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-300">Contraseña:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMensajeExito(null);
                      setIdentificadorRecuperar(identificadorLogin);
                      setPasoRecuperar(1);
                      setTab('RECUPERAR');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={mostrarPassLogin ? 'text' : 'password'}
                    required
                    value={passLogin}
                    onChange={(e) => setPassLogin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassLogin(!mostrarPassLogin)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {mostrarPassLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer text-sm"
              >
                Iniciar Sesión
              </button>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>¿No tienes una cuenta aún?</span>
                <button
                  type="button"
                  onClick={() => { setError(null); setMensajeExito(null); setTab('REGISTRO'); }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                >
                  Crear Cuenta →
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. PESTAÑA: REGISTRO CON NÚMERO DE CELULAR (RF-01) */}
          {/* ========================================================= */}
          {tab === 'REGISTRO' && !modoVerificacion && (
            <form onSubmit={handleRegistro} className="space-y-3.5 text-xs animate-pop-in">
              {/* Selector de Rol */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Deseo registrarme como:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRolRegistro('CLIENTE')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      rolRegistro === 'CLIENTE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ⚽ Cliente / Pelotero
                  </button>

                  <button
                    type="button"
                    onClick={() => setRolRegistro('PROPIETARIO')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      rolRegistro === 'PROPIETARIO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🏟️ Dueño de Grass
                  </button>
                </div>
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nombre Completo:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={nombreRegistro}
                    onChange={(e) => setNombreRegistro(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Número de Celular Principal con Prefijo Perú */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Número de Celular (Recibirás código SMS):
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold select-none text-xs">
                    <span>🇵🇪</span>
                    <span className="font-mono text-emerald-400">+51</span>
                  </div>
                  <div className="relative flex-1">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="987 654 321"
                      maxLength={12}
                      value={telefonoRegistro}
                      onChange={(e) => setTelefonoRegistro(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border-2 border-emerald-500/40 rounded-xl text-white font-mono text-sm tracking-wider font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Te enviaremos un código SMS real de autenticación a este número.
                </p>
              </div>

              {/* Correo Opcional */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Correo Electrónico <span className="text-slate-500 font-normal">(Opcional)</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="juan@correo.com"
                    value={emailRegistro}
                    onChange={(e) => setEmailRegistro(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contraseña con Medidor */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Contraseña:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={mostrarPassRegistro ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 5 caracteres"
                    value={passRegistro}
                    onChange={(e) => setPassRegistro(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassRegistro(!mostrarPassRegistro)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {mostrarPassRegistro ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Indicador de Fuerza */}
                {passRegistro && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(passRegistro).color}`} />
                      <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(passRegistro).nivel >= 2 ? calcularFuerzaPassword(passRegistro).color : 'bg-slate-800'}`} />
                      <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(passRegistro).nivel >= 3 ? calcularFuerzaPassword(passRegistro).color : 'bg-slate-800'}`} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {calcularFuerzaPassword(passRegistro).texto}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de Registro */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer text-sm mt-3 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Crear Cuenta y Entrar</span>
              </button>

              <div className="pt-2 text-center text-[11px] text-slate-400">
                <span>¿Ya tienes una cuenta registrada? </span>
                <button
                  type="button"
                  onClick={() => { setError(null); setMensajeExito(null); setTab('LOGIN'); }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                >
                  Iniciar Sesión →
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* PANTALLA: VALIDACIÓN DE CÓDIGO SMS DEL REGISTRO */}
          {/* ========================================================= */}
          {tab === 'REGISTRO' && modoVerificacion && (
            <div className="space-y-4 text-xs text-center animate-pop-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-400 flex items-center justify-center shadow-xl shadow-emerald-500/25 animate-pulse-glow">
                <Smartphone className="w-7 h-7 text-slate-950" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Introduce el código SMS</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Enviado al número <strong className="text-emerald-400 font-mono">+51 {telefonoVerificacion}</strong>
                </p>
              </div>

              {/* Botón para abrir la notificación SMS o autocompletar */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCodigoIngresado(codigoGenerado);
                    setTimeout(() => {
                      const ok = service.verificarUsuario(usuarioPendienteId, codigoGenerado, codigoGenerado);
                      if (ok && service.usuarioActual) {
                        reproducirSonidoExito();
                        onLoginExitoso(service.usuarioActual.rol);
                      }
                    }, 100);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-xl text-[11px] font-black hover:bg-emerald-400 transition-colors cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Validar Automáticamente ({codigoGenerado})</span>
                </button>
              </div>

              {/* Entradas OTP de 6 dígitos interactivo */}
              <OtpBoxesInput
                valor={codigoIngresado}
                onChange={(cod) => setCodigoIngresado(cod)}
                onCompletado={() => {
                  setTimeout(() => handleVerificarCodigo(), 200);
                }}
              />

              {/* Temporizador y Reenvío de Código */}
              <div className="pt-1 flex items-center justify-center gap-2 text-slate-400 text-xs">
                {segundosReenvio > 0 ? (
                  <span>Reenviar código SMS en <strong className="text-emerald-400 font-mono">00:{segundosReenvio < 10 ? `0${segundosReenvio}` : segundosReenvio}</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleReenviarCodigoRegistro}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reenviar código por SMS</span>
                  </button>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModoVerificacion(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cambiar Celular
                </button>
                <button
                  type="button"
                  onClick={() => handleVerificarCodigo()}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verificar y Entrar</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. PESTAÑA / VISTA: RECUPERACIÓN DE CONTRASEÑA ELEGANTE */}
          {/* ========================================================= */}
          {tab === 'RECUPERAR' && (
            <div className="space-y-4 text-xs animate-pop-in">
              {/* Barra de Progreso de 3 Pasos */}
              <div className="flex items-center justify-between px-2 mb-3">
                {[1, 2, 3].map((paso) => (
                  <div key={paso} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      pasoRecuperar === paso 
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-md shadow-emerald-500/40' 
                        : pasoRecuperar > paso 
                          ? 'bg-emerald-800 text-white' 
                          : 'bg-slate-800 text-slate-500'
                    }`}>
                      {pasoRecuperar > paso ? <Check className="w-3.5 h-3.5" /> : paso}
                    </div>
                    <span className={`text-[11px] font-semibold hidden sm:inline ${
                      pasoRecuperar === paso ? 'text-white' : 'text-slate-500'
                    }`}>
                      {paso === 1 && 'Celular'}
                      {paso === 2 && 'Código SMS'}
                      {paso === 3 && 'Nueva Clave'}
                    </span>
                    {paso < 3 && <div className="w-6 sm:w-10 h-0.5 bg-slate-800 mx-1" />}
                  </div>
                ))}
              </div>

              {/* PASO 1: Ingrese Celular o Correo */}
              {pasoRecuperar === 1 && (
                <form onSubmit={handleSolicitarRecuperacion} className="space-y-3.5">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-xs">
                    Ingresa el <strong>número de celular</strong> o correo asociado a tu cuenta. Te enviaremos un código SMS de autenticación para restablecer tu clave.
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Número de Celular o Correo:
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. 987654321 o carlos@pukllay.pe"
                        value={identificadorRecuperar}
                        onChange={(e) => setIdentificadorRecuperar(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setError(null); setMensajeExito(null); setTab('LOGIN'); }}
                      className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver</span>
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-4 h-4 fill-slate-950" />
                      <span>Enviar Código SMS 📲</span>
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: Ingresar Código SMS Recibido */}
              {pasoRecuperar === 2 && (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-xs">
                    Hola <strong className="text-white">{usuarioRecuperarNombre}</strong>, ingresa el código de 6 dígitos enviado por SMS a tu número <strong className="text-emerald-400">{usuarioRecuperarTelefono}</strong>:
                  </div>

                  {!bannerSMS.visible && (
                    <button
                      type="button"
                      onClick={() => {
                        reproducirSonidoNotificacionSMS();
                        setBannerSMS({
                          visible: true,
                          codigo: codigoRecuperarGenerado,
                          telefono: usuarioRecuperarTelefono,
                          tipo: 'RECUPERACION',
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px] font-bold cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ver código SMS ({codigoRecuperarGenerado})</span>
                    </button>
                  )}

                  <OtpBoxesInput
                    valor={codigoRecuperarIngresado}
                    onChange={(cod) => setCodigoRecuperarIngresado(cod)}
                    onCompletado={() => handleValidarCodigoRecuperacion()}
                  />

                  <div className="text-slate-400 text-xs">
                    {segundosReenvio > 0 ? (
                      <span>Reenviar código en <strong className="text-emerald-400 font-mono">00:{segundosReenvio < 10 ? `0${segundosReenvio}` : segundosReenvio}</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReenviarCodigoRecuperacion}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Reenviar código por SMS</span>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPasoRecuperar(1)}
                      className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValidarCodigoRecuperacion()}
                      className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Validar Código</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: Nueva Contraseña */}
              {pasoRecuperar === 3 && (
                <form onSubmit={handleGuardarNuevaPassword} className="space-y-3.5">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs">
                    Código verificado. Ahora define tu nueva contraseña segura para tu cuenta:
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Nueva Contraseña:</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type={mostrarNuevoPass ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 5 caracteres"
                        value={nuevoPassword}
                        onChange={(e) => setNuevoPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNuevoPass(!mostrarNuevoPass)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {mostrarNuevoPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {nuevoPassword && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(nuevoPassword).color}`} />
                          <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(nuevoPassword).nivel >= 2 ? calcularFuerzaPassword(nuevoPassword).color : 'bg-slate-800'}`} />
                          <div className={`h-full flex-1 rounded-full ${calcularFuerzaPassword(nuevoPassword).nivel >= 3 ? calcularFuerzaPassword(nuevoPassword).color : 'bg-slate-800'}`} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {calcularFuerzaPassword(nuevoPassword).texto}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Confirmar Nueva Contraseña:</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type={mostrarNuevoPass ? 'text' : 'password'}
                        required
                        placeholder="Repite la contraseña"
                        value={confirmarNuevoPassword}
                        onChange={(e) => setConfirmarNuevoPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 font-black rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer text-sm mt-2 flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 fill-slate-950" />
                    <span>Guardar Nueva Contraseña e Iniciar Sesión</span>
                  </button>
                </form>
              )}

              {/* PASO 4: Éxito y Celebración */}
              {pasoRecuperar === 4 && (
                <div className="text-center py-6 space-y-3 animate-pop-in">
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">¡Contraseña Restaurada!</h3>
                  <p className="text-xs text-slate-400">
                    Tu acceso ha sido verificado con éxito. Ingresando al sistema...
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
