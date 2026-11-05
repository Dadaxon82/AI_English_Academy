"""
Mobil resurslar: Ai-English.jpg → mascot (shaffof) + launcher ikonalar.

Veb tomondagi `scripts/make-icons.mjs` / `process_mascot.py` xuddi shu
flood-fill algoritmi asosida ishlaydi — mobil nusxa HTML canvas ga bog'liq
bo'lmasligi uchun PIL bilan qaytarilgan.

Chiquv:
  app/src/main/res/drawable-nodpi/mascot.png        — to'liq qad (shaffof)
  app/src/main/res/drawable-nodpi/mascot_avatar.png — bosh/ramka (doira)
  app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png
  app/src/main/res/mipmap-*/ic_launcher_round.png
"""
import os
import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "..", "..", "Ai-English.jpg")
RES = os.path.join(ROOT, "app", "src", "main", "res")
if not os.path.isfile(SRC):
    print("TOPILMADI:", SRC, file=sys.stderr)
    sys.exit(1)


def cutout() -> Image.Image:
    """Chekkadan flood-fill orqali oq fonda yo'qotadi (process_mascot.py mantiqi)."""
    im = Image.open(SRC).convert("RGBA")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    px = im.load()
    w, h = im.size
    bg = [False] * (w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not bg[y * w + x]:
                bg[y * w + x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not bg[y * w + x]:
                bg[y * w + x] = True
                q.append((x, y))
    floor = int(h * 0.78)  # oyoq ostidagi soya ham fon
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y][:4]
        near_white = r > 242 and g > 242 and b > 242
        shadow = y >= floor and r > 150 and g > 150 and b > 150
        if not (near_white or shadow):
            bg[y * w + x] = False
            continue
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                bg[ny * w + nx] = True
                q.append((nx, ny))
    alpha = im.getchannel("A").load()
    for y in range(h):
        for x in range(w):
            alpha[x, y] = 0 if bg[y * w + x] else 255
    # Chekkani yumshatish: alpha ni 1px blur (qirra tishlari yo'qoladi)
    a = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(a)
    bbox = im.getbbox()
    return im.crop(bbox)


def square_pad(img: Image.Image, size: int, pad: float = 0.08) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - 2 * pad))
    im = img.copy()
    im.thumbnail((inner, inner), Image.LANCZOS)
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def circle(img: Image.Image, size: int) -> Image.Image:
    sq = square_pad(img, size, pad=0.0)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(sq, (0, 0), mask)
    return out


def launcher(full: Image.Image, avatar: Image.Image, size: int) -> Image.Image:
    """Fon: brend ko'ki (#1d4ed8 → #0ea5e9 gradient), oldida qahramon boshi."""
    base = Image.new("RGBA", (size, size), (29, 78, 216, 255))
    grad = Image.new("L", (1, size))
    for y in range(size):
        grad.putpixel((0, y), int(255 * y / max(1, size)))
    overlay = Image.new("RGBA", (size, size), (14, 165, 233, 255))
    base = Image.composite(overlay, base, grad.resize((size, size)))
    av = avatar.resize((int(size * 0.94), int(size * 0.94)), Image.LANCZOS)
    base.paste(av, ((size - av.width) // 2, (size - av.height) // 2), av)
    return base


def main() -> None:
    full = cutout()
    avatar = square_pad(full, 1024, pad=0.18)
    head = avatar.crop(
        (int(1024 * 0.16), int(1024 * 0.06), int(1024 * 0.84), int(1024 * 0.78))
    )

    os.makedirs(os.path.join(RES, "drawable-nodpi"), exist_ok=True)
    square_pad(full, 1024).save(os.path.join(RES, "drawable-nodpi", "mascot.png"), optimize=True)
    circle(head, 512).save(os.path.join(RES, "drawable-nodpi", "mascot_avatar.png"), optimize=True)

    for dens, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
        d = os.path.join(RES, f"mipmap-{dens}")
        os.makedirs(d,exist_ok=True)
        launcher(full, head, size).save(os.path.join(d, "ic_launcher.png"), optimize=True)
        ic = launcher(full, head, size)
        cm = Image.new("L", (size, size), 0)
        ImageDraw.Draw(cm).ellipse((0, 0, size - 1, size - 1), fill=255)
        r = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        r.paste(ic, (0, 0), cm)
        r.save(os.path.join(d, "ic_launcher_round.png"), optimize=True)
    print("OK — mascot va ikonalar tayyor")


if __name__ == "__main__":
    main()
