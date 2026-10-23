"""
Portadas estilo collage editorial para Bank Central y Cripto World.

Todo se dibuja aqui -- no hay fotos de terceros ni logotipos de nadie:
  * papel con grano y arrugas suaves,
  * una mancha de color plano (el unico color fuerte de la pieza),
  * el sujeto en escala de grises convertido a TRAMA DE PUNTOS real (el tamano de cada
    punto sale de lo oscuro que es esa zona, en una reticula girada 45 grados, como en
    la imprenta), recortado con borde blanco tipo calcomania y sombra,
  * etiquetas grises con ">>>", fragmentos de codigo en monoespaciada y circulos de
    icono, que son los detalles que se repiten en las referencias.

Se trabaja al doble de tamano y se reduce al final para que los bordes salgan suaves.
"""
import math
import random
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

S = 2
W, H = 1440 * S, 600 * S

INTER_B = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
INTER_SB = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
SIMBOLOS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def fuente(ruta, px):
    return ImageFont.truetype(ruta, px)


# ── Papel ────────────────────────────────────────────────────────────────────
def papel(base=(236, 234, 230), seed=1):
    rng = np.random.default_rng(seed)
    img = np.ones((H, W, 3), np.float32) * np.array(base, np.float32)
    # arrugas: ruido de baja frecuencia agrandado
    for escala, fuerza in ((70, 2.4), (220, 3.2)):
        r = rng.normal(0, 1, (H // escala + 2, W // escala + 2)).astype(np.float32)
        r = np.array(Image.fromarray(r).resize((W, H), Image.BICUBIC))
        img += r[..., None] * fuerza
    # grano fino
    img += rng.normal(0, 1.9, (H, W, 1)).astype(np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def rasgado(x0, y0, x1, y1, seed, amp=7 * S, paso=9 * S):
    """Poligono de un papel rasgado: el borde de un rectangulo con mordidas al azar."""
    rnd = random.Random(seed)
    pts = []

    def lado(ax, ay, bx, by):
        n = max(2, int(math.hypot(bx - ax, by - ay) / paso))
        for i in range(n):
            t = i / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            nx, ny = -(by - ay), (bx - ax)
            m = math.hypot(nx, ny) or 1
            d = rnd.uniform(-amp, amp) * (1.6 if rnd.random() < 0.12 else 1)
            pts.append((x + nx / m * d, y + ny / m * d))

    lado(x0, y0, x1, y0); lado(x1, y0, x1, y1); lado(x1, y1, x0, y1); lado(x0, y1, x0, y0)
    return pts


def capa():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def pegar_papel_rasgado(fondo, caja, relleno, seed, borde_blanco=True, giro=0):
    """Un trozo de papel rasgado: el borde blanco es el alma del papel que se ve al romperlo."""
    x0, y0, x1, y1 = caja
    pieza = capa()
    d = ImageDraw.Draw(pieza)
    if borde_blanco:
        d.polygon(rasgado(x0 - 6 * S, y0 - 6 * S, x1 + 6 * S, y1 + 6 * S, seed + 7, amp=8 * S), fill=(250, 249, 246, 255))
    mascara = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mascara).polygon(rasgado(x0, y0, x1, y1, seed), fill=255)
    if isinstance(relleno, Image.Image):
        pieza.paste(relleno, (0, 0), mascara)
    else:
        pieza.paste(Image.new('RGBA', (W, H), relleno), (0, 0), mascara)
    if giro:
        pieza = pieza.rotate(giro, resample=Image.BICUBIC, center=((x0 + x1) / 2, (y0 + y1) / 2))
    sombra(fondo, pieza, 10 * S, (4 * S, 6 * S), 70)
    fondo.alpha_composite(pieza)
    return pieza


def cuadricula(color_base, color_linea, color_fuerte, paso=13 * S, cada=5):
    img = Image.new('RGBA', (W, H), color_base)
    d = ImageDraw.Draw(img)
    for i, x in enumerate(range(0, W, paso)):
        d.line([(x, 0), (x, H)], fill=color_fuerte if i % cada == 0 else color_linea, width=2 if i % cada == 0 else 1)
    for i, y in enumerate(range(0, H, paso)):
        d.line([(0, y), (W, y)], fill=color_fuerte if i % cada == 0 else color_linea, width=2 if i % cada == 0 else 1)
    return img


# ── Trama de puntos ──────────────────────────────────────────────────────────
def trama(gris, alfa, celda=18 * S // 2, angulo=45, tinta=(28, 28, 28), papel_c=(244, 243, 240)):
    """
    Convierte una imagen en grises a trama de puntos de verdad: la reticula se gira 45
    grados, en cada celda se mide lo oscuro que es la imagen y se dibuja un punto cuya
    AREA es proporcional a esa oscuridad. Devuelve RGBA recortado con `alfa`.
    """
    g = gris.rotate(angulo, resample=Image.BICUBIC, expand=True, fillcolor=255)
    gw, gh = g.size
    cw, ch = math.ceil(gw / celda), math.ceil(gh / celda)
    medio = np.array(g.resize((cw, ch), Image.BOX), np.float32) / 255.0
    lienzo = Image.new('L', (gw, gh), 0)
    d = ImageDraw.Draw(lienzo)
    # Con rmax = celda/sqrt(pi) el AREA del punto es exactamente la oscuridad de la celda;
    # un poco mas para que en el negro puro los puntos se toquen y se fundan.
    rmax = celda * 0.60
    for j in range(ch):
        for i in range(cw):
            osc = 1.0 - medio[j, i]
            if osc < 0.035:
                continue
            r = rmax * math.sqrt(osc)
            cx, cy = (i + 0.5) * celda, (j + 0.5) * celda
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    lienzo = lienzo.rotate(-angulo, resample=Image.BICUBIC, expand=False)
    ox, oy = (lienzo.size[0] - W) // 2, (lienzo.size[1] - H) // 2
    puntos = lienzo.crop((ox, oy, ox + W, oy + H))
    out = Image.new('RGBA', (W, H), papel_c + (0,))
    base = Image.new('RGBA', (W, H), papel_c + (255,))
    tinta_img = Image.new('RGBA', (W, H), tinta + (255,))
    base.paste(tinta_img, (0, 0), puntos)
    out.paste(base, (0, 0), alfa)
    return out


def calcomania(fondo, figura, grosor=9 * S):
    """Recorte con borde blanco y sombra suave, como pegado encima del papel."""
    a = figura.split()[-1]
    borde = a.filter(ImageFilter.MaxFilter(grosor * 2 + 1 if (grosor * 2 + 1) % 2 else grosor * 2 + 1))
    blanco = Image.new('RGBA', (W, H), (252, 252, 250, 0))
    blanco.putalpha(borde)
    sombra(fondo, blanco, 14 * S, (6 * S, 9 * S), 85)
    fondo.alpha_composite(blanco)
    fondo.alpha_composite(figura)


def sombra(fondo, pieza, radio, desplaz, opacidad):
    a = pieza.split()[-1].point(lambda v: v * opacidad // 255)
    s = Image.new('RGBA', (W, H), (20, 18, 16, 0))
    s.putalpha(a)
    s = s.filter(ImageFilter.GaussianBlur(radio))
    # Se desplaza pegando en una capa nueva y no con ImageChops.offset, que ENVUELVE: lo
    # que sale por abajo (el cable, por ejemplo) reaparecia como mancha en el borde de arriba.
    movida = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    movida.paste(s, desplaz)
    fondo.alpha_composite(movida)


# ── Piezas de interfaz ───────────────────────────────────────────────────────
def etiqueta(fondo, x, y, w, texto, barra=None):
    """Etiqueta gris redondeada con texto y '>>>' (o con una barra de color dentro)."""
    h = 64 * S // 2 * 2 // 2
    c = capa(); d = ImageDraw.Draw(c)
    d.rounded_rectangle([x, y, x + w, y + h], radius=12 * S, fill=(196, 196, 194, 235))
    if barra:
        d.rounded_rectangle([x + 12 * S, y + 12 * S, x + w - 12 * S, y + h - 12 * S], radius=4 * S, fill=barra)
    else:
        d.text((x + 18 * S, y + h / 2), texto, font=fuente(INTER_SB, 17 * S), fill=(40, 40, 40), anchor='lm')
        d.text((x + w - 18 * S, y + h / 2), '>>>', font=fuente(INTER_SB, 14 * S), fill=(70, 70, 70), anchor='rm')
    sombra(fondo, c, 6 * S, (2 * S, 3 * S), 40)
    fondo.alpha_composite(c)


def codigo(fondo, x, y, lineas, px=13):
    d = ImageDraw.Draw(fondo)
    f = fuente(MONO, px * S)
    for i, l in enumerate(lineas):
        d.text((x, y + i * px * S * 1.35), l, font=f, fill=(92, 92, 90, 255))


def circulo_icono(fondo, cx, cy, r, color, glifo, tam=None, color_glifo=(18, 40, 70)):
    c = capa(); d = ImageDraw.Draw(c)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    d.text((cx, cy + 1 * S), glifo, font=fuente(SIMBOLOS, tam or int(r * 1.0)), fill=color_glifo, anchor='mm')
    sombra(fondo, c, 5 * S, (2 * S, 3 * S), 45)
    fondo.alpha_composite(c)


def gradiente_h(w, h, perfil):
    """Gradiente horizontal en grises a partir de puntos (t, valor)."""
    xs = np.linspace(0, 1, w)
    ts, vs = zip(*perfil)
    fila = np.interp(xs, ts, vs).astype(np.uint8)
    return Image.fromarray(np.tile(fila, (h, 1)), 'L')


def gradiente_v(w, h, a, b):
    col = np.linspace(a, b, h).astype(np.uint8)
    return Image.fromarray(np.tile(col[:, None], (1, w)), 'L')


def letra_cripto(d, cx, cy, tam, relleno, sombra_c=None):
    """El signo de la moneda: una B con dos trazos arriba y abajo, dibujada a mano para
    no depender de que la fuente traiga el caracter."""
    f = fuente(INTER_B, tam)
    if sombra_c is not None:
        dibujar_b(d, cx + tam * 0.035, cy + tam * 0.045, tam, f, sombra_c)
    dibujar_b(d, cx, cy, tam, f, relleno)


def dibujar_b(d, cx, cy, tam, f, color):
    d.text((cx, cy), 'B', font=f, fill=color, anchor='mm')
    bb = d.textbbox((cx, cy), 'B', font=f, anchor='mm')
    sw = tam * 0.085
    for fx in (0.36, 0.58):
        x = bb[0] + (bb[2] - bb[0]) * fx
        d.rectangle([x - sw / 2, bb[1] - tam * 0.13, x + sw / 2, bb[1] + 2], fill=color)
        d.rectangle([x - sw / 2, bb[3] - 2, x + sw / 2, bb[3] + tam * 0.13], fill=color)


def moneda(gris_d, alfa_d, cx, cy, r, glifo):
    """Moneda en grises: canto medio, cara clara con luz arriba a la izquierda y el signo
    grabado en oscuro con un filo de luz (en trama se lee lo oscuro sobre lo claro)."""
    alfa_d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    gris_d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=135)
    ri = r * 0.88
    for k in range(48, 0, -1):
        t = k / 48
        rr = ri * t
        ox, oy = -ri * 0.22 * (1 - t), -ri * 0.26 * (1 - t)
        gris_d.ellipse([cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr], fill=int(196 + 56 * (1 - t)))
    gris_d.ellipse([cx - ri * 0.9, cy - ri * 0.9, cx + ri * 0.9, cy + ri * 0.9], outline=120, width=max(2, int(r * 0.04)))
    if glifo == 'B':
        letra_cripto(gris_d, cx - r * 0.025, cy - r * 0.03, int(r * 1.0), 255)
        letra_cripto(gris_d, cx, cy, int(r * 1.0), 40)
    else:
        fnt = fuente(INTER_B, int(r * 1.05))
        gris_d.text((cx - r * 0.025, cy - r * 0.03), glifo, font=fnt, fill=255, anchor='mm')
        gris_d.text((cx, cy), glifo, font=fnt, fill=40, anchor='mm')


def guardar(img, ruta):
    out = img.convert('RGB').resize((W // S, H // S), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
    out.save(ruta, quality=90, optimize=True, progressive=True)
    print('guardado', ruta, out.size)


# ═════════════════════════════════════════════════════════════════════════════
# BANK CENTRAL
# Todo lo importante va dentro de la franja central (x 260..1180): la tarjeta recorta los
# lados segun el ancho de pantalla, y lo que quede fuera de ahi puede perderse.
# ═════════════════════════════════════════════════════════════════════════════
def bank_central(ruta):
    f = papel(seed=3).convert('RGBA')
    cx = 720 * S

    # hoja contable azul rasgada
    hoja = cuadricula((200, 217, 233, 255), (176, 199, 220, 255), (140, 171, 201, 255))
    pegar_papel_rasgado(f, (415 * S, 70 * S, 1025 * S, 545 * S), hoja, seed=11)

    # el sol dorado: el unico color fuerte de la pieza
    c = capa(); ImageDraw.Draw(c).ellipse([330 * S, 95 * S, 550 * S, 315 * S], fill=(242, 184, 75, 255))
    f.alpha_composite(c)

    codigo(f, 110 * S, 120 * S, ['GET /SieAPIRest/service/v1/', '    series/SF43718/datos/oportuno'])
    codigo(f, 1040 * S, 470 * S, ['{ "serie": "SF43718",', '  "fecha": "dd/mm/aaaa",', '  "dato": "..." }'])

    # ── el edificio, en grises ──
    gris = Image.new('L', (W, H), 255)
    alfa = Image.new('L', (W, H), 0)
    gd, ad = ImageDraw.Draw(gris), ImageDraw.Draw(alfa)
    x0, x1, y0, y1 = cx - 205 * S, cx + 205 * S, 228 * S, 432 * S
    gris.paste(gradiente_v(x1 - x0, y1 - y0, 38, 90), (x0, y0)); ad.rectangle([x0, y0, x1, y1], fill=255)
    ncol, cw, gap = 6, 40 * S, 33 * S
    total = ncol * cw + (ncol - 1) * gap
    perfil = [(0, 95), (0.15, 205), (0.35, 252), (0.6, 240), (0.85, 176), (1, 92)]
    for k in range(ncol):
        x = cx - total // 2 + k * (cw + gap)
        gris.paste(gradiente_h(cw, 184 * S, perfil), (x, 240 * S)); ad.rectangle([x, 240 * S, x + cw, 424 * S], fill=255)
        gd.rectangle([x - 8 * S, 228 * S, x + cw + 8 * S, 241 * S], fill=205); ad.rectangle([x - 8 * S, 228 * S, x + cw + 8 * S, 241 * S], fill=255)
        gd.line([(x - 8 * S, 241 * S), (x + cw + 8 * S, 241 * S)], fill=110, width=2 * S)
        gd.rectangle([x - 6 * S, 421 * S, x + cw + 6 * S, 433 * S], fill=190); ad.rectangle([x - 6 * S, 421 * S, x + cw + 6 * S, 433 * S], fill=255)
    gd.rectangle([cx - 222 * S, 190 * S, cx + 222 * S, 228 * S], fill=214); ad.rectangle([cx - 222 * S, 190 * S, cx + 222 * S, 228 * S], fill=255)
    gd.rectangle([cx - 222 * S, 190 * S, cx + 222 * S, 196 * S], fill=130)
    gd.line([(cx - 222 * S, 228 * S), (cx + 222 * S, 228 * S)], fill=90, width=3 * S)
    for x in range(cx - 214 * S, cx + 214 * S, 15 * S):
        gd.rectangle([x, 212 * S, x + 8 * S, 222 * S], fill=105)
    tri = [(cx, 98 * S), (cx - 238 * S, 190 * S), (cx + 238 * S, 190 * S)]
    gd.polygon(tri, fill=228); ad.polygon(tri, fill=255)
    gd.polygon([(cx, 120 * S), (cx - 192 * S, 182 * S), (cx + 192 * S, 182 * S)], fill=172)
    gd.line([(cx - 238 * S, 190 * S), (cx, 98 * S), (cx + 238 * S, 190 * S)], fill=95, width=4 * S)
    for i, (m, y) in enumerate(((228, 433), (246, 452), (264, 471))):
        gd.rectangle([cx - m * S, y * S, cx + m * S, (y + 19) * S], fill=232 - i * 10)
        gd.line([(cx - m * S, (y + 19) * S), (cx + m * S, (y + 19) * S)], fill=95, width=3 * S)
        ad.rectangle([cx - m * S, y * S, cx + m * S, (y + 19) * S], fill=255)
    calcomania(f, trama(gris, alfa, celda=12))

    # tira con la grafica del tipo de cambio
    tira = Image.new('RGBA', (W, H), (250, 249, 245, 255))
    td = ImageDraw.Draw(tira)
    gx0, gy0, gx1, gy1 = 985 * S, 205 * S, 1225 * S, 330 * S
    td.text((gx0 + 10 * S, gy0 + 12 * S), 'USD / MXN', font=fuente(MONO, 12 * S), fill=(70, 70, 70))
    for k in range(4):
        y = gy0 + 42 * S + k * 20 * S
        td.line([(gx0 + 8 * S, y), (gx1 - 10 * S, y)], fill=(215, 215, 212), width=1 * S)
    rnd = random.Random(5); v = 0.55; pts = []
    for i in range(21):
        v = min(0.92, max(0.12, v + rnd.uniform(-0.11, 0.09)))
        pts.append((gx0 + 14 * S + i * 10.5 * S, gy0 + 42 * S + (1 - v) * 70 * S))
    escalon = []
    for a, b in zip(pts, pts[1:]):
        escalon += [a, (b[0], a[1])]
    escalon.append(pts[-1])
    td.line(escalon, fill=(35, 35, 35), width=3 * S, joint='curve')
    td.ellipse([pts[-1][0] - 7 * S, pts[-1][1] - 7 * S, pts[-1][0] + 7 * S, pts[-1][1] + 7 * S], fill=(242, 184, 75))
    pegar_papel_rasgado(f, (gx0, gy0, gx1, gy1), tira, seed=21, borde_blanco=False, giro=-3)

    gris2 = Image.new('L', (W, H), 255); alfa2 = Image.new('L', (W, H), 0)
    moneda(ImageDraw.Draw(gris2), ImageDraw.Draw(alfa2), 965 * S, 470 * S, 58 * S, '$')
    calcomania(f, trama(gris2, alfa2, celda=10))

    etiqueta(f, 250 * S, 360 * S, 230 * S, 'Tipo de cambio')
    etiqueta(f, 280 * S, 430 * S, 165 * S, 'Inflación')
    etiqueta(f, 1040 * S, 380 * S, 160 * S, '', barra=(242, 184, 75, 255))
    circulo_icono(f, 492 * S, 480 * S, 26 * S, (47, 111, 176), '%', color_glifo=(240, 244, 250))
    circulo_icono(f, 950 * S, 150 * S, 24 * S, (47, 111, 176), '$', color_glifo=(240, 244, 250))
    guardar(f, ruta)


# ═════════════════════════════════════════════════════════════════════════════
# CRIPTO WORLD
# ═════════════════════════════════════════════════════════════════════════════
def pila(gd, ad, px, base_y, n=5, rx=78 * S, ry=24 * S, alto=18 * S, paso=21 * S, seed=4):
    """Pila de monedas de abajo hacia arriba: cada una es su canto claro con una linea
    oscura en la curva de abajo, y la de encima tapa la parte alta de la anterior, como
    en una pila real. Los cantos van claros: en trama, lo oscuro se come la forma."""
    rnd = random.Random(seed)
    perfil = [(0, 128), (0.22, 214), (0.48, 246), (0.78, 204), (1, 126)]
    for k in range(n):
        y = base_y - k * paso
        ox = rnd.randint(-6, 6) * S
        gd.ellipse([px + ox - rx, y - ry, px + ox + rx, y + ry], fill=196)
        ad.ellipse([px + ox - rx, y - ry, px + ox + rx, y + ry], fill=255)
        gd._image.paste(gradiente_h(2 * rx, alto, perfil), (px + ox - rx, y - alto))
        ad.rectangle([px + ox - rx, y - alto, px + ox + rx, y], fill=255)
        gd.arc([px + ox - rx, y - ry, px + ox + rx, y + ry], 0, 180, fill=60, width=3 * S)
    y = base_y - (n - 1) * paso - alto
    gd.ellipse([px - rx, y - ry, px + rx, y + ry], fill=238, outline=90, width=3 * S)
    ad.ellipse([px - rx, y - ry, px + rx, y + ry], fill=255)
    gd.ellipse([px - rx * 0.74, y - ry * 0.74, px + rx * 0.74, y + ry * 0.74], outline=140, width=2 * S)


def cripto_world(ruta):
    f = papel(base=(234, 233, 230), seed=8).convert('RGBA')
    cx, cy = 720 * S, 300 * S

    # anillos naranjas detras de la moneda: el color fuerte de esta pieza
    c = capa(); d = ImageDraw.Draw(c)
    for r, col in ((262, (247, 192, 154)), (222, (242, 148, 90)), (182, (234, 104, 44))):
        d.ellipse([cx - r * S, cy - r * S, cx + r * S, cy + r * S], fill=col + (255,))
    f.alpha_composite(c)

    codigo(f, 110 * S, 95 * S, ['GET /api/v3/simple/price', '    ?ids=bitcoin&vs_currencies=mxn'])
    codigo(f, 1045 * S, 405 * S, ['{ "bitcoin": {', '    "mxn": ... } }'])

    # tira con velas del mercado
    tira = Image.new('RGBA', (W, H), (250, 249, 245, 255))
    td = ImageDraw.Draw(tira)
    vx0, vy0, vx1, vy1 = 955 * S, 140 * S, 1215 * S, 290 * S
    td.text((vx0 + 10 * S, vy0 + 12 * S), 'BTC / MXN', font=fuente(MONO, 12 * S), fill=(70, 70, 70))
    rnd = random.Random(9); nivel = 0.45
    for i in range(13):
        x = vx0 + 22 * S + i * 18 * S
        abre = nivel; cierra = min(0.9, max(0.1, abre + rnd.uniform(-0.15, 0.19)))
        alto, bajo = max(abre, cierra) + rnd.uniform(0.02, 0.08), min(abre, cierra) - rnd.uniform(0.02, 0.08)
        y = lambda v: vy0 + 42 * S + (1 - v) * 92 * S
        col = (234, 104, 44) if cierra >= abre else (40, 40, 40)
        td.line([(x, y(alto)), (x, y(bajo))], fill=col, width=2 * S)
        td.rectangle([x - 5 * S, y(max(abre, cierra)), x + 5 * S, y(min(abre, cierra)) + 2 * S], fill=col)
        nivel = cierra
    pegar_papel_rasgado(f, (vx0, vy0, vx1, vy1), tira, seed=31, borde_blanco=False, giro=3)

    # la pila va con trama mas fina que la moneda grande: cada moneda mide pocos pixeles
    # de canto y con puntos gruesos las separaciones se pierden y parece un barril
    gris = Image.new('L', (W, H), 255); alfa = Image.new('L', (W, H), 0)
    pila(ImageDraw.Draw(gris), ImageDraw.Draw(alfa), 430 * S, 480 * S)
    calcomania(f, trama(gris, alfa, celda=7))

    gris = Image.new('L', (W, H), 255); alfa = Image.new('L', (W, H), 0)
    moneda(ImageDraw.Draw(gris), ImageDraw.Draw(alfa), cx, cy, 150 * S, 'B')
    calcomania(f, trama(gris, alfa, celda=13))

    gris2 = Image.new('L', (W, H), 255); alfa2 = Image.new('L', (W, H), 0)
    moneda(ImageDraw.Draw(gris2), ImageDraw.Draw(alfa2), 965 * S, 400 * S, 66 * S, '$')
    calcomania(f, trama(gris2, alfa2, celda=10))

    etiqueta(f, 240 * S, 150 * S, 200 * S, 'Cartera')
    etiqueta(f, 1045 * S, 330 * S, 160 * S, '', barra=(234, 104, 44, 255))
    circulo_icono(f, 885 * S, 330 * S, 28 * S, (30, 111, 208), '⇄', tam=32 * S, color_glifo=(240, 244, 250))
    circulo_icono(f, 560 * S, 118 * S, 24 * S, (30, 111, 208), '#', color_glifo=(240, 244, 250))
    guardar(f, ruta)


# ═════════════════════════════════════════════════════════════════════════════
# MONITOREO WEB
# Un monitor de los de antes en trama de puntos con la pantalla en color plano -- como la
# tele de la referencia, que tiene la pantalla amarilla lisa -- y en ella el pulso del
# servicio. El color fuerte es el verde de "en linea".
# ═════════════════════════════════════════════════════════════════════════════
VERDE = (76, 195, 138)


def rect_degradado(gris, alfa, caja, radio, a, b):
    x0, y0, x1, y1 = [int(v) for v in caja]
    m = Image.new('L', (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=radio, fill=255)
    gris.paste(gradiente_v(x1 - x0, y1 - y0, a, b), (x0, y0), m)
    alfa.paste(255, (x0, y0), m)


def bezier(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def monitoreo_web(ruta):
    f = papel(base=(235, 234, 231), seed=15).convert('RGBA')
    cx = 720 * S

    # circulos de linea fina detras, como en la referencia del apreton de manos
    c = capa(); d = ImageDraw.Draw(c)
    for r in (235, 305, 375):
        d.ellipse([cx - r * S, 290 * S - r * S, cx + r * S, 290 * S + r * S], outline=(150, 150, 148, 255), width=2 * S)
    d.ellipse([cx - 375 * S - 8 * S, 290 * S - 8 * S, cx - 375 * S + 8 * S, 290 * S + 8 * S], fill=VERDE + (255,))
    f.alpha_composite(c)

    # el sol verde, asomando detras del monitor
    c = capa(); ImageDraw.Draw(c).ellipse([905 * S, 45 * S, 1110 * S, 250 * S], fill=VERDE + (255,))
    f.alpha_composite(c)

    codigo(f, 110 * S, 110 * S, ['GET /health', '  -> 200 OK  (142 ms)'])
    codigo(f, 1000 * S, 505 * S, ['{ "status": "up",', '  "checks": "cada 60 s" }'])

    # cable: sale de la base y se va por la izquierda
    cable = bezier((612 * S, 470 * S), (520 * S, 540 * S), (430 * S, 470 * S), (300 * S, 610 * S))
    c = capa(); d = ImageDraw.Draw(c)
    d.line(cable, fill=(252, 252, 250, 255), width=22 * S, joint='curve')
    d.line(cable, fill=(30, 30, 30, 255), width=9 * S, joint='curve')
    sombra(f, c, 8 * S, (3 * S, 5 * S), 60)
    f.alpha_composite(c)

    # ── el monitor, en grises ──
    gris = Image.new('L', (W, H), 255); alfa = Image.new('L', (W, H), 0)
    gd, ad = ImageDraw.Draw(gris), ImageDraw.Draw(alfa)
    # costado (profundidad)
    lado = [(cx + 196 * S, 104 * S), (cx + 232 * S, 128 * S), (cx + 232 * S, 404 * S), (cx + 196 * S, 424 * S)]
    gd.polygon(lado, fill=128); ad.polygon(lado, fill=255)
    for y in range(150, 390, 16):
        gd.line([(cx + 204 * S, y * S), (cx + 226 * S, (y + 4) * S)], fill=90, width=2 * S)
    # frente
    rect_degradado(gris, alfa, (cx - 200 * S, 90 * S, cx + 200 * S, 425 * S), 34 * S, 236, 192)
    gd.rounded_rectangle([cx - 200 * S, 90 * S, cx + 200 * S, 425 * S], radius=34 * S, outline=105, width=3 * S)
    # marco de la pantalla
    gd.rounded_rectangle([cx - 172 * S, 116 * S, cx + 122 * S, 364 * S], radius=28 * S, fill=140)
    gd.rounded_rectangle([cx - 166 * S, 122 * S, cx + 116 * S, 358 * S], radius=24 * S, fill=70)
    # panel de control: dos perillas y la rejilla
    for y in (172, 238):
        gd.ellipse([cx + 138 * S, (y - 20) * S, cx + 178 * S, (y + 20) * S], fill=110)
        gd.ellipse([cx + 145 * S, (y - 14) * S, cx + 165 * S, (y + 2) * S], fill=225)
    for y in range(292, 396, 14):
        gd.rounded_rectangle([cx + 136 * S, y * S, cx + 182 * S, (y + 6) * S], radius=3 * S, fill=110)
    # cuello y base
    cuello = [(cx - 42 * S, 425 * S), (cx + 42 * S, 425 * S), (cx + 60 * S, 456 * S), (cx - 60 * S, 456 * S)]
    gd.polygon(cuello, fill=165); ad.polygon(cuello, fill=255)
    rect_degradado(gris, alfa, (cx - 125 * S, 452 * S, cx + 125 * S, 480 * S), 10 * S, 222, 176)
    gd.line([(cx - 118 * S, 479 * S), (cx + 118 * S, 479 * S)], fill=95, width=3 * S)
    calcomania(f, trama(gris, alfa, celda=12))

    # ── la pantalla, en color plano y nitida (no va en trama) ──
    pant = capa(); pd = ImageDraw.Draw(pant)
    sx0, sy0, sx1, sy1 = cx - 160 * S, 128 * S, cx + 110 * S, 352 * S
    pd.rounded_rectangle([sx0, sy0, sx1, sy1], radius=20 * S, fill=VERDE + (255,))
    for y in range(sy0 + 4 * S, sy1, 7 * S):  # lineas de barrido del tubo
        pd.line([(sx0 + 6 * S, y), (sx1 - 6 * S, y)], fill=(58, 168, 116, 55), width=1 * S)
    oscuro = (16, 52, 36, 255)
    pd.text((sx0 + 20 * S, sy0 + 20 * S), '200 OK', font=fuente(MONO, 17 * S), fill=oscuro)
    pd.text((sx1 - 20 * S, sy0 + 20 * S), '142 ms', font=fuente(MONO, 15 * S), fill=oscuro, anchor='ra')
    base_y = sy0 + 128 * S
    xs = lambda t: sx0 + 16 * S + t * (sx1 - sx0 - 32 * S)
    pulso = [(0, 0), (0.22, 0), (0.27, -10), (0.31, 0), (0.36, 0), (0.40, 20), (0.45, -72), (0.50, 34), (0.54, 0),
             (0.62, 0), (0.66, -14), (0.71, 0), (1, 0)]
    pd.line([(xs(t), base_y + v * S) for t, v in pulso], fill=oscuro, width=5 * S, joint='curve')
    pd.ellipse([xs(1) - 8 * S, base_y - 8 * S, xs(1) + 8 * S, base_y + 8 * S], fill=(250, 252, 250, 255))
    # linea base de los ultimos dias, todos en verde salvo una barra de incidente
    for i in range(18):
        bx = sx0 + 20 * S + i * 13 * S
        pd.rounded_rectangle([bx, sy1 - 40 * S, bx + 8 * S, sy1 - 22 * S], radius=2 * S,
                             fill=(234, 104, 44, 255) if i == 11 else (20, 70, 48, 200))
    f.alpha_composite(pant)

    # tira con los tiempos de respuesta
    tira = Image.new('RGBA', (W, H), (250, 249, 245, 255))
    td = ImageDraw.Draw(tira)
    gx0, gy0, gx1, gy1 = 205 * S, 285 * S, 455 * S, 410 * S
    td.text((gx0 + 10 * S, gy0 + 12 * S), 'respuesta (ms)', font=fuente(MONO, 12 * S), fill=(70, 70, 70))
    rnd = random.Random(12)
    for i in range(16):
        h = rnd.uniform(0.25, 0.6) if i != 10 else 0.95
        x = gx0 + 16 * S + i * 14 * S
        td.rectangle([x, gy1 - 16 * S - h * 72 * S, x + 8 * S, gy1 - 16 * S],
                     fill=(234, 104, 44) if i == 10 else (40, 40, 40))
    td.line([(gx0 + 10 * S, gy1 - 15 * S), (gx1 - 10 * S, gy1 - 15 * S)], fill=(190, 190, 188), width=1 * S)
    pegar_papel_rasgado(f, (gx0, gy0, gx1, gy1), tira, seed=41, borde_blanco=False, giro=3)

    etiqueta(f, 985 * S, 300 * S, 220 * S, 'Disponibilidad')
    etiqueta(f, 1005 * S, 368 * S, 150 * S, 'Alertas')
    etiqueta(f, 985 * S, 436 * S, 170 * S, '', barra=VERDE + (255,))
    circulo_icono(f, 955 * S, 268 * S, 24 * S, (30, 111, 208), '✓', color_glifo=(240, 244, 250))
    circulo_icono(f, 520 * S, 112 * S, 24 * S, (30, 111, 208), '!', color_glifo=(240, 244, 250))
    guardar(f, ruta)


# ═════════════════════════════════════════════════════════════════════════════
# VISOR DE REPORTES
# Un portapapeles en trama de puntos con la hoja del reporte en plano y nitida (como la
# pantalla del monitor), y la ventanita del programa de escritorio. El color fuerte es
# un lila de la familia de la marca.
# ═════════════════════════════════════════════════════════════════════════════
LILA = (178, 134, 200)


def visor_reportes(ruta):
    f = papel(base=(236, 234, 231), seed=27).convert('RGBA')
    cx = 720 * S

    # papel lila rasgado y girado detras del portapapeles
    lila = Image.new('RGBA', (W, H), LILA + (255,))
    pegar_papel_rasgado(f, (515 * S, 70 * S, 945 * S, 530 * S), lila, seed=51, giro=-6)

    codigo(f, 110 * S, 110 * S, ['$ python visor.py --semana 38', '  -> reporte_S38.xlsx   ok'])
    codigo(f, 1010 * S, 470 * S, ['campo: 14 recorridos', 'fotos: 212   alertas: 3'])

    # ── el portapapeles, en grises ──
    gris = Image.new('L', (W, H), 255); alfa = Image.new('L', (W, H), 0)
    gd, ad = ImageDraw.Draw(gris), ImageDraw.Draw(alfa)
    rect_degradado(gris, alfa, (cx - 172 * S, 92 * S, cx + 172 * S, 492 * S), 22 * S, 178, 140)
    gd.rounded_rectangle([cx - 172 * S, 92 * S, cx + 172 * S, 492 * S], radius=22 * S, outline=80, width=3 * S)
    # pinza metalica
    rect_degradado(gris, alfa, (cx - 78 * S, 70 * S, cx + 78 * S, 126 * S), 14 * S, 236, 176)
    gd.rounded_rectangle([cx - 78 * S, 70 * S, cx + 78 * S, 126 * S], radius=14 * S, outline=90, width=3 * S)
    gd.rounded_rectangle([cx - 26 * S, 80 * S, cx + 26 * S, 98 * S], radius=9 * S, fill=70)
    calcomania(f, trama(gris, alfa, celda=12))

    # ── la hoja del reporte, plana y nitida encima ──
    hoja = capa(); hd = ImageDraw.Draw(hoja)
    hx0, hy0, hx1, hy1 = cx - 146 * S, 132 * S, cx + 146 * S, 472 * S
    hd.rectangle([hx0, hy0, hx1, hy1], fill=(250, 249, 246, 255))
    tinta = (34, 34, 34, 255)
    hd.text((hx0 + 18 * S, hy0 + 18 * S), 'Reporte de campo', font=fuente(INTER_B, 17 * S), fill=tinta)
    hd.text((hx0 + 18 * S, hy0 + 42 * S), 'Semana 38', font=fuente(MONO, 12 * S), fill=(110, 110, 110, 255))
    # tabla
    ty = hy0 + 72 * S
    hd.rectangle([hx0 + 18 * S, ty, hx1 - 18 * S, ty + 20 * S], fill=(48, 48, 48, 255))
    for k, t in enumerate(('Lote', 'Avance', 'Estado')):
        hd.text((hx0 + 26 * S + k * 86 * S, ty + 10 * S), t, font=fuente(INTER_SB, 11 * S), fill=(245, 245, 245, 255), anchor='lm')
    rnd = random.Random(3)
    for r in range(5):
        y = ty + 20 * S + r * 22 * S
        hd.line([(hx0 + 18 * S, y + 22 * S), (hx1 - 18 * S, y + 22 * S)], fill=(214, 214, 210, 255), width=1 * S)
        hd.text((hx0 + 26 * S, y + 11 * S), f'L-0{r + 1}', font=fuente(MONO, 11 * S), fill=tinta, anchor='lm')
        av = rnd.uniform(0.35, 0.95)
        bx = hx0 + 112 * S
        hd.rounded_rectangle([bx, y + 7 * S, bx + 66 * S, y + 15 * S], radius=4 * S, fill=(226, 226, 222, 255))
        hd.rounded_rectangle([bx, y + 7 * S, bx + int(66 * S * av), y + 15 * S], radius=4 * S, fill=LILA + (255,))
        ok = r != 3
        hd.text((hx0 + 200 * S, y + 11 * S), '✓' if ok else '!', font=fuente(SIMBOLOS, 13 * S),
                fill=(36, 140, 80, 255) if ok else (234, 104, 44, 255), anchor='lm')
    # mini grafica de barras al pie
    gy = hy1 - 22 * S
    for i in range(10):
        h = rnd.uniform(0.3, 1.0) * 62 * S
        x = hx0 + 22 * S + i * 25 * S
        hd.rectangle([x, gy - h, x + 14 * S, gy], fill=(48, 48, 48, 255) if i != 7 else LILA + (255,))
    hd.line([(hx0 + 18 * S, gy), (hx1 - 18 * S, gy)], fill=(180, 180, 176, 255), width=1 * S)
    sombra(f, hoja, 6 * S, (2 * S, 4 * S), 70)
    f.alpha_composite(hoja)

    # ventanita del programa de escritorio
    v = capa(); vd = ImageDraw.Draw(v)
    vx0, vy0, vx1, vy1 = 975 * S, 175 * S, 1225 * S, 345 * S
    vd.rounded_rectangle([vx0, vy0, vx1, vy1], radius=10 * S, fill=(250, 249, 246, 255), outline=(70, 70, 70, 255), width=2 * S)
    vd.rounded_rectangle([vx0, vy0, vx1, vy0 + 30 * S], radius=10 * S, fill=(40, 40, 40, 255))
    vd.rectangle([vx0, vy0 + 18 * S, vx1, vy0 + 30 * S], fill=(40, 40, 40, 255))
    for k, col in enumerate(((234, 104, 44), (242, 184, 75), (76, 195, 138))):
        vd.ellipse([vx0 + (12 + k * 16) * S, vy0 + 10 * S, vx0 + (22 + k * 16) * S, vy0 + 20 * S], fill=col + (255,))
    vd.text((vx1 - 12 * S, vy0 + 15 * S), 'VisorReportes', font=fuente(MONO, 11 * S), fill=(220, 220, 220, 255), anchor='rm')
    # mapa del predio: cuadricula de lotes con puntos de recorrido
    for i in range(6):
        for j in range(3):
            x, y = vx0 + 14 * S + i * 37 * S, vy0 + 42 * S + j * 32 * S
            vd.rectangle([x, y, x + 32 * S, y + 27 * S], fill=(226, 232, 224, 255), outline=(190, 196, 188, 255))
    ruta_pts = [(vx0 + 30 * S, vy1 - 26 * S), (vx0 + 70 * S, vy0 + 92 * S), (vx0 + 120 * S, vy0 + 110 * S),
                (vx0 + 160 * S, vy0 + 62 * S), (vx0 + 210 * S, vy0 + 80 * S)]
    vd.line(ruta_pts, fill=LILA + (255,), width=3 * S, joint='curve')
    for x, y in ruta_pts:
        vd.ellipse([x - 5 * S, y - 5 * S, x + 5 * S, y + 5 * S], fill=(40, 40, 40, 255))
    sombra(f, v, 8 * S, (3 * S, 6 * S), 80)
    f.alpha_composite(v)

    etiqueta(f, 245 * S, 300 * S, 235 * S, 'Reporte semanal')
    etiqueta(f, 285 * S, 368 * S, 175 * S, 'Excel · PDF')
    etiqueta(f, 1000 * S, 380 * S, 170 * S, '', barra=LILA + (255,))
    circulo_icono(f, 955 * S, 168 * S, 24 * S, (30, 111, 208), '↓', color_glifo=(240, 244, 250))
    circulo_icono(f, 520 * S, 118 * S, 24 * S, (30, 111, 208), '✓', color_glifo=(240, 244, 250))
    guardar(f, ruta)


if __name__ == '__main__':
    cual = sys.argv[1] if len(sys.argv) > 1 else 'todas'
    if cual in ('bank', 'todas'):
        bank_central('portada-bank-central.jpg')
    if cual in ('cripto', 'todas'):
        cripto_world('portada-cripto-world.jpg')
    if cual in ('monitoreo', 'todas'):
        monitoreo_web('portada-monitoreo.jpg')
    if cual in ('visor', 'todas'):
        visor_reportes('portada-visor-reportes.jpg')
