/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Ventana y Gestión de Usuarios Registrados
 * Permite visualizar Nombre, Correo, Número y Contraseña, además de Crear y Editar usuarios.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Usuario, RolUsuario } from '../domain/Usuario.ts';
import { PukllayService } from '../domain/PukllayService.ts';
import {
  Users, UserPlus, Search, Edit3, Trash2, Eye, EyeOff,
  Copy, Check, X, Shield, Phone, Mail, Lock, User,
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
  Sparkles, RefreshCw, KeyRound, ExternalLink, ArrowUpDown,
  FileCode2, Download
} from 'lucide-react';
import { SCRIPTS_PYTHON_PUKLLAY } from '../utils/pythonScriptsData.ts';

interface VentanaUsuariosRegistradosProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioActual?: Usuario | null;
}

export const VentanaUsuariosRegistrados: React.FC<VentanaUsuariosRegistradosProps> = ({
  isOpen,
  onClose,
  usuarioActual,
}) => {
  const service = PukllayService.getInstance();

  const [usuarios, setUsuarios] = useState<Usuario[]>(() => service.obtenerTodosUsuarios());
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'TODOS' | RolUsuario>('TODOS');
  
  // Visibilidad de contraseñas
  const [mostrarTodasPass, setMostrarTodasPass] = useState(false);
  const [passVisibles, setPassVisibles] = useState<{ [id: string]: boolean }>({});
  
  // Feedback visual de copiado
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);

  // Estados de modales secundarios: Edición y Creación
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formEditNombre, setFormEditNombre] = useState('');
  const [formEditEmail, setFormEditEmail] = useState('');
  const [formEditTelefono, setFormEditTelefono] = useState('');
  const [formEditPassword, setFormEditPassword] = useState('');
  const [formEditRol, setFormEditRol] = useState<RolUsuario>('CLIENTE');
  const [formEditVerificado, setFormEditVerificado] = useState(true);

  // Modal de Crear Nuevo Usuario
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [formCrearNombre, setFormCrearNombre] = useState('');
  const [formCrearEmail, setFormCrearEmail] = useState('');
  const [formCrearTelefono, setFormCrearTelefono] = useState('');
  const [formCrearPassword, setFormCrearPassword] = useState('');
  const [formCrearRol, setFormCrearRol] = useState<RolUsuario>('CLIENTE');
  const [formCrearVerificado, setFormCrearVerificado] = useState(true);

  // Confirmación de eliminación
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);

  // Cargar lista de usuarios y suscribirse a cambios
  const refrescarUsuarios = () => {
    setUsuarios(service.obtenerTodosUsuarios());
  };

  useEffect(() => {
    if (isOpen) {
      refrescarUsuarios();
      const unsub = service.suscribir(() => {
        refrescarUsuarios();
      });
      return () => unsub();
    }
  }, [isOpen]);

  const mostrarMensaje = (texto: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    setNotificacion({ texto, tipo });
    setTimeout(() => {
      setNotificacion(null);
    }, 3500);
  };

  // Filtrado de usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const cumpleRol = filtroRol === 'TODOS' || u.rol === filtroRol;
      const b = busqueda.toLowerCase().trim();
      if (!b) return cumpleRol;

      const coincideNombre = u.nombre.toLowerCase().includes(b);
      const coincideEmail = u.email.toLowerCase().includes(b);
      const coincideTel = u.telefono.includes(b);
      const coincideRol = u.rol.toLowerCase().includes(b);
      const coincidePass = u.passwordHash.toLowerCase().includes(b);

      return cumpleRol && (coincideNombre || coincideEmail || coincideTel || coincideRol || coincidePass);
    });
  }, [usuarios, filtroRol, busqueda]);

  // Contadores por rol
  const conteos = useMemo(() => {
    return {
      total: usuarios.length,
      clientes: usuarios.filter((u) => u.rol === 'CLIENTE').length,
      propietarios: usuarios.filter((u) => u.rol === 'PROPIETARIO').length,
      encargados: usuarios.filter((u) => u.rol === 'ENCARGADO').length,
      admins: usuarios.filter((u) => u.rol === 'ADMINISTRADOR').length,
    };
  }, [usuarios]);

  // Control de Acceso Estricto: Sólo el Administrador de la plataforma puede acceder
  if (!isOpen || usuarioActual?.rol !== 'ADMINISTRADOR') return null;

  // Acciones de portapapeles
  const copiarAlPortapapeles = (texto: string, etiqueta: string, id: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    mostrarMensaje(`✓ ${etiqueta} copiado al portapapeles`, 'info');
    setTimeout(() => {
      setCopiadoId(null);
    }, 2000);
  };

  // Abrir modal de edición
  const handleAbrirEditar = (user: Usuario) => {
    setUsuarioEditando(user);
    setFormEditNombre(user.nombre);
    setFormEditEmail(user.email);
    setFormEditTelefono(user.telefono);
    setFormEditPassword(user.passwordHash);
    setFormEditRol(user.rol);
    setFormEditVerificado(user.verificado);
  };

  // Guardar edición
  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    try {
      service.actualizarUsuario({
        id: usuarioEditando.id,
        nombre: formEditNombre,
        email: formEditEmail,
        telefono: formEditTelefono,
        password: formEditPassword,
        rol: formEditRol,
        verificado: formEditVerificado,
      });

      mostrarMensaje(`Usuario "${formEditNombre}" actualizado correctamente.`);
      setUsuarioEditando(null);
      refrescarUsuarios();
    } catch (err: any) {
      mostrarMensaje(err.message || 'Error al guardar cambios del usuario', 'error');
    }
  };

  // Abrir modal de creación
  const handleAbrirCrear = () => {
    setFormCrearNombre('');
    setFormCrearEmail('');
    setFormCrearTelefono('');
    // Generar contraseña sugerida por defecto
    setFormCrearPassword(`Pukllay${Math.floor(100 + Math.random() * 900)}!`);
    setFormCrearRol('CLIENTE');
    setFormCrearVerificado(true);
    setMostrarModalCrear(true);
  };

  // Guardar nuevo usuario
  const handleGuardarNuevoUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nuevo = service.crearUsuarioDirecto({
        nombre: formCrearNombre,
        email: formCrearEmail,
        telefono: formCrearTelefono,
        password: formCrearPassword,
        rol: formCrearRol,
        verificado: formCrearVerificado,
      });

      mostrarMensaje(`✓ Nuevo usuario "${nuevo.nombre}" registrado exitosamente.`);
      setMostrarModalCrear(false);
      refrescarUsuarios();
    } catch (err: any) {
      mostrarMensaje(err.message || 'Error al crear el usuario', 'error');
    }
  };

  // Alternar verificación
  const handleToggleVerificado = (user: Usuario) => {
    try {
      service.actualizarUsuario({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rol: user.rol,
        verificado: !user.verificado,
      });
      mostrarMensaje(`Estado de "${user.nombre}" cambiado a ${!user.verificado ? 'Verificado' : 'No verificado'}.`);
      refrescarUsuarios();
    } catch (err: any) {
      mostrarMensaje(err.message || 'Error al cambiar estado', 'error');
    }
  };

  // Eliminar usuario
  const handleConfirmarEliminar = () => {
    if (!usuarioAEliminar) return;
    try {
      service.eliminarUsuario(usuarioAEliminar.id, true);
      mostrarMensaje(`Usuario "${usuarioAEliminar.nombre}" eliminado del sistema.`);
      setUsuarioAEliminar(null);
      refrescarUsuarios();
    } catch (err: any) {
      mostrarMensaje(err.message || 'Error al eliminar usuario', 'error');
      setUsuarioAEliminar(null);
    }
  };

  // Generador de contraseñas automáticas
  const generarContrasenaAleatoria = (setter: (p: string) => void) => {
    const palabras = ['Golazo', 'Pukllay', 'Cancha', 'Campeon', 'Estadio', 'Pelota'];
    const p = palabras[Math.floor(Math.random() * palabras.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setter(`${p}${num}!`);
  };

  const getRolBadgeColor = (rol: RolUsuario) => {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PROPIETARIO':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ENCARGADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CLIENTE':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO DE LA VENTANA */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Usuarios Registrados en la Plataforma
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {usuarios.length} registrados
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Consulta Nombre, Correo, Número Celular y Contraseñas. Edita o crea nuevas cuentas directamente.
              </p>
            </div>
          </div>

          {/* Botones de acción principales en el encabezado */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const script = SCRIPTS_PYTHON_PUKLLAY.find(s => s.id === 'gestionar_usuarios') || SCRIPTS_PYTHON_PUKLLAY[3];
                const elemento = document.createElement('a');
                elemento.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(script.codigo));
                elemento.setAttribute('download', 'gestionar_usuarios.py');
                elemento.style.display = 'none';
                document.body.appendChild(elemento);
                elemento.click();
                document.body.removeChild(elemento);
                mostrarMensaje('Script Python "gestionar_usuarios.py" descargado con éxito.', 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
              title="Descargar gestionar_usuarios.py para auditar o crear usuarios vía CLI en Python 3"
            >
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>🐍 Script Python CLI</span>
            </button>

            <button
              onClick={handleAbrirCrear}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Registrar Nuevo Usuario</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOTIFICACIÓN / ALERTA TOAST DENTRO DE LA VENTANA */}
        {notificacion && (
          <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all ${
            notificacion.tipo === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : notificacion.tipo === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <span>{notificacion.texto}</span>
            <button onClick={() => setNotificacion(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS POR ROL */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, número de celular o contraseña..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chips de filtro por rol */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFiltroRol('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroRol === 'TODOS'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos ({conteos.total})
            </button>
            <button
              onClick={() => setFiltroRol('CLIENTE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroRol === 'CLIENTE'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Clientes ({conteos.clientes})
            </button>
            <button
              onClick={() => setFiltroRol('PROPIETARIO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroRol === 'PROPIETARIO'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Propietarios ({conteos.propietarios})
            </button>
            <button
              onClick={() => setFiltroRol('ADMINISTRADOR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroRol === 'ADMINISTRADOR'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Admins ({conteos.admins})
            </button>
            {conteos.encargados > 0 && (
              <button
                onClick={() => setFiltroRol('ENCARGADO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filtroRol === 'ENCARGADO'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Encargados ({conteos.encargados})
              </button>
            )}
          </div>

          {/* Toggle global de contraseñas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarTodasPass(!mostrarTodasPass)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              title="Revelar u ocultar todas las contraseñas"
            >
              {mostrarTodasPass ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ocultar contraseñas</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver todas las contraseñas</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* LISTA / TABLA DE USUARIOS REGISTRADOS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
          {usuariosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No se encontraron usuarios</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay coincidencias con la búsqueda "{busqueda}" o el filtro seleccionado.
              </p>
              <button
                onClick={() => { setBusqueda(''); setFiltroRol('TODOS'); }}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Restablecer búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {usuariosFiltrados.map((u) => {
                const esSesionActual = usuarioActual?.id === u.id;
                const passVisible = mostrarTodasPass || !!passVisibles[u.id];
                const telLimpio = u.telefono.replace(/\D/g, '');

                return (
                  <div
                    key={u.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md ${
                      esSesionActual
                        ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-400/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* INFORMACIÓN PRINCIPAL: AVATAR, NOMBRE, ROL Y ESTADO */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt={u.nombre}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                              {u.nombre}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getRolBadgeColor(u.rol)}`}>
                              {u.rol}
                            </span>
                            {esSesionActual && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm">
                                Sesión Activa
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleToggleVerificado(u)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                u.verificado
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                              title="Haz clic para alternar estado de verificación"
                            >
                              {u.verificado ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verificado</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Pendiente</span>
                                </>
                              )}
                            </button>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {u.id.substring(0, 14)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DATOS SOLICITADOS: CORREO, NÚMERO Y CONTRASEÑA */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 bg-slate-50/80 p-3 sm:p-3.5 rounded-2xl border border-slate-100">
                        
                        {/* 1. CORREO ELECTRÓNICO */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> Correo
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-xs font-semibold text-slate-800 truncate select-all" title={u.email}>
                              {u.email}
                            </span>
                            <button
                              onClick={() => copiarAlPortapapeles(u.email, 'Correo', `email_${u.id}`)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                              title="Copiar correo"
                            >
                              {copiadoId === `email_${u.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 2. NÚMERO DE TELÉFONO / CELULAR */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> Teléfono / Celular
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-xs font-mono font-bold text-slate-800 select-all">
                              {u.telefono}
                            </span>
                            <div className="flex items-center">
                              {telLimpio.length >= 7 && (
                                <a
                                  href={`https://wa.me/51${telLimpio}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-emerald-600 hover:text-emerald-700 rounded-md hover:bg-white transition-colors"
                                  title="Enviar mensaje por WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => copiarAlPortapapeles(u.telefono, 'Teléfono', `tel_${u.id}`)}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                                title="Copiar número"
                              >
                                {copiadoId === `tel_${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 3. CONTRASEÑA (VISIBLE / OCULTABLE / COPIABLE) */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" /> Contraseña
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5 bg-white px-2 py-1 rounded-xl border border-slate-200/80 shadow-inner">
                            <span className="text-xs font-mono font-black text-slate-900 tracking-wider truncate select-all">
                              {passVisible ? u.passwordHash : '••••••••'}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => setPassVisibles(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                                title={passVisible ? "Ocultar contraseña" : "Ver contraseña"}
                              >
                                {passVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                              </button>
                              <button
                                onClick={() => copiarAlPortapapeles(u.passwordHash, 'Contraseña', `pwd_${u.id}`)}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors cursor-pointer"
                                title="Copiar contraseña"
                              >
                                {copiadoId === `pwd_${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* BOTONES DE EDICIÓN Y ACCIÓN */}
                      <div className="flex items-center gap-2 self-end lg:self-center">
                        <button
                          onClick={() => handleAbrirEditar(u)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm border border-emerald-200/60"
                          title="Editar información de este usuario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        
                        {u.rol !== 'ADMINISTRADOR' && (
                          <button
                            onClick={() => setUsuarioAEliminar(u)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              Todos los cambios y nuevos usuarios se sincronizan automáticamente en el sistema y almacenamiento local.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
          >
            Cerrar Directorio
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL SECUNDARIO: EDITAR INFORMACIÓN DE USUARIO          */}
      {/* ======================================================== */}
      {usuarioEditando && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black">Editar Información de Usuario</h3>
              </div>
              <button
                onClick={() => setUsuarioEditando(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="p-5 sm:p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formEditNombre}
                    onChange={(e) => setFormEditNombre(e.target.value)}
                    placeholder="Ej: Roberto González"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formEditEmail}
                    onChange={(e) => setFormEditEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Número de Celular */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número de Celular / Teléfono
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formEditTelefono}
                    onChange={(e) => setFormEditTelefono(e.target.value)}
                    placeholder="Ej: 987654321"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => generarContrasenaAleatoria(setFormEditPassword)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generar Segura
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formEditPassword}
                    onChange={(e) => setFormEditPassword(e.target.value)}
                    placeholder="Contraseña del usuario"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rol de Usuario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol en la Plataforma
                  </label>
                  <select
                    value={formEditRol}
                    onChange={(e) => setFormEditRol(e.target.value as RolUsuario)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-bold"
                  >
                    <option value="CLIENTE">Cliente (Pelotero)</option>
                    <option value="PROPIETARIO">Propietario de Cancha</option>
                    <option value="ENCARGADO">Encargado de Sede</option>
                    <option value="ADMINISTRADOR">Administrador Maestro</option>
                  </select>
                </div>

                {/* Estado de Verificación */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado Cuenta
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formEditVerificado}
                      onChange={(e) => setFormEditVerificado(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Cuenta Verificada</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL SECUNDARIO: REGISTRAR / CREAR NUEVO USUARIO        */}
      {/* ======================================================== */}
      {mostrarModalCrear && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black">Registrar Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setMostrarModalCrear(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoUsuario} className="p-5 sm:p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formCrearNombre}
                    onChange={(e) => setFormCrearNombre(e.target.value)}
                    placeholder="Ej: Gianluca Lapadula"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Número de Celular */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Número de Celular (Perú)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formCrearTelefono}
                    onChange={(e) => {
                      const tel = e.target.value;
                      setFormCrearTelefono(tel);
                      // Sugerir correo si está vacío
                      if (!formCrearEmail && tel.replace(/\D/g, '').length >= 7) {
                        setFormCrearEmail(`${tel.replace(/\D/g, '')}@pukllay.pe`);
                      }
                    }}
                    placeholder="Ej: 999123456"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formCrearEmail}
                    onChange={(e) => setFormCrearEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña Inicial
                  </label>
                  <button
                    type="button"
                    onClick={() => generarContrasenaAleatoria(setFormCrearPassword)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generar Automática
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formCrearPassword}
                    onChange={(e) => setFormCrearPassword(e.target.value)}
                    placeholder="Ej: Pukllay2026!"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Rol y Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rol
                  </label>
                  <select
                    value={formCrearRol}
                    onChange={(e) => setFormCrearRol(e.target.value as RolUsuario)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white font-bold"
                  >
                    <option value="CLIENTE">Cliente (Pelotero)</option>
                    <option value="PROPIETARIO">Propietario de Cancha</option>
                    <option value="ENCARGADO">Encargado de Sede</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado Inicial
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formCrearVerificado}
                      onChange={(e) => setFormCrearVerificado(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Verificado / Activo</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Registrar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN                     */}
      {/* ======================================================== */}
      {usuarioAEliminar && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto mb-3 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">¿Eliminar este usuario?</h3>
            <p className="text-xs text-slate-600 mt-1 mb-5">
              Se eliminará permanentemente la cuenta de <strong>{usuarioAEliminar.nombre}</strong> ({usuarioAEliminar.email}).
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setUsuarioAEliminar(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
