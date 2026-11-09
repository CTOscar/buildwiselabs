// Marcas de tractor. El logotipo NO viene incluido: coloca el archivo oficial
// (con permiso de uso, p. ej. el kit de tu distribuidor) en public/brands/<slug>.svg|png
// y márcalo en LOGOS. Mientras no exista, se muestra un monograma neutro.
export const BRANDS = [
  { slug: 'john-deere', name: 'John Deere', mono: 'JD' },
  { slug: 'massey-ferguson', name: 'Massey Ferguson', mono: 'MF' },
  { slug: 'new-holland', name: 'New Holland', mono: 'NH' },
  { slug: 'case-ih', name: 'Case IH', mono: 'CI' },
  { slug: 'kubota', name: 'Kubota', mono: 'KU' },
  { slug: 'mahindra', name: 'Mahindra', mono: 'MA' },
  { slug: 'valtra', name: 'Valtra', mono: 'VA' },
  { slug: 'otra', name: 'Otra', mono: '··' },
];

// slug -> archivo dentro de public/brands/ (wide: logotipo horizontal).
export const LOGOS = {
  // mark: versión para el círculo de la lista (cover = llena el círculo).
  'john-deere': { file: 'john-deere.png', mark: 'john-deere.png' },
  'new-holland': { file: 'new-holland.png', wide: true, mark: 'new-holland-mark.png', cover: true },
};

export const brandOf = (slug) => BRANDS.find((b) => b.slug === slug) || null;

// Insignia de marca: logotipo si está registrado, si no monograma.
export function brandBadge(slug, size = 'h-14 text-base') {
  const b = brandOf(slug);
  if (!b) return '';
  const base = import.meta.env?.BASE_URL || '/';
  const logo = LOGOS[b.slug];
  const file = logo?.file;
  const cls = `${size} ${logo?.wide ? 'w-24 sm:w-28' : 'w-14'}`;
  return `<span class="grid ${cls} shrink-0 place-items-center overflow-hidden rounded-2xl bg-white font-mono font-bold text-neutral-800 shadow-float ring-1 ring-black/5" title="${b.name}">
    ${file ? `<img src="${base}brands/${file}" alt="${b.name}" class="h-[80%] w-[86%] object-contain" />` : b.mono}</span>`;
}

// Avatar redondo para listas: logotipo de la marca o, si no hay, el número del tractor.
export function brandAvatar(slug, fallback, cls) {
  const logo = LOGOS[slug];
  if (!logo?.mark) return fallback ?? null;
  const base = import.meta.env?.BASE_URL || '/';
  return `<span class="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white ${cls || ''}">
    <img src="${base}brands/${logo.mark}" alt="${brandOf(slug)?.name || ''}" loading="lazy"
      class="${logo.cover ? 'h-full w-full object-cover' : 'h-[72%] w-[72%] object-contain'}" /></span>`;
}

// Contenido del pin del mapa: logotipo o tractor genérico (blanco y negro).
export function brandPin(slug, tractorSvg) {
  const logo = LOGOS[slug];
  const base = import.meta.env?.BASE_URL || '/';
  return logo?.mark
    ? `<span class="mk-logo"><img src="${base}brands/${logo.mark}" alt="" class="${logo.cover ? 'cover' : ''}" /></span>`
    : `<span class="mk-logo">${tractorSvg}</span>`;
}
