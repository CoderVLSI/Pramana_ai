"""Draws the three bottom-tab icons (chat, library, settings) as white-on-transparent PNGs.
Original artwork drawn from basic shapes; the app tints them to the theme colour.
usage: python3 -I scripts/make-tab-icons.py apps/mobile/assets/icons"""
import sys
from PIL import Image, ImageDraw
S, K = 4, 96  # draw at 4x, output 96x96
W = K * S
def canvas(): return Image.new('L', (W, W), 0)
def px(v): return int(v * S)
def out(img, path):
    rgba = Image.new('RGBA', (W, W), (255, 255, 255, 0)); rgba.putalpha(img)
    rgba.resize((K, K), Image.LANCZOS).save(path)
def stroke(d, shape, fn, width=6):
    # outline = fill, then punch the inner area
    pass
def chat(filled):
    a = canvas(); d = ImageDraw.Draw(a)
    body = [px(10), px(14), px(86), px(68)]
    tail = [(px(24), px(62)), (px(24), px(86)), (px(48), px(66))]
    d.rounded_rectangle(body, radius=px(20), fill=255); d.polygon(tail, fill=255)
    if not filled:  # hollow it out, keep a 6px rim
        inner = canvas(); di = ImageDraw.Draw(inner)
        di.rounded_rectangle([px(16), px(20), px(80), px(62)], radius=px(14), fill=255)
        di.polygon([(px(30), px(56)), (px(30), px(76)), (px(46), px(62))], fill=255)
        a.paste(0, mask=inner)
    for cx in (30, 48, 66):  # three dots: solid when outline, punched when filled
        d.ellipse([px(cx - 5), px(36), px(cx + 5), px(46)], fill=0 if filled else 255)
    return a
def library(filled):
    a = canvas(); d = ImageDraw.Draw(a)
    def book(box, angle=0):
        layer = canvas(); dl = ImageDraw.Draw(layer)
        dl.rounded_rectangle([px(v) for v in box], radius=px(4), fill=255)
        if not filled:
            x0, y0, x1, y1 = box
            dl.rounded_rectangle([px(x0 + 5), px(y0 + 5), px(x1 - 5), px(y1 - 5)], radius=px(1), fill=0)
        # spine bands
        x0, y0, x1, y1 = box
        for y in (y0 + 12, y0 + 18):
            dl.rectangle([px(x0), px(y), px(x1), px(y + 3)], fill=0 if filled else 255)
        if angle:
            cx, cy = px((x0 + x1) / 2), px(y1)
            layer = layer.rotate(angle, resample=Image.BICUBIC, center=(cx, cy))
        a.paste(255, mask=layer)
    book((10, 20, 30, 84)); book((36, 10, 58, 84)); book((64, 22, 84, 84), angle=16)
    return a
def settings(filled):
    a = canvas(); d = ImageDraw.Draw(a)
    for y, kx in ((26, 62), (48, 34), (70, 66)):
        d.rounded_rectangle([px(10), px(y - 3), px(86), px(y + 3)], radius=px(3), fill=255)
        d.ellipse([px(kx - 11), px(y - 11), px(kx + 11), px(y + 11)], fill=0)       # clear a halo
        d.ellipse([px(kx - 9), px(y - 9), px(kx + 9), px(y + 9)], fill=255)          # knob
        if not filled: d.ellipse([px(kx - 4), px(y - 4), px(kx + 4), px(y + 4)], fill=0)
    return a
dest = sys.argv[1]
for name, fn in (('chat', chat), ('library', library), ('settings', settings)):
    out(fn(False), f'{dest}/tab-{name}.png'); out(fn(True), f'{dest}/tab-{name}-active.png')
print('wrote 6 icons to', dest)
