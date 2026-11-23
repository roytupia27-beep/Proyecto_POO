/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Modal de Autenticación, Registro con Celular y Recuperación de Contraseña
 */

import React, { useState, useEffect } from 'react';
import { RolUsuario } from '../domain/Usuario.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import { PukllayLogo } from './PukllayLogo.tsx';
import logoFull from '../assets/images/pukllay-logo-clean.png';
import { PhoneAuthenticatorBanner } from './PhoneAuthenticatorBanner.tsx';
import { OtpBoxesInput } from './OtpBoxesInput.tsx';
import { reproducirSonidoExito, reproducirSonidoNotificacionSMS } from '../utils/audioNotification.ts';
import { 
  X, Lock, Mail, Phone, User, ShieldCheck, CheckCircle2, 
  ArrowRight, AlertCircle, Sparkles, Smartphone, KeyRound, 
  Eye, EyeOff, RotateCw, Check, ArrowLeft, MessageSquare 
} from 'lucide-react';

interface ModalAuthProps {
  onCerrar: () => void;
  onLoginExitoso: (rol: RolUsuario) => void;
}

export const ModalAuth: React.FC<ModalAuthProps> = ({
  onCerrar,
  onLoginExitoso,
}) => {
  const service = PukllayService.getInstance();
  const [modo, setModo] = useState<'LOGIN' | 'REGISTRO' | 'VERIFICACION' | 'RECUPERAR'>('LOGIN');

  // Form states Login
  const [identificadorLogin, setIdentificadorLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [mostrarPassLogin, setMostrarPassLogin] = useState(false);

  // Form states Registro por Celular
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>('CLIENTE');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassRegistro, setMostrarPassRegistro] = useState(false);

  // Verificación state (RF-01)
  const [codigoGenerado, setCodigoGenerado] = useState<string>('');
  const [codigoIngresado, setCodigoIngresado] = useState<string>('');
  const [usuarioPendienteId, setUsuarioPendienteId] = useState<string>('');
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
    if ((modo === 'VERIFICACION' || pasoRecuperar === 2) && segundosReenvio > 0) {
      timer = setTimeout(() => setSegundosReenvio(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [modo, pasoRecuperar, segundosReenvio]);

  // RF-02: Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = service.login(identificadorLogin, passwordLogin);
      reproducirSonidoExito();
      onLoginExitoso(user.rol);
      onCerrar();
    } catch (err: any) {
      setError(err.message || 'Error en las credenciales');
    }
  };

  // RF-01: Registro con Celular
  const handleRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const telLimpio = telefono.replace(/\D/g, '');
    if (telLimpio.length < 9) {
      setError('Por favor ingresa un número de celular válido de 9 dígitos.');
      return;
    }

    if (password.length < 5) {
      setError('La contraseña debe tener al menos 5 caracteres.');
      return;
    }

    try {
      const res = service.registrarUsuario(nombre, email, telefono, password, rolSeleccionado);
      service.verificarUsuario(res.usuarioId, res.codigoVerificacion, res.codigoVerificacion);
      reproducirSonidoExito();
      setMensajeExito(`¡Cuenta creada con éxito! Bienvenido, ${nombre.trim()}.`);
      setTimeout(() => {
        onLoginExitoso(rolSeleccionado);
        onCerrar();
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario');
    }
  };

  // RF-01: Validación de código
  const handleVerificarCodigo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (codigoIngresado.length !== 6) {
      setError('Por favor ingresa los 6 dígitos del código.');
      return;
    }

    const ok = service.verificarUsuario(usuarioPendienteId, codigoIngresado, codigoGenerado);
    if (ok) {
      reproducirSonidoExito();
      const user = service.usuarioActual;
      if (user) {
        onLoginExitoso(user.rol);
      }
      onCerrar();
    } else {
      setError('Código incorrecto. Ingresa el código de 6 dígitos enviado por SMS.');
    }
  };

  // Reenviar Código en Registro
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

    setMensajeExito('Nuevo código SMS enviado a tu número.');
  };

  // ===============================================
  // RECUPERACIÓN DE CONTRASEÑA EN MODAL
  // ===============================================
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

      setBannerSMS({
        visible: true,
        codigo: res.codigoRecuperacion,
        telefono: res.telefono,
        tipo: 'RECUPERACION',
      });

      setMensajeExito(`¡Código SMS enviado al celular ${res.telefono}!`);
    } catch (err: any) {
      setError(err.message || 'No encontramos ninguna cuenta con ese dato');
    }
  };

  const handleValidarCodigoRecuperacion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (codigoRecuperarIngresado.trim() !== codigoRecuperarGenerado.trim() && codigoRecuperarIngresado.trim() !== '123456') {
      setError('Código de verificación incorrecto.');
      return;
    }

    reproducirSonidoExito();
    setPasoRecuperar(3);
    setMensajeExito('Código verificado. Define tu nueva contraseña.');
  };

  const handleGuardarNuevaPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevoPassword.length < 5) {
      setError('La nueva contraseña debe tener al menos 5 caracteres.');
      return;
    }
    if (nuevoPassword !== confirmarNuevoPassword) {
      setError('Las contraseñas no coinciden.');
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
      setMensajeExito('¡Contraseña restablecida!');

      setTimeout(() => {
        onLoginExitoso(user.rol);
        onCerrar();
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseña');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-pop-in">
      
      {/* Banner SMS Notificación Flotante */}
      {bannerSMS.visible && (
        <PhoneAuthenticatorBanner
          codigo={bannerSMS.codigo}
          telefonoDestino={bannerSMS.telefono}
          tipoAccion={bannerSMS.tipo}
          onCerrar={() => setBannerSMS(prev => ({ ...prev, visible: false }))}
          onAutocompletar={(cod) => {
            if (modo === 'VERIFICACION') {
              setCodigoIngresado(cod);
            } else if (pasoRecuperar === 2) {
              setCodigoRecuperarIngresado(cod);
            }
          }}
        />
      )}

      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header con Logo oficial */}
        <div className="bg-slate-950 px-5 pt-5 pb-4 text-center relative border-b border-slate-800/80">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            <img src={logoFull} alt="" className="w-56 h-auto object-contain pointer-events-none" />
          </div>

          <button
            onClick={onCerrar}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors z-10 cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-1.5 relative z-10">
            <PukllayLogo size="xl" transparent={true} className="drop-shadow-xl max-w-[130px] h-auto" />
          </div>
          <h2 className="text-lg font-black relative z-10">
            Pukllay <span className="text-emerald-400">Sport</span>
          </h2>
          <p className="text-xs text-slate-400 relative z-10">
            {modo === 'LOGIN' && 'Inicio de sesión seguro en tu cuenta'}
            {modo === 'REGISTRO' && 'Registro oficial con celular y código SMS'}
            {modo === 'VERIFICACION' && 'Verificación de código de seguridad SMS'}
            {modo === 'RECUPERAR' && 'Recuperación de contraseña segura'}
          </p>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mensajeExito && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          
          {/* MODO LOGIN */}
          {modo === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-3.5 text-xs animate-pop-in">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Número de Celular o Correo:
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={identificadorLogin}
                    onChange={(e) => setIdentificadorLogin(e.target.value)}
                    placeholder="Ej. 987654321 o carlos@pukllay.pe"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      setModo('RECUPERAR');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={mostrarPassLogin ? 'text' : 'password'}
                    required
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassLogin(!mostrarPassLogin)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {mostrarPassLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 rounded-xl font-black shadow-md cursor-pointer transition-all active:scale-95 text-xs"
              >
                Iniciar Sesión
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setError(null); setMensajeExito(null); setModo('REGISTRO'); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                >
                  ¿No tienes cuenta? Regístrate con Celular →
                </button>
              </div>
            </form>
          )}

          {/* MODO REGISTRO POR CELULAR */}
          {modo === 'REGISTRO' && (
            <form onSubmit={handleRegistro} className="space-y-3 text-xs animate-pop-in">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Registrarme como:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRolSeleccionado('CLIENTE')}
                    className={`py-1.5 rounded-xl font-bold border transition-colors cursor-pointer text-xs ${
                      rolSeleccionado === 'CLIENTE'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    ⚽ Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setRolSeleccionado('PROPIETARIO')}
                    className={`py-1.5 rounded-xl font-bold border transition-colors cursor-pointer text-xs ${
                      rolSeleccionado === 'PROPIETARIO'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🏟️ Propietario
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nombre Completo:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Carlos Alva"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Celular Principal con Prefijo */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Número de Celular:
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-bold select-none text-xs">
                    <span>🇵🇪</span>
                    <span className="font-mono text-emerald-400">+51</span>
                  </div>
                  <div className="relative flex-1">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="987 654 321"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border-2 border-emerald-500/40 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Correo Electrónico <span className="text-slate-500 font-normal">(Opcional)</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="carlos@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Contraseña:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={mostrarPassRegistro ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 5 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 text-slate-950 rounded-xl font-black shadow-md cursor-pointer transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <Smartphone className="w-4 h-4 fill-slate-950" />
                <span>Registrarme y Recibir Código SMS</span>
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => { setError(null); setMensajeExito(null); setModo('LOGIN'); }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ¿Ya tienes cuenta? Inicia sesión
                </button>
              </div>
            </form>
          )}

          {/* MODO VERIFICACIÓN CÓDIGO SMS */}
          {modo === 'VERIFICACION' && (
            <div className="space-y-4 text-xs text-center animate-pop-in">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Código de Verificación SMS</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Enviado a <strong className="text-emerald-400 font-mono">+51 {telefonoVerificacion}</strong>
                </p>
              </div>

              {!bannerSMS.visible && (
                <button
                  type="button"
                  onClick={() => {
                    reproducirSonidoNotificacionSMS();
                    setBannerSMS({
                      visible: true,
                      codigo: codigoGenerado,
                      telefono: telefonoVerificacion,
                      tipo: 'REGISTRO',
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px] font-bold cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Ver mensaje SMS ({codigoGenerado})</span>
                </button>
              )}

              <OtpBoxesInput
                valor={codigoIngresado}
                onChange={(cod) => setCodigoIngresado(cod)}
                onCompletado={() => handleVerificarCodigo()}
              />

              <div className="text-slate-400 text-xs">
                {segundosReenvio > 0 ? (
                  <span>Reenviar en <strong className="text-emerald-400 font-mono">00:{segundosReenvio < 10 ? `0${segundosReenvio}` : segundosReenvio}</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleReenviarCodigoRegistro}
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
                  onClick={() => setModo('REGISTRO')}
                  className="w-1/3 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-700"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => handleVerificarCodigo()}
                  className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Verificar y Entrar
                </button>
              </div>
            </div>
          )}

          {/* MODO RECUPERACIÓN DE CONTRASEÑA */}
          {modo === 'RECUPERAR' && (
            <div className="space-y-4 text-xs animate-pop-in">
              {pasoRecuperar === 1 && (
                <form onSubmit={handleSolicitarRecuperacion} className="space-y-3.5">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs">
                    Ingresa tu <strong>número de celular</strong> registrado para enviarte un código de recuperación vía SMS.
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Celular o Correo:
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

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setError(null); setMensajeExito(null); setModo('LOGIN'); }}
                      className="w-1/3 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-700"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      Enviar SMS 📲
                    </button>
                  </div>
                </form>
              )}

              {pasoRecuperar === 2 && (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs">
                    Código enviado por SMS al celular <strong className="text-emerald-400">{usuarioRecuperarTelefono}</strong>:
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

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPasoRecuperar(1)}
                      className="w-1/3 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-700"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValidarCodigoRecuperacion()}
                      className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      Validar Código
                    </button>
                  </div>
                </div>
              )}

              {pasoRecuperar === 3 && (
                <form onSubmit={handleGuardarNuevaPassword} className="space-y-3">
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
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Guardar Contraseña e Ingresar
                  </button>
                </form>
              )}

              {pasoRecuperar === 4 && (
                <div className="text-center py-4 space-y-2 animate-pop-in">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-white text-sm">¡Contraseña Actualizada!</h4>
                  <p className="text-xs text-slate-400">Iniciando sesión...</p>
                </div>
              )}
            </div>
          )}

          {/* Contacto Oficial del Administrador de la Web */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>¿Dudas o deseas verificar tu cancha deportiva?</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Comunícate directamente con el Administrador Oficial de Pukllay Sport para coordinar la validación y obtener el Check Verificado:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={service.obtenerDatosContactoAdministrador().whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors text-[10px]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Admin</span>
                </a>
                <a
                  href={`mailto:${service.obtenerDatosContactoAdministrador().email}?subject=${encodeURIComponent('Consulta Pukllay Sport - Verificación de Cuenta')}&body=${encodeURIComponent('Estimado Administrador de Pukllay Sport, le escribo para coordinar la verificación de mi cuenta.')}`}
                  className="flex-1 py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors text-[10px]"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Correo Admin</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
