/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Utilidad para Carga y Optimización de Imágenes desde el Dispositivo
 */

export const procesarImagenDispositivo = (
  file: File,
  maxDimension = 1000,
  calidad = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionar para optimizar almacenamiento y velocidad en móvil
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Convertir a JPEG optimizado
        const imagenOptimizada = canvas.toDataURL('image/jpeg', calidad);
        resolve(imagenOptimizada);
      };

      img.onerror = () => {
        // En caso de fallo en canvas, devolver dataUrl original
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
