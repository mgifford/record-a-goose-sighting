#!/usr/bin/env python3
"""Draw the animated goose used on the confirmation page.

The exercise deliberately needs an animated GIF that cannot be paused and has
no alternative text, so this is a simple decorative animation rather than a
production illustration.

The artwork is generated here so that the repository does not depend on a
third-party image host, and so that the licence is unambiguous (MIT, Crown
Copyright, same as the rest of the repository).

Requires Pillow:

    python3 scripts/art/make-goose-gif.py

Writes app/assets/images/goose-celebration.gif (352 x 264, 10 frames).
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT = 352, 264
SCALE = 4
FRAMES = 10
FRAME_MS = 110

OUTPUT = Path(__file__).resolve().parents[2] / "app/assets/images/goose-celebration.gif"

SKY_TOP = (201, 231, 248)
SKY_HORIZON = (240, 250, 255)
GRASS_TOP = (128, 190, 96)
GRASS_BOTTOM = (86, 143, 65)
WHITE = (253, 253, 250)
SHADOW = (214, 219, 207)
OUTLINE = (52, 58, 50)
BEAK = (233, 145, 44)
BEAK_DARK = (192, 110, 25)
FOOT = (224, 132, 41)
EYE = (28, 30, 30)
SPARKLE = (255, 214, 83)

HORIZON = 168


def lerp(first, second, amount):
    return tuple(round(a + (b - a) * amount) for a, b in zip(first, second))


def background():
    """Sky gradient, hills and grass, drawn once and reused for every frame."""
    image = Image.new("RGB", (WIDTH * SCALE, HEIGHT * SCALE))
    draw = ImageDraw.Draw(image)

    for y in range(HEIGHT * SCALE):
        height = y / (HEIGHT * SCALE)
        if height < HORIZON / HEIGHT:
            colour = lerp(SKY_TOP, SKY_HORIZON, height / (HORIZON / HEIGHT))
        else:
            colour = lerp(
                GRASS_TOP,
                GRASS_BOTTOM,
                (height - HORIZON / HEIGHT) / (1 - HORIZON / HEIGHT),
            )
        draw.line([(0, y), (WIDTH * SCALE, y)], fill=colour)

    # Soft hills behind the grass.
    draw.ellipse(
        [(-120 * SCALE, 120 * SCALE), (240 * SCALE, 300 * SCALE)],
        fill=(146, 196, 128),
    )
    draw.ellipse(
        [(150 * SCALE, 130 * SCALE), (520 * SCALE, 320 * SCALE)],
        fill=(135, 188, 118),
    )

    # Grass blades.
    random.seed(7)
    for _ in range(220):
        x = random.uniform(0, WIDTH)
        y = random.uniform(HORIZON + 2, HEIGHT)
        length = random.uniform(4, 11) * (0.6 + (y - HORIZON) / HEIGHT)
        lean = random.uniform(-2.5, 2.5)
        green = random.randint(70, 120)
        draw.line(
            [
                (x * SCALE, y * SCALE),
                ((x + lean) * SCALE, (y - length) * SCALE),
            ],
            fill=(52, green, 46),
            width=max(1, SCALE // 2),
        )

    return image


def draw_sparkles(draw, centre_x, centre_y, phase):
    """A few twinkles that fade in and out, to make the goose look pleased."""
    positions = [(-52, -30, 0.0), (48, -44, 0.35), (62, 6, 0.7), (-70, 16, 0.5)]
    for offset_x, offset_y, offset in positions:
        strength = max(0.0, math.sin((phase + offset) * 2 * math.pi))
        if strength < 0.15:
            continue

        radius = (3 + 4 * strength) * SCALE
        x = (centre_x + offset_x) * SCALE
        y = (centre_y + offset_y) * SCALE
        colour = lerp(GRASS_TOP, SPARKLE, min(1.0, strength * 1.2))

        draw.polygon(
            [
                (x, y - radius),
                (x + radius * 0.28, y - radius * 0.28),
                (x + radius, y),
                (x + radius * 0.28, y + radius * 0.28),
                (x, y + radius),
                (x - radius * 0.28, y + radius * 0.28),
                (x - radius, y),
                (x - radius * 0.28, y - radius * 0.28),
            ],
            fill=colour,
        )


def draw_goose(image, phase):
    """Draw the goose in one pose. `phase` runs from 0 to 1 across the loop."""
    draw = ImageDraw.Draw(image, "RGBA")

    bob = 3.2 * math.sin(phase * 2 * math.pi)
    head_bob = -3.0 * math.sin(phase * 2 * math.pi + 0.7)
    flap = math.sin(phase * 2 * math.pi + 0.2)

    body_x, body_y = 148, 184 + bob

    # Ground shadow.
    draw.ellipse(
        [
            (body_x - 68) * SCALE,
            (body_y + 44) * SCALE,
            (body_x + 72) * SCALE,
            (body_y + 60) * SCALE,
        ],
        fill=(70, 118, 58, 90),
    )

    # Legs and feet.
    for hip_x, foot_x in ((body_x - 12, body_x - 20), (body_x + 22, body_x + 30)):
        draw.line(
            [(hip_x * SCALE, (body_y + 28) * SCALE), (foot_x * SCALE, 244 * SCALE)],
            fill=BEAK_DARK,
            width=7 * SCALE,
        )
        draw.line(
            [(hip_x * SCALE, (body_y + 28) * SCALE), (foot_x * SCALE, 244 * SCALE)],
            fill=FOOT,
            width=4 * SCALE,
        )
        for toe in (-10, 0, 10):
            draw.line(
                [
                    (foot_x * SCALE, 244 * SCALE),
                    ((foot_x + toe) * SCALE, 253 * SCALE),
                ],
                fill=FOOT,
                width=3 * SCALE,
            )

    head_x = 212
    head_y = 92 + bob + head_bob

    # Neck: a thick, gently curved stroke from the shoulders to the head.
    neck_points = [
        ((body_x + 30) * SCALE, (body_y - 10) * SCALE),
        ((body_x + 52) * SCALE, (body_y - 30) * SCALE),
        ((head_x - 4) * SCALE, (head_y + 18) * SCALE),
    ]
    draw.line(neck_points, fill=OUTLINE, width=22 * SCALE, joint="curve")
    draw.line(neck_points, fill=WHITE, width=17 * SCALE, joint="curve")

    # Tail.
    draw.polygon(
        [
            ((body_x - 60) * SCALE, (body_y - 2) * SCALE),
            ((body_x - 92) * SCALE, (body_y - 22) * SCALE),
            ((body_x - 84) * SCALE, (body_y + 6) * SCALE),
        ],
        fill=SHADOW,
    )

    # Body.
    draw.ellipse(
        [
            ((body_x - 62) * SCALE, (body_y - 36) * SCALE),
            ((body_x + 64) * SCALE, (body_y + 32) * SCALE),
        ],
        fill=WHITE,
        outline=OUTLINE,
        width=2 * SCALE,
    )

    # Wing.
    wing_lift = 6 * flap
    draw.ellipse(
        [
            ((body_x - 26) * SCALE, (body_y - 20 - wing_lift) * SCALE),
            ((body_x + 22) * SCALE, (body_y + 4 - wing_lift) * SCALE),
        ],
        fill=(214, 210, 193),
        outline=(120, 126, 116),
        width=int(1.5 * SCALE),
    )
    draw.arc(
        [
            ((body_x - 20) * SCALE, (body_y - 15 - wing_lift) * SCALE),
            ((body_x + 16) * SCALE, (body_y + 3 - wing_lift) * SCALE),
        ],
        start=205,
        end=335,
        fill=(150, 156, 146),
        width=int(1.5 * SCALE),
    )

    # Head.
    draw.ellipse(
        [
            ((head_x - 20) * SCALE, (head_y - 20) * SCALE),
            ((head_x + 20) * SCALE, (head_y + 20) * SCALE),
        ],
        fill=WHITE,
        outline=OUTLINE,
        width=2 * SCALE,
    )

    # Beak.
    draw.polygon(
        [
            ((head_x + 13) * SCALE, (head_y - 6) * SCALE),
            ((head_x + 43) * SCALE, (head_y + 4) * SCALE),
            ((head_x + 13) * SCALE, (head_y + 13) * SCALE),
        ],
        fill=BEAK,
        outline=BEAK_DARK,
        width=2 * SCALE,
    )
    draw.line(
        [
            ((head_x + 16) * SCALE, (head_y + 4) * SCALE),
            ((head_x + 38) * SCALE, (head_y + 4) * SCALE),
        ],
        fill=BEAK_DARK,
        width=1 * SCALE,
    )

    # Eye.
    draw.ellipse(
        [
            ((head_x + 3) * SCALE, (head_y - 8) * SCALE),
            ((head_x + 10) * SCALE, (head_y - 1) * SCALE),
        ],
        fill=EYE,
    )

    draw_sparkles(draw, body_x + 20, head_y - 6, phase)


def main():
    base = background()

    frames = []
    for index in range(FRAMES):
        frame = base.copy()
        draw_goose(frame, index / FRAMES)
        frame = frame.resize((WIDTH, HEIGHT), Image.LANCZOS)
        frames.append(frame)

    # A shared palette keeps the animation stable and the file small.
    palette = frames[0].quantize(colors=128, method=Image.MEDIANCUT)
    quantised = [frame.quantize(palette=palette, dither=Image.NONE) for frame in frames]

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    quantised[0].save(
        OUTPUT,
        save_all=True,
        append_images=quantised[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
    )

    size = OUTPUT.stat().st_size
    print(f"Wrote {OUTPUT.relative_to(OUTPUT.parents[3])} ({size:,} bytes)")


if __name__ == "__main__":
    main()
