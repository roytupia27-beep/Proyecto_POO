/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Integración de Google Maps con Sedes de Grass Sintético
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sede, Cancha } from '../domain/Sede.ts';
import { loadGoogleMapsScript, DEFAULT_MAPS_API_KEY, DISTRITOS_POPULARES_PERU } from '../utils/googleMapsLoader.ts';
import { MapPin, Navigation, Compass, ExternalLink, Calendar, CheckCircle2, DollarSign, MessageCircle, Sliders, Sparkles } from 'lucide-react';

interface GoogleMapViewProps {
  sedes: Sede[];
  sedeSeleccionadaId?: string | null;
  onSeleccionarSede: (sede: Sede) => void;
  onReservarCancha?: (cancha: Cancha, sede: Sede) => void;
  onAbrirChat?: (sede: Sede) => void;
  ubicacionUsuario: { lat: number; lng: number } | null;
  onUbicacionUsuarioChange?: (coords: { lat: number; lng: number }, radioKm?: number) => void;
  radioKm?: number;
  onRadioKmChange?: (radioKm: number) => void;
}

const ZONAS_POPULARES = DISTRITOS_POPULARES_PERU.slice(0, 6);

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  sedes,
  sedeSeleccionadaId,
  onSeleccionarSede,
  onReservarCancha,
  onAbrirChat,
  ubicacionUsuario,
  onUbicacionUsuarioChange,
  radioKm = 5,
  onRadioKmChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geolocalizando, setGeolocalizando] = useState(false);
  const [mensajeGps, setMensajeGps] = useState<string | null>(null);
  const [sedeActivaEnMapa, setSedeActivaEnMapa] = useState<Sede | null>(null);

  const apiKey = DEFAULT_MAPS_API_KEY;

  // Inicializar Google Maps
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!apiKey) {
      setMapError('Configura VITE_GOOGLE_MAPS_API_KEY en tu archivo .env para ver el mapa interactivo de Google Maps.');
      return;
    }

    let isMounted = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) {
          setMapError('No se pudo inicializar la API de Google Maps en este navegador. Mostrando radar interactivo de cercanía.');
          return;
        }

        const defaultCenter = ubicacionUsuario || { lat: -12.122150, lng: -77.036880 }; // Lima

        const map = new google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi.sports_complex',
              elementType: 'geometry',
              stylers: [{ color: '#c7f9cc' }],
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#d8f3dc' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#bde0fe' }],
            },
          ],
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      })
      .catch((err: any) => {
        console.warn('Error cargando Google Maps API:', err);
        setMapError('No se pudo inicializar la API de Google Maps en este navegador. Mostrando radar interactivo de cercanía.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Manejar marcadores de Sedes
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    sedes.forEach((sede) => {
      const precioMin = sede.obtenerPrecioMinimo();
      const pos = { lat: sede.ubicacion.lat, lng: sede.ubicacion.lng };
      bounds.extend(pos);

      // Icono SVG con césped
      const svgMarker = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#16a34a', // Emerald 600
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff',
        scale: 2.2,
        anchor: new google.maps.Point(12, 22),
      };

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current!,
        title: sede.nombre,
        icon: svgMarker,
        animation: google.maps.Animation.DROP,
        label: {
          text: `S/. ${precioMin}`,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
      });

      marker.addListener('click', () => {
        setSedeActivaEnMapa(sede);
        onSeleccionarSede(sede);
        mapInstanceRef.current?.panTo(pos);
      });

      markersRef.current.push(marker);
    });

    if (ubicacionUsuario) {
      bounds.extend(ubicacionUsuario);
    }

    if (sedes.length > 0 && !sedeSeleccionadaId && !radioKm) {
      mapInstanceRef.current.fitBounds(bounds, 50);
    }
  }, [mapLoaded, sedes, onSeleccionarSede]);

  // Marcador de ubicación del usuario
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (ubicacionUsuario) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition(ubicacionUsuario);
      } else {
        const userIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        };

        userMarkerRef.current = new google.maps.Marker({
          position: ubicacionUsuario,
          map: mapInstanceRef.current,
          title: 'Tu ubicación actual',
          icon: userIcon,
          zIndex: 999,
        });
      }
    }
  }, [mapLoaded, ubicacionUsuario]);

  // Renderizar o actualizar CÍRCULO de RADIO en Google Maps
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (ubicacionUsuario && radioKm && radioKm > 0) {
      const circle = new google.maps.Circle({
        strokeColor: '#059669', // Emerald 600
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: '#10b981', // Emerald 500
        fillOpacity: 0.16,
        map: mapInstanceRef.current,
        center: ubicacionUsuario,
        radius: radioKm * 1000,
      });

      circleRef.current = circle;

      // Ajustar vista del mapa para abarcar el radio si no hay una sede en foco
      if (!sedeSeleccionadaId) {
        const bounds = circle.getBounds();
        if (bounds) {
          mapInstanceRef.current.fitBounds(bounds, 25);
        }
      }
    }
  }, [mapLoaded, ubicacionUsuario, radioKm, sedeSeleccionadaId]);

  // Enfocar si se selecciona una sede específica
  useEffect(() => {
    if (!sedeSeleccionadaId) return;
    const sede = sedes.find(s => s.id === sedeSeleccionadaId);
    if (sede) {
      setSedeActivaEnMapa(sede);
      if (mapLoaded && mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: sede.ubicacion.lat, lng: sede.ubicacion.lng });
        mapInstanceRef.current.setZoom(16);
      }
    }
  }, [sedeSeleccionadaId, mapLoaded, sedes]);

  // Obtener geolocalización del usuario
  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      mostrarMensajeGps('Tu navegador no permite GPS. Selecciona una zona rápida.');
      return;
    }
    setGeolocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocalizando(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const radioDefecto = radioKm || 5;
        if (onUbicacionUsuarioChange) {
          onUbicacionUsuarioChange(coords, radioDefecto);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(coords);
          mapInstanceRef.current.setZoom(14);
        }
        mostrarMensajeGps(`📍 GPS detectado: Mostrando radio de ${radioDefecto} km a la redonda`);
      },
      (err) => {
        setGeolocalizando(false);
        console.warn('Geolocalización rechazada:', err);
        // Fallback a Miraflores/Surco
        const coords = { lat: -12.122150, lng: -77.036880 };
        const radioDefecto = radioKm || 5;
        if (onUbicacionUsuarioChange) onUbicacionUsuarioChange(coords, radioDefecto);
        mostrarMensajeGps(`📍 Ubicación fijada en Surco/Miraflores con radio de ${radioDefecto} km`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSeleccionarZona = (z: { nombre: string; lat: number; lng: number }) => {
    const coords = { lat: z.lat, lng: z.lng };
    const radioDefecto = radioKm || 5;
    if (onUbicacionUsuarioChange) {
      onUbicacionUsuarioChange(coords, radioDefecto);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(14);
    }
    mostrarMensajeGps(`📍 Ubicación fijada en ${z.nombre} con radio de ${radioDefecto} km`);
  };

  const handleCambiarRadio = (nuevoRadio: number) => {
    if (onRadioKmChange) {
      onRadioKmChange(nuevoRadio);
    }
    mostrarMensajeGps(nuevoRadio > 0 ? `Radio actualizado a ${nuevoRadio} km` : 'Mostrando complejos sin límite de distancia');
  };

  const mostrarMensajeGps = (msg: string) => {
    setMensajeGps(msg);
    setTimeout(() => setMensajeGps(null), 3500);
  };

  // Calcular complejos que caen dentro del radio
  const sedesEnRadio = sedes.filter((s) => {
    if (!ubicacionUsuario || !radioKm || radioKm === 0) return true;
    const dist = s.calcularDistanciaA(ubicacionUsuario.lat, ubicacionUsuario.lng);
    return dist <= radioKm;
  });

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 flex flex-col">
      
      {/* BARRA SUPERIOR: GPS + ZONAS RÁPIDAS + CONTROL DE RADIO */}
      <div className="bg-slate-900 text-white px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        
        {/* Botón GPS y Selector de Zona */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={detectarUbicacion}
            disabled={geolocalizando}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Activar mi GPS y calcular radio de cercanía"
          >
            <Navigation className={`w-3.5 h-3.5 ${geolocalizando ? 'animate-spin' : ''}`} />
            <span>{geolocalizando ? 'Buscando...' : 'Mi GPS'}</span>
          </button>

          {/* Selector de zona rápida */}
          <select
            onChange={(e) => {
              const zona = ZONAS_POPULARES.find(z => z.nombre === e.target.value);
              if (zona) handleSeleccionarZona(zona);
            }}
            defaultValue=""
            className="text-[11px] font-semibold bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            title="Elegir distrito para centrar radio"
          >
            <option value="" disabled>Distrito / Zona...</option>
            {ZONAS_POPULARES.map((z) => (
              <option key={z.nombre} value={z.nombre}>
                📍 {z.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Radio Cercano (3km, 5km, 10km, Todos) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <span className="text-slate-400 font-bold px-1 hidden sm:inline">Radio:</span>
          {[3, 5, 10, 0].map((r) => {
            const activo = (radioKm || 0) === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleCambiarRadio(r)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activo
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r === 0 ? 'Todos' : `${r} km`}
              </button>
            );
          })}
        </div>
      </div>

      {/* AVISO TEMPORAL DE GPS / RADIO */}
      {mensajeGps && (
        <div className="absolute top-12 left-3 right-3 sm:left-auto sm:right-3 z-30 bg-emerald-950/95 text-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg border border-emerald-700/80 backdrop-blur-md animate-fade-in flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{mensajeGps}</span>
        </div>
      )}

      {/* Contenedor del Mapa de Google Maps */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white z-10">
            <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Cargando Google Maps y radio de grass...</p>
          </div>
        )}

        {/* Fallback interactivo si Google Maps no carga en sandbox */}
        {mapError && (
          <div className="absolute inset-0 bg-slate-900 text-white p-4 z-10 flex flex-col justify-between overflow-y-auto">
            <div className="text-center py-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 mb-1">
                <Navigation className="w-3 h-3" /> Radar de Cercanía Activo
              </span>
              <h4 className="text-sm font-bold text-white">
                Complejos en Radio de {radioKm ? `${radioKm} km` : 'Toda Lima'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {ubicacionUsuario ? `Alrededor de tu ubicación (${ubicacionUsuario.lat.toFixed(3)}, ${ubicacionUsuario.lng.toFixed(3)})` : 'Mostrando complejos verificados'}
              </p>
            </div>

            {/* Lista interactiva de complejos con distancia y radio */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {sedes.map((s) => {
                const dist = ubicacionUsuario ? s.calcularDistanciaA(ubicacionUsuario.lat, ubicacionUsuario.lng) : 0;
                const enRadio = !radioKm || radioKm === 0 || dist <= radioKm;
                const seleccionada = s.id === (sedeSeleccionadaId || sedeActivaEnMapa?.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSedeActivaEnMapa(s);
                      onSeleccionarSede(s);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      seleccionada
                        ? 'bg-emerald-950/80 border-emerald-500 text-white'
                        : enRadio
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <span>⚽ {s.nombre}</span>
                        {enRadio && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                            En radio
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.ubicacion.distrito} • a {dist} km
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-400 font-mono">
                        S/. {s.obtenerPrecioMinimo()}/hr
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-800">
              Selecciona cualquier complejo para ver detalles o abrir ruta directa en Google Maps.
            </div>
          </div>
        )}

        {/* Indicador de radio activo en la esquina inferior izquierda del mapa */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:block">
          <div className="bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 backdrop-blur-sm shadow-md flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
            <span>Radio activo: <strong>{radioKm ? `${radioKm} km` : 'Sin límite'}</strong> ({sedesEnRadio.length} complejos dentro del área)</span>
          </div>
        </div>

        {/* Modal / Tarjeta Flotante Inferior de Sede Seleccionada en el Mapa */}
        {sedeActivaEnMapa && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-emerald-100 z-30 animate-fade-in transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Grass Sintético Verificado
                </span>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {sedeActivaEnMapa.nombre}
                </h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{sedeActivaEnMapa.ubicacion.distrito} - {sedeActivaEnMapa.ubicacion.direccion}</span>
                </p>
                {ubicacionUsuario && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    📏 A {sedeActivaEnMapa.calcularDistanciaA(ubicacionUsuario.lat, ubicacionUsuario.lng)} km de tu ubicación
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSedeActivaEnMapa(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Canchas Activas</span>
                <span className="font-bold text-slate-800 text-sm">
                  {sedeActivaEnMapa.obtenerCanchasActivas().length} disponibles
                </span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Desde</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  S/. {sedeActivaEnMapa.obtenerPrecioMinimo()} / hora
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
              {onAbrirChat && (
                <button
                  type="button"
                  onClick={() => onAbrirChat(sedeActivaEnMapa)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shadow-sm"
                  title="Consultar al dueño del grass en tiempo real"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onSeleccionarSede(sedeActivaEnMapa)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors text-center cursor-pointer"
              >
                Ver Canchas
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${sedeActivaEnMapa.ubicacion.lat},${sedeActivaEnMapa.ubicacion.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Cómo llegar con Google Maps oficial"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Ruta GPS</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
