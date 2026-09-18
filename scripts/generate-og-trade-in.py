#!/usr/bin/env python3
"""1200x630 card for the partners lander. Warm Galaxy ground, one brand bloom."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "public" / "partners" / "og-trade-in.png"
W, H = 1200, 630
BG = (250, 249, 247)
FG = (20, 22, 26)
INK = (0, 107, 184)
MUTED = (98, 104, 115)
BRAND = (0, 162, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


# Inter in this image is a variable face; Pillow drops the space glyph.
# Noto is static and keeps word spacing.
bold = font("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", 72)
semibold = font("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", 26)
regular = font("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", 24)

img = Image.new("RGB", (W, H), BG)
bloom = Image.new("RGB", (W, H), BG)
bloom_draw = ImageDraw.Draw(bloom)
bloom_draw.ellipse((620, -260, 1480, 520), fill=(186, 226, 255))
img = Image.blend(img, bloom.filter(ImageFilter.GaussianBlur(48)), 0.55)

draw = ImageDraw.Draw(img)
draw.rounded_rectangle((72, 78, 246, 132), radius=16, fill=BRAND)
draw.text((90, 90), "Epic Deals", font=semibold, fill=(255, 255, 255))
draw.text((72, 200), "Pay with the tech", font=bold, fill=FG)
draw.text((72, 286), "they already own", font=bold, fill=FG)
draw.text((72, 400), "White-label trade-in as payment for SA retailers", font=regular, fill=MUTED)
draw.text((72, 526), "epicdeals.co.za/partners/trade-in", font=regular, fill=INK)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} {OUT.stat().st_size} bytes")
