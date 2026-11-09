// Marca BuildWise Labs: isotipo (archivo) + logotipo en texto con IBM Plex Sans (font-brand),
// igual que en buildwiselabs.net ("BuildWise" en negritas + "Labs" ligero).
const MARK = '/brand/buildwise-mark.webp';

export function logoMark(cls = 'h-10 w-10') {
  return `<img src="${MARK}" alt="" class="${cls} select-none object-contain" draggable="false" />`;
}

export function wordmark(cls = 'text-lg') {
  return `<span class="${cls} whitespace-nowrap font-brand leading-none tracking-tight"><b class="font-bold">BuildWise</b> <span class="font-light">Labs</span></span>`;
}

// Logotipo completo (isotipo + texto)
export function logo({ mark = 'h-9 w-9', text = 'text-lg', gap = 'gap-2.5' } = {}) {
  return `<span class="inline-flex items-center ${gap}" role="img" aria-label="BuildWise Labs">${logoMark(mark)}${wordmark(text)}</span>`;
}
