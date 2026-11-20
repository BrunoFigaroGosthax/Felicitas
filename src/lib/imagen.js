// Conversión de imágenes en el navegador antes de subirlas: se achican y pasan a WebP (pesan mucho menos).

/**
 * Achica la imagen para que su lado mayor no pase de `maxLado` y la convierte a WebP.
 * Si el navegador no sabe generar WebP (Safari viejo), la devuelve en JPEG.
 */
export async function aWebp(archivo, maxLado, calidad = 0.82) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    throw new Error('No pudimos leer la imagen. Probá con una JPG o PNG (las fotos HEIC del iPhone, compartilas o exportalas como JPG).');
  }
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const generar = (tipo) => new Promise((listo) => canvas.toBlob(listo, tipo, calidad));
  const webp = await generar('image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpg = await generar('image/jpeg');
  if (!jpg) throw new Error('No pudimos procesar la imagen. Probá con otra.');
  return jpg;
}

export const extension = (blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg');

export const pesoTexto = (bytes) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
