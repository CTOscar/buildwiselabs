// Fotos de perfil: caché por usuario (blob:), pintado en elementos [data-photo-user] y reducción de imagen.
const cache = new Map();
let defaultClient = null;

export const setPhotoClient = (client) => {
  defaultClient = client;
};

const supports = (client) => typeof client?.setPhoto === 'function';

export function photoFor(client, userId) {
  if (!supports(client) || userId == null) return Promise.resolve(null);
  if (!cache.has(userId)) cache.set(userId, Promise.resolve(client.getPhoto(userId)).catch(() => null));
  return cache.get(userId);
}

// Olvida la foto guardada (tras subir o quitar una) y libera su URL.
export async function forgetPhoto(userId) {
  const url = await cache.get(userId);
  cache.delete(userId);
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

// Pone la foto dentro de cada [data-photo-user="<id>"]; si no hay foto, deja las iniciales.
export function applyPhotos(client, scope = document) {
  const c = client || defaultClient;
  scope.querySelectorAll('[data-photo-user]').forEach((el) => {
    const id = Number(el.dataset.photoUser);
    photoFor(c, id).then((url) => {
      if (!el.isConnected || Number(el.dataset.photoUser) !== id) return;
      const img = el.querySelector('img[data-photo]');
      if (!url) return void img?.remove();
      if (img) return void (img.src = url);
      const n = document.createElement('img');
      n.dataset.photo = '';
      n.alt = '';
      n.src = url;
      n.className = 'absolute inset-0 h-full w-full object-cover';
      el.classList.add('relative', 'overflow-hidden');
      el.append(n);
    });
  });
}

const MAX_BYTES = 12 * 1024 * 1024;

// Recorta al centro y reduce a size×size (JPEG) para subirla a la API (máx. 400 KB).
export async function resizeImage(file, size = 256) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (file.size > MAX_BYTES) throw new Error('La imagen pesa más de 12 MB. Elige una más pequeña.');
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer esa imagen. Prueba con otra en JPG o PNG.');
  }
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.86);
}
