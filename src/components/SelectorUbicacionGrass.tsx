/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Selector de Ubicación Real para Grass Sintético (GPS + Marcado en Mapa)
 */

import React, { useEffect, useRef, useState } from 'react';
import { IUbicacionGeo } from '../domain/Sede.ts';
import { 
  loadGoogleMapsScript, 
  reverseGeocodeCoords, 
  DEFAULT_MAPS_API_KEY, 
  DISTRITOS_POPULARES_PERU, 
  COORDENADAS_DEFAULT_PERU 
} from '../utils/googleMapsLoader.ts';
import { reproducirSonidoExito } from '../utils/audioNotification.ts';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Crosshair, 
  Sparkles, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface SelectorUbicacionGrassProps {
  ubicacionInicial?: IUbicacionGeo;
  onChangeUbicacion: (ubicacion: IUbicacionGeo) => void;
  compacto?: boolean;
}

export const SelectorUbicacionGrass: React.FC<SelectorUbicacionGrassProps> = ({
  ubicacionInicial,
  onChangeUbicacion,
  compacto = false,
}) => {
  // Estado de coordenadas y dirección
  const [lat, setLat] = useState<number>(
    ubicacionInicial?.lat || COORDENADAS_DEFAULT_PERU.lat
  );
  const [lng, setLng] = useState<number>(
    ubicacionInicial?.lng || COORDENADAS_DEFAULT_PERU.lng
  );
  const [direccion, setDireccion] = useState<string>(
    ubicacionInicial?.direccion || 'Av. Santiago de Surco 1020'
  );
  const [distrito, setDistrito] = useState<string>(
    ubicacionInicial?.distrito || 'Santiago de Surco'
  );
  const [ciudad, setCiudad] = useState<string>(
    ubicacionInicial?.ciudad || 'Lima'
  );
  const [referencia, setReferencia] = useState<string>(
    ubicacionInicial?.referencia || ''
  );

  // Modo activo: 'GPS' (ubicación real actual) o 'MARCADOR' (marcado manual en mapa)
  const [modoSeleccion, setModoSeleccion] = useState<'GPS' | 'MARCADOR'>('MARCADOR');
  const [geolocalizando, setGeolocalizando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ tipo: 'EXITO' | 'ERROR' | 'INFO'; texto: string } | null>(null);
  const [precisionGps, setPrecisionGps] = useState<number | null>(null);
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [mostrarZonas, setMostrarZonas] = useState(false);

  // Referencias de Google Maps
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [mapaListo, setMapaListo] = useState(false);

  // Emitir cambios hacia el componente padre
  const notificarCambio = (nuevaUbicacion: IUbicacionGeo) => {
    onChangeUbicacion(nuevaUbicacion);
  };

  // Inicializar mapa de Google Maps
  useEffect(() => {
    let cancelado = false;

    loadGoogleMapsScript(DEFAULT_MAPS_API_KEY).then(() => {
      if (cancelado || !mapContainerRef.current) return;
      const google = (window as any).google;
      if (!google?.maps) return;

      const posInicial = { lat, lng };

      const map = new google.maps.Map(mapContainerRef.current, {
        center: posInicial,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi.sports_complex',
            elementType: 'geometry',
            stylers: [{ color: '#059669' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ lightness: 100 }, { visibility: 'simplified' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Marcador interactivo y arrastrable
      const marker = new google.maps.Marker({
        position: posInicial,
        map: map,
        draggable: true,
        title: 'Ubicación del Grass Sintético',
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      markerInstanceRef.current = marker;

      // Evento 1: Clic en cualquier punto del mapa para mover el marcador
      map.addListener('click', async (event: any) => {
        const clickedLat = event.latLng.lat();
        const clickedLng = event.latLng.lng();
        actualizarPosicionMarcador(clickedLat, clickedLng, 'Marcador fijado con clic en el mapa.');
      });

      // Evento 2: Fin de arrastre del marcador
      marker.addListener('dragend', async () => {
        const markerPos = marker.getPosition();
        if (markerPos) {
          actualizarPosicionMarcador(markerPos.lat(), markerPos.lng(), 'Marcador reubicado arrastrando el pin.');
        }
      });

      setMapaListo(true);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  // Función interna para reposicionar marcador y resolver geocodificación
  const actualizarPosicionMarcador = async (
    nuevoLat: number, 
    nuevoLng: number, 
    mensajeConfirmacion: string,
    forzarCentrado: boolean = false
  ) => {
    setLat(nuevoLat);
    setLng(nuevoLng);

    // Mover marcador en Google Maps
    if (markerInstanceRef.current) {
      const google = (window as any).google;
      if (google?.maps) {
        const newPos = new google.maps.LatLng(nuevoLat, nuevoLng);
        markerInstanceRef.current.setPosition(newPos);
        if (forzarCentrado && mapInstanceRef.current) {
          mapInstanceRef.current.panTo(newPos);
          mapInstanceRef.current.setZoom(16);
        }
      }
    }

    setMensajeEstado({ tipo: 'INFO', texto: 'Consultando dirección exacta...' });

    // Geocodificación inversa para obtener nombre de calle y distrito
    try {
      const geo = await reverseGeocodeCoords(nuevoLat, nuevoLng);
      setDireccion(geo.direccion);
      setDistrito(geo.distrito);
      setCiudad(geo.ciudad);

      const nuevaUbicacion: IUbicacionGeo = {
        lat: nuevoLat,
        lng: nuevoLng,
        direccion: geo.direccion,
        distrito: geo.distrito,
        ciudad: geo.ciudad,
        referencia
      };

      notificarCambio(nuevaUbicacion);
      setMensajeEstado({ tipo: 'EXITO', texto: mensajeConfirmacion });
    } catch {
      const nuevaUbicacion: IUbicacionGeo = {
        lat: nuevoLat,
        lng: nuevoLng,
        direccion,
        distrito,
        ciudad,
        referencia
      };
      notificarCambio(nuevaUbicacion);
      setMensajeEstado({ tipo: 'EXITO', texto: mensajeConfirmacion });
    }
  };

  // OPCIÓN 1: OBTENER UBICACIÓN REAL ACTUAL (GPS DEL DISPOSITIVO)
  const handleObtenerUbicacionGps = () => {
    if (!navigator.geolocation) {
      setMensajeEstado({
        tipo: 'ERROR',
        texto: 'Tu navegador o dispositivo no soporta geolocalización GPS.'
      });
      return;
    }

    setGeolocalizando(true);
    setModoSeleccion('GPS');
    setMensajeEstado({ tipo: 'INFO', texto: 'Conectando con el GPS de tu dispositivo...' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocalizando(false);
        const { latitude, longitude, accuracy } = position.coords;
        setPrecisionGps(Math.round(accuracy));

        reproducirSonidoExito();
        actualizarPosicionMarcador(
          latitude, 
          longitude, 
          `¡Ubicación GPS real detectada con éxito! (Precisión ±${Math.round(accuracy)}m)`, 
          true
        );
      },
      (error) => {
        setGeolocalizando(false);
        let errorMsg = 'No se pudo obtener la señal GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso de ubicación denegado. Puedes usar la opción de "Marcar en el mapa".';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Señal GPS no disponible temporalmente.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Tiempo de espera de GPS agotado.';
        }
        setMensajeEstado({ tipo: 'ERROR', texto: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // OPCIÓN 2: MODO MARCAR EN EL MAPA INTERACTIVO
  const handleActivarModoMarcador = () => {
    setModoSeleccion('MARCADOR');
    setPrecisionGps(null);
    setMensajeEstado({
      tipo: 'INFO',
      texto: 'Haz clic en cualquier punto del mapa o arrastra el marcador para fijar la entrada del complejo.'
    });

    if (mapInstanceRef.current) {
      const google = (window as any).google;
      if (google?.maps) {
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(16);
      }
    }
  };

  // Saltar a una zona o distrito popular de Perú
  const handleSeleccionarZona = (zona: typeof DISTRITOS_POPULARES_PERU[0]) => {
    setMostrarZonas(false);
    actualizarPosicionMarcador(
      zona.lat, 
      zona.lng, 
      `Mapa centrado en ${zona.nombre}, ${zona.ciudad}. Ajusta el pin en la posición exacta.`,
      true
    );
  };

  // Buscar dirección por texto
  const handleBuscarDireccion = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!busquedaTexto.trim()) return;

    setBuscando(true);
    try {
      const query = `${busquedaTexto.trim()}, Perú`;
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        const res = await geocoder.geocode({ address: query });
        if (res && res.results && res.results.length > 0) {
          const loc = res.results[0].geometry.location;
          actualizarPosicionMarcador(
            loc.lat(), 
            loc.lng(), 
            `Encontrado: ${res.results[0].formatted_address}`,
            true
          );
          setBuscando(false);
          return;
        }
      }

      // Fallback Nominatim search
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const newLat = parseFloat(data[0].lat);
          const newLng = parseFloat(data[0].lon);
          actualizarPosicionMarcador(newLat, newLng, `Encontrado: ${data[0].display_name}`, true);
        } else {
          setMensajeEstado({ tipo: 'ERROR', texto: 'No se encontró la dirección. Intenta marcarla directamente en el mapa.' });
        }
      }
    } catch {
      setMensajeEstado({ tipo: 'ERROR', texto: 'Error al buscar. Puedes colocar el marcador directamente en el mapa.' });
    } finally {
      setBuscando(false);
    }
  };

  // Actualización manual de los campos de texto
  const handleCambioManual = (campo: keyof IUbicacionGeo, valor: string) => {
    if (campo === 'direccion') setDireccion(valor);
    if (campo === 'distrito') setDistrito(valor);
    if (campo === 'ciudad') setCiudad(valor);
    if (campo === 'referencia') setReferencia(valor);

    const nuevaUbicacion: IUbicacionGeo = {
      lat,
      lng,
      direccion: campo === 'direccion' ? valor : direccion,
      distrito: campo === 'distrito' ? valor : distrito,
      ciudad: campo === 'ciudad' ? valor : ciudad,
      referencia: campo === 'referencia' ? valor : referencia,
    };
    notificarCambio(nuevaUbicacion);
  };

  return (
    <div className="space-y-3 bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 text-xs">
      
      {/* Encabezado y dos opciones principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Ubicación Real del Grass / Complejo
          </span>
          <h4 className="text-sm font-black text-white">
            ¿Cómo deseas fijar la ubicación del grass?
          </h4>
        </div>

        {/* Los 2 Botones de Acción Solicitados: Opción Ubicación Real vs Opción Marcado en Mapa */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={handleObtenerUbicacionGps}
            disabled={geolocalizando}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              modoSeleccion === 'GPS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Capturar coordenadas del GPS de tu dispositivo en tiempo real"
          >
            <Navigation className={`w-3.5 h-3.5 ${geolocalizando ? 'animate-spin' : ''}`} />
            <span>{geolocalizando ? 'Localizando...' : '📍 Mi Ubicación GPS'}</span>
          </button>

          <button
            type="button"
            onClick={handleActivarModoMarcador}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              modoSeleccion === 'MARCADOR'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Hacer clic o arrastrar el pin en el mapa de Google Maps"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>🗺️ Marcar en Mapa</span>
          </button>
        </div>
      </div>

      {/* Alerta de estado / feedback */}
      {mensajeEstado && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-[11px] animate-pop-in ${
          mensajeEstado.tipo === 'EXITO'
            ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
            : mensajeEstado.tipo === 'ERROR'
            ? 'bg-rose-950/80 border-rose-800/80 text-rose-200'
            : 'bg-blue-950/80 border-blue-800/80 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {mensajeEstado.tipo === 'EXITO' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {mensajeEstado.tipo === 'ERROR' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {mensajeEstado.tipo === 'INFO' && <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
            <span>{mensajeEstado.texto}</span>
          </div>
          {precisionGps !== null && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex-shrink-0">
              GPS ±{precisionGps}m
            </span>
          )}
        </div>
      )}

      {/* Barra de búsqueda y selector rápido de distritos */}
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar por avenida o referencia en Perú (ej. Av. Primavera, Surco)..."
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBuscarDireccion(e);
              }
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-16 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <button
            type="button"
            onClick={handleBuscarDireccion}
            disabled={buscando}
            className="absolute right-1 top-1 bottom-1 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Dropdown de distritos peruanos populares */}
        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMostrarZonas(!mostrarZonas)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-slate-300 hover:text-white flex items-center justify-between gap-2 text-xs font-semibold cursor-pointer"
          >
            <span>Ir a Distrito...</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {mostrarZonas && (
            <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 max-h-56 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2 block">
                Zonas Deportivas Populares
              </span>
              {DISTRITOS_POPULARES_PERU.map((z, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSeleccionarZona(z)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-emerald-600/30 hover:text-white text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="font-semibold">{z.nombre}</span>
                  <span className="text-[10px] text-slate-400">{z.ciudad}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenedor del Mapa Interactivo de Google Maps con Marcador Arrastrable */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
        <div 
          ref={mapContainerRef} 
          className={`w-full ${compacto ? 'h-48' : 'h-64'} transition-all`}
        />

        {/* Banner de instrucciones flotante sobre el mapa */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[10px] text-slate-300 pointer-events-none">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-3 h-3 text-emerald-400 animate-bounce" />
            Haz clic o arrastra el pin verde al punto exacto de la cancha
          </span>
          <span className="font-mono text-emerald-400 font-bold hidden sm:inline">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>

        {/* Botón flotante para recentrar en el marcador */}
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              const google = (window as any).google;
              if (google?.maps) {
                mapInstanceRef.current.panTo({ lat, lng });
                mapInstanceRef.current.setZoom(16);
              }
            }
          }}
          className="absolute bottom-2 right-2 p-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700 shadow-lg cursor-pointer transition-colors"
          title="Centrar en el marcador"
        >
          <Crosshair className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Resumen y Campos de Dirección Editables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            Dirección / Avenida / Calle:
          </label>
          <input
            type="text"
            required
            value={direccion}
            onChange={(e) => handleCambioManual('direccion', e.target.value)}
            placeholder="Ej. Av. Primavera 1230"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            Distrito:
          </label>
          <input
            type="text"
            required
            value={distrito}
            onChange={(e) => handleCambioManual('distrito', e.target.value)}
            placeholder="Ej. Santiago de Surco"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            Referencia de llegada:
          </label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => handleCambioManual('referencia', e.target.value)}
            placeholder="Ej. Frente al Colegio, portón verde"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            Coordenadas GPS fijadas:
          </label>
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-[11px]">
            <span>Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}</span>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 font-sans text-[10px]"
            >
              <span>Ver mapa</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};
