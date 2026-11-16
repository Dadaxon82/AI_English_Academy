"""
2D «Dars sayohati» xaritasining grafik aktivlarini namunaviy rasmdan yasaydi.

Manba: design/map-reference.webp — loyiha egasi bergan dizayn namunasi (1448×1086).
Natija (public/map/):
  scene.webp           — bir kunlik sahna: yuqori navigatsiya kesilgan, barcha
                         dinamik qismlar (kun nomi, panel matnlari, progress, medal
                         belgilari, yorliq matnlari, foizlar, yutuq qiymatlari) o'chirilgan.
                         Qahramon, maktab, yo'l, daraxtlar, belgi va bezaklar — asl piksellar.
  band.webp            — sahna ostidagi davom qismi (Gapiriş va Kun testi uchun),
                         sahnaning o'z o't bo'laklaridan yig'iladi.
  disc-<slot>-<rang>.webp — medal diski: gold / green / grey (holatga qarab ustiga qo'yiladi).
  medal-<rang>.webp    — to'liq medal (halqa, disk, poydevor, bo'sh yorliq) — davom qismi uchun.
  src/lib/sceneGeometry.ts — barcha koordinatalar (generatsiya qilinadi).

Ishga tushirish (faqat aktivlarni qayta yasash kerak bo'lganda; ilovaning o'ziga kerak emas):
  pip install opencv-python-headless numpy
  python3 scripts/map-assets/build_map_assets.py
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'design', 'map-reference.webp')
OUT = os.path.join(ROOT, 'public', 'map')
GEO_TS = os.path.join(ROOT, 'src', 'lib', 'sceneGeometry.ts')
os.makedirs(OUT, exist_ok=True)

TOP = 84          # yuqori navigatsiya paneli (0–84) kesiladi
BAND_H = 440      # davom qismi balandligi

im = cv2.imread(SRC)
H, W = im.shape[:2]
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
lum = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
mask = np.zeros((H, W), np.uint8)


def dark_in(x0, y0, x1, y1, thr=150):
    m = np.zeros_like(mask)
    m[y0:y1, x0:x1] = (lum[y0:y1, x0:x1] < thr).astype(np.uint8) * 255
    return m


def white_in(x0, y0, x1, y1, thr=215, smax=60):
    m = np.zeros_like(mask)
    s = hsv[y0:y1, x0:x1, 1]
    v = hsv[y0:y1, x0:x1, 2]
    m[y0:y1, x0:x1] = ((v > thr) & (s < smax)).astype(np.uint8) * 255
    return m


def dil(m, k=5):
    return cv2.dilate(m, np.ones((k, k), np.uint8))


# ---------------------------------------------------------------- tozalash
parts, rowparts = [], []
# Kun sarlavhasi matni (oq harflar ko'k gradientda) — qator bo'yicha interpolyatsiya
rowparts.append(dil(white_in(392, 118, 1058, 170, thr=200, smax=90), 7))
# «Keyingi maqsad» paneli matnlari va progress
parts.append(dil(dark_in(212, 205, 545, 245, 170), 5))
parts.append(dil(dark_in(1025, 205, 1200, 245, 190), 5))
parts.append(dil(dark_in(680, 250, 750, 278, 120), 5))
m = np.zeros_like(mask)
sub = hsv[248:280, 222:350]
m[248:280, 222:350] = ((sub[:, :, 1] > 90) & (sub[:, :, 0] > 35) & (sub[:, :, 0] < 85)).astype(np.uint8) * 255
parts.append(dil(m, 5))
# Medal belgilari
ICONS = {'vocab': (760, 362, 842, 440), 'gram': (1010, 535, 1090, 612), 'read': (566, 590, 656, 664),
         'listen': (548, 800, 644, 884), 'write': (956, 796, 1056, 894)}
for (x0, y0, x1, y1) in ICONS.values():
    m = np.zeros_like(mask)
    cv2.ellipse(m, ((x0 + x1) // 2, (y0 + y1) // 2), ((x1 - x0) // 2 + 4, (y1 - y0) // 2 + 4), 0, 0, 360, 255, -1)
    rowparts.append(m)
# Yorliq matnlari
LABELS = {'vocab': (735, 462, 875, 497), 'gram': (965, 628, 1130, 665), 'read': (550, 688, 680, 724),
          'listen': (535, 900, 655, 942), 'write': (960, 905, 1060, 945), 'start': (372, 470, 492, 507)}
for b in LABELS.values():
    parts.append(dil(dark_in(*b, 150), 5))
# Lug'at foiz pufakchasi: medal simmetrik — chap tomondan ko'zgu nusxa
x0, y0, x1, y1, cx = 816, 312, 946, 382, 800
src = im[y0:y1, 2 * cx - x1:2 * cx - x0][:, ::-1].copy()
a = np.zeros((y1 - y0, x1 - x0), np.float32)
a[7:-7, 7:-7] = 1.0
a = cv2.GaussianBlur(a, (0, 0), 2.5)[:, :, None]
im[y0:y1, x0:x1] = (src * a + im[y0:y1, x0:x1] * (1 - a)).astype(np.uint8)
# Grammatika foiz pufakchasi: halqa ichida ko'zgu, tashqarisida inpaint
gx0, gy0, gx1, gy1, gcx, gcy, gr = 1062, 495, 1184, 558, 1050, 576, 87
circ = np.zeros_like(mask)
cv2.circle(circ, (gcx, gcy), gr, 255, -1, cv2.LINE_AA)
box = np.zeros_like(mask)
cv2.rectangle(box, (gx0, gy0), (gx1, gy1), 255, -1)
inside = cv2.bitwise_and(circ, box)
inside[:510] = 0
ys, xs = np.where(inside > 0)
im[ys, xs] = im[ys, 2 * gcx - xs]
parts.append(cv2.bitwise_and(box, cv2.bitwise_not(cv2.erode(inside, np.ones((5, 5), np.uint8)))))
# Yutuqlar paneli matnlari
for b in [(132, 915, 340, 958), (92, 993, 130, 1035), (205, 980, 262, 1035), (328, 978, 402, 1035)]:
    parts.append(dil(dark_in(*b, 150), 5))

for p in parts:
    mask = cv2.bitwise_or(mask, p)
rowmask = np.zeros_like(mask)
for p in rowparts:
    rowmask = cv2.bitwise_or(rowmask, p)
work = im.astype(np.float32).copy()
for y in range(H):
    row = rowmask[y]
    if not row.any():
        continue
    xs = np.where(row > 0)[0]
    for seg in np.split(xs, np.where(np.diff(xs) > 1)[0] + 1):
        a0, b0 = seg[0], seg[-1]
        L = work[y, max(a0 - 2, 0)]
        R = work[y, min(b0 + 2, W - 1)]
        t = (np.arange(b0 - a0 + 1) + 1) / (b0 - a0 + 2)
        work[y, a0:b0 + 1] = L[None, :] * (1 - t[:, None]) + R[None, :] * t[:, None]
blur = cv2.GaussianBlur(work, (0, 0), 2.2)
rm = (cv2.GaussianBlur(rowmask, (0, 0), 1.5).astype(np.float32) / 255.0)[:, :, None]
im2 = (work * (1 - rm) + blur * rm).clip(0, 255).astype(np.uint8)
mask = cv2.bitwise_and(mask, cv2.bitwise_not(rowmask))
clean = cv2.inpaint(im2, mask, 9, cv2.INPAINT_TELEA)

scene = clean[TOP:H].copy()
SH = scene.shape[0]
cv2.imwrite(os.path.join(OUT, 'scene.webp'), scene, [cv2.IMWRITE_WEBP_QUALITY, 86])

# ---------------------------------------------------------------- medal disklari
cleanhsv = cv2.cvtColor(clean, cv2.COLOR_BGR2HSV)
SLOTS = {  # medal bbox (qidiruv maydoni) va asl rangi
    'start': ((290, 390, 525, 570), 'green'),
    'vocab': ((712, 318, 892, 470), 'gold'),
    'gram': ((950, 490, 1150, 640), 'gold'),
    'read': ((515, 540, 705, 700), 'green'),
    'listen': ((495, 760, 700, 920), 'green'),
    'write': ((905, 760, 1110, 920), 'green'),
}


def medal_mask(box, color):
    x0, y0, x1, y1 = box
    sub = cleanhsv[y0:y1, x0:x1]
    h, s, v = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
    if color == 'gold':
        m = (h >= 10) & (h <= 32) & (s > 110) & (v > 140)
    else:
        m = (h >= 45) & (h <= 80) & (s > 150) & (v > 90)
    m = m.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c0 = max(cs, key=cv2.contourArea)
    full = np.zeros_like(m)
    cv2.drawContours(full, [c0], -1, 255, -1)
    return full


def stats(box, color):
    x0, y0, x1, y1 = box
    mm = medal_mask(box, color) > 0
    sub = cleanhsv[y0:y1, x0:x1][mm].astype(np.float32)
    return sub.mean(axis=0)


GOLD = stats(SLOTS['vocab'][0], 'gold')
GREEN = stats(SLOTS['read'][0], 'green')


def recolor(patch_hsv, m, src, dst):
    out = patch_hsv.astype(np.float32).copy()
    sel = (m > 0) & (patch_hsv[:, :, 1] > 50)
    if dst == 'grey':
        out[..., 1][sel] = out[..., 1][sel] * 0.07
        out[..., 2][sel] = 175 + (out[..., 2][sel] - src[2]) * 0.55
    else:
        d = GOLD if dst == 'gold' else GREEN
        # tus og'ishi siqiladi — yashil-sariq porlash to'q sariqqa o'tib ketmasin
        out[..., 0][sel] = np.clip(d[0] + (out[..., 0][sel] - src[0]) * 0.3, 0, 179)
        out[..., 1][sel] = out[..., 1][sel] * (d[1] / src[1])
        out[..., 2][sel] = out[..., 2][sel] * (d[2] / src[2])
    return cv2.cvtColor(out.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)


geo = {'width': W, 'sceneHeight': SH, 'bandHeight': BAND_H, 'discs': {}}
for slot, (box, base) in SLOTS.items():
    x0, y0, x1, y1 = box
    m = medal_mask(box, base)
    ys, xs = np.where(m > 0)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    m = m[by0:by1, bx0:bx1]
    alpha = cv2.GaussianBlur(m, (3, 3), 0)
    patch = clean[y0 + by0:y0 + by1, x0 + bx0:x0 + bx1]
    phsv = cleanhsv[y0 + by0:y0 + by1, x0 + bx0:x0 + bx1]
    src = stats(box, base)  # har medalning o'z rangi (Boshlash yashili boshqacha)
    for col in ('gold', 'green', 'grey'):
        rgb = patch if col == base else recolor(phsv, m, src, col)
        rgba = cv2.cvtColor(rgb, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = alpha
        cv2.imwrite(os.path.join(OUT, f'disc-{slot}-{col}.webp'), rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
    geo['discs'][slot] = {'x': int(x0 + bx0), 'y': int(y0 + by0 - TOP), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'base': base}

# ---------------------------------------------------------------- to'liq medal (davom qismi uchun)
mcx, mcy, mr, mpy, mprx, mpry = 1005, 858, 93, 925, 110, 46
bx0, by0, bx1, by1 = 890, 760, 1120, 975
mm = np.zeros(clean.shape[:2], np.uint8)
cv2.circle(mm, (mcx, mcy), mr, 255, -1, cv2.LINE_AA)
cv2.ellipse(mm, (mcx, mpy), (mprx, mpry), 0, 0, 360, 255, -1, cv2.LINE_AA)
mm = cv2.GaussianBlur(mm, (3, 3), 0)[by0:by1, bx0:bx1]
# Yozish yorlig'i matni ham o'chirilgan — bo'sh yorliq
crop = clean[by0:by1, bx0:bx1]
cm = medal_mask(SLOTS['write'][0], 'green')
x0, y0, x1, y1 = SLOTS['write'][0]
full_m = np.zeros(clean.shape[:2], np.uint8)
full_m[y0:y1, x0:x1] = cm
cm = full_m[by0:by1, bx0:bx1]
chsv = cleanhsv[by0:by1, bx0:bx1]
for col in ('gold', 'green', 'grey'):
    rgb = crop if col == 'green' else recolor(chsv, cm, GREEN, col)
    rgba = cv2.cvtColor(rgb, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = mm
    cv2.imwrite(os.path.join(OUT, f'medal-{col}.webp'), rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
geo['medal'] = {'w': bx1 - bx0, 'h': by1 - by0, 'cx': mcx - bx0, 'cy': mcy - by0}

# ---------------------------------------------------------------- davom qismi (band)
rng = np.random.default_rng(7)
grass = clean[TOP:H][SH - 60:SH, 600:900].reshape(-1, 3).astype(np.float32)
base_col = np.median(grass, axis=0)
band = np.zeros((BAND_H, W, 3), np.float32)
for yy in range(BAND_H):
    k = yy / BAND_H
    band[yy] = base_col * (1 - 0.10 * k)
# sahnaning pastki qatorlari ko'zgu bo'lib davom etadi va asosiy rangga erib ketadi
MIR = 22  # faqat yutuqlar paneli ostidagi o't qatorlari (panel ko'zguda ko'rinmasin)
mir = scene[SH - MIR:SH][::-1].astype(np.float32)
fade = np.clip(1 - np.arange(MIR) / MIR, 0, 1) ** 1.4
band[:MIR] = mir * fade[:, None, None] + band[:MIR] * (1 - fade[:, None, None])
# o't, gul va buta bo'laklari (sahnaning o'zidan)
STAMPS = [(20, 630, 95, 680), (60, 692, 115, 742), (110, 762, 170, 800), (300, 860, 420, 895),
          (640, 990, 740, 1040), (780, 560, 860, 600)]
places = [(60, 210), (300, 330), (520, 250), (870, 360), (1240, 230), (1330, 380), (160, 380), (1050, 300), (420, 180), (1180, 330)]
for i, (px, py) in enumerate(places):
    sx0, sy0, sx1, sy1 = STAMPS[i % len(STAMPS)]
    st = clean[sy0:sy1, sx0:sx1].astype(np.float32)
    sh, sw = st.shape[:2]
    if py + sh > BAND_H or px + sw > W:
        continue
    # faqat o't/gul piksellari: bo'lak chetidagi fon rangidan farqi bo'yicha alfa
    edge = np.concatenate([st[0], st[-1], st[:, 0], st[:, -1]]).mean(axis=0)
    dist = np.linalg.norm(st - edge, axis=2)
    al = np.clip((dist - 14) / 26, 0, 1)
    al = cv2.GaussianBlur(al, (0, 0), 0.8)[:, :, None]
    st = st - edge + band[py:py + sh, px:px + sw].mean(axis=(0, 1))
    band[py:py + sh, px:px + sw] = st * al + band[py:py + sh, px:px + sw] * (1 - al)
cv2.imwrite(os.path.join(OUT, 'band.webp'), band.clip(0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 86])

# ---------------------------------------------------------------- geometriya (TS)
P = lambda x, y: {'x': x, 'y': y - TOP}
geo['slots'] = {
    'start': P(405, 484), 'vocabulary': P(800, 405), 'grammar': P(1050, 575), 'reading': P(610, 630),
    'listening': P(595, 852), 'writing': P(1005, 852),
}
geo['labels'] = {k: {'x': (b[0] + b[2]) / 2, 'y': (b[1] + b[3]) / 2 - TOP} for k, b in {
    'start': (372, 470, 492, 507), 'vocabulary': (727, 459, 882, 499), 'grammar': (958, 625, 1138, 668),
    'reading': (539, 685, 686, 726), 'listening': (520, 897, 670, 945), 'writing': (930, 902, 1082, 948)}.items()}
geo['banner'] = {'x': 365, 'y': 108 - TOP, 'w': 715, 'h': 70}
geo['panel'] = {'x': 120, 'y': 195 - TOP, 'w': 1205, 'h': 105, 'textY': 226 - TOP, 'barX': 228, 'barY': 252 - TOP, 'barW': 952, 'barH': 24}
geo['ach'] = {'x': 10, 'y': 885 - TOP, 'w': 410, 'h': 177, 'titleX': 140, 'titleY': 937 - TOP, 'valY': 1012 - TOP,
              'vals': [96, 210, 332]}
with open(GEO_TS, 'w') as f:
    f.write('/**\n * 2D xarita sahnasi geometriyasi — GENERATSIYA QILINADI:\n * `python3 scripts/map-assets/build_map_assets.py`. Qo\'lda tahrirlamang.\n * Koordinatalar `public/map/scene.webp` piksellarida (kenglik 1448).\n */\n')
    f.write('export const SCENE = ' + json.dumps(geo, indent=2) + ' as const\n')
print('ok', W, SH, json.dumps(geo['discs']))
