export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'gif') {
    return { valid: false, error: 'Los archivos GIF no están permitidos.' };
  }

  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Formato no permitido. Solo se aceptan imágenes PNG, JPG, WEBP o SVG.' };
  }

  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return { valid: false, error: `El archivo supera el tamaño máximo de 5 MB (peso actual: ${sizeInMB} MB).` };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve({ valid: false, error: 'No se pudo leer el archivo.' });
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer);

      // GIF Magic bytes: 47 49 46 ("GIF")
      if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
        resolve({ valid: false, error: 'Los archivos GIF no están permitidos.' });
        return;
      }

      // PNG: 89 50 4E 47
      const isPng = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47;
      // JPEG: FF D8 FF
      const isJpeg = arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff;
      // WEBP: RIFF...WEBP
      const isWebp =
        arr[0] === 0x52 &&
        arr[1] === 0x49 &&
        arr[2] === 0x46 &&
        arr[3] === 0x46 &&
        arr.length >= 12 &&
        arr[8] === 0x57 &&
        arr[9] === 0x45 &&
        arr[10] === 0x42 &&
        arr[11] === 0x50;

      // SVG: Comprobar texto con etiqueta <svg o xml
      const textChunk = new TextDecoder().decode(arr).trim().toLowerCase();
      const isSvg = ext === 'svg' && (textChunk.includes('<svg') || textChunk.startsWith('<?xml'));

      if (isPng || isJpeg || isWebp || isSvg) {
        resolve({ valid: true });
      } else {
        resolve({
          valid: false,
          error: 'El archivo no es una imagen válida o está dañado. Solo se permiten PNG, JPG, WEBP o SVG.',
        });
      }
    };

    reader.onerror = () => {
      resolve({ valid: false, error: 'Error al leer el archivo seleccionado.' });
    };

    reader.readAsArrayBuffer(file.slice(0, 512));
  });
}