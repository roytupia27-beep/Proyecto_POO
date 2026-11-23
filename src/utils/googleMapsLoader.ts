/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Cargador y Utilidades de Google Maps & Geocodificación
 */

const rawMapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
export const DEFAULT_MAPS_API_KEY =
  rawMapsKey === 'TU_CLAVE_AQUI' ? '' : rawMapsKey;

// Coordenadas por defecto (Lima, Perú)
export const COORDENADAS_DEFAULT_PERU = {
  lat: -12.122150,
  lng: -77.036880,
  distrito: 'Santiago de Surco',
  ciudad: 'Lima'
};

export const DISTRITOS_POPULARES_PERU = [
  { nombre: 'Santiago de Surco', ciudad: 'Lima', lat: -12.138400, lng: -76.994400 },
  { nombre: 'Miraflores', ciudad: 'Lima', lat: -12.122150, lng: -77.036880 },
  { nombre: 'San Borja', ciudad: 'Lima', lat: -12.106500, lng: -77.001200 },
  { nombre: 'San Isidro', ciudad: 'Lima', lat: -12.091200, lng: -77.032400 },
  { nombre: 'Los Olivos', ciudad: 'Lima', lat: -11.986500, lng: -77.070800 },
  { nombre: 'San Miguel', ciudad: 'Lima', lat: -12.083100, lng: -77.086300 },
  { nombre: 'La Molina', ciudad: 'Lima', lat: -12.062500, lng: -76.945200 },
  { nombre: 'Chorrillos', ciudad: 'Lima', lat: -12.170400, lng: -77.025600 },
  { nombre: 'San Juan de Lurigancho', ciudad: 'Lima', lat: -11.996100, lng: -76.997200 },
  { nombre: 'Ate / Vitarte', ciudad: 'Lima', lat: -12.028900, lng: -76.918900 },
  { nombre: 'Callao / Bellavista', ciudad: 'Callao', lat: -12.056500, lng: -77.118100 },
  { nombre: 'Arequipa (Cayma / Cercado)', ciudad: 'Arequipa', lat: -16.398800, lng: -71.536900 },
  { nombre: 'Trujillo (El Golf / Centro)', ciudad: 'Trujillo', lat: -8.111800, lng: -79.028600 },
  { nombre: 'Cusco (Wanchaq / San Jerónimo)', ciudad: 'Cusco', lat: -13.522600, lng: -71.967300 },
  { nombre: 'Chiclayo (Pimentel / La Victoria)', ciudad: 'Chiclayo', lat: -6.771400, lng: -79.840900 },
];

let scriptPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (apiKey: string = DEFAULT_MAPS_API_KEY): Promise<void> => {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve();
  }

  const keyLimpia = (apiKey || '').trim();
  if (!keyLimpia || keyLimpia === 'TU_CLAVE_AQUI') {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      if ((window as any).google?.maps) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => {
      console.warn('No se pudo cargar el script de Google Maps:', e);
      resolve(); // Permitir fallback visual sin romper la app
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

/**
 * Geocodificación inversa: Convierte coordenadas (lat, lng) en dirección y distrito legibles
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{
  direccion: string;
  distrito: string;
  ciudad: string;
}> {
  // 1. Intentar con Google Maps Geocoder si está cargado
  try {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        let calle = '';
        let numero = '';
        let distrito = '';
        let ciudad = 'Lima';

        for (const comp of result.address_components) {
          if (comp.types.includes('route')) calle = comp.long_name;
          if (comp.types.includes('street_number')) numero = comp.long_name;
          if (comp.types.includes('sublocality') || comp.types.includes('locality') || comp.types.includes('administrative_area_level_3')) {
            distrito = comp.long_name;
          }
          if (comp.types.includes('administrative_area_level_2') || comp.types.includes('administrative_area_level_1')) {
            ciudad = comp.long_name;
          }
        }

        const direccion = calle ? (numero ? `${calle} ${numero}` : calle) : result.formatted_address.split(',')[0];
        return {
          direccion: direccion || 'Ubicación seleccionada en el mapa',
          distrito: distrito || 'Lima Metropolitana',
          ciudad: ciudad || 'Lima'
        };
      }
    }
  } catch (err) {
    console.warn('Error en Google Maps Geocoder, intentando fallback:', err);
  }

  // 2. Fallback con OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'es' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.suburb || '';
        const houseNumber = data.address.house_number || '';
        const suburb = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.town || '';
        const city = data.address.city || data.address.state || 'Lima';

        return {
          direccion: road ? (houseNumber ? `${road} ${houseNumber}` : road) : data.display_name.split(',')[0],
          distrito: suburb || 'Distrito Local',
          ciudad: city
        };
      }
    }
  } catch (err) {
    console.warn('Error en fallback Nominatim:', err);
  }

  // 3. Fallback genérico por proximidad conocida
  return {
    direccion: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    distrito: 'Distrito Deportivo',
    ciudad: 'Perú'
  };
}
