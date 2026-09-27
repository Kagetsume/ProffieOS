#!/usr/bin/env python3
"""Optional maintainer tool; end users export BMP directly per strip_column_bmp.h.

Convert a strip-column animation image to ProffieOS .scf (strip column file).
Requires: pip install pillow

Image layout (author in GIMP, Aseprite, Photoshop, etc.):
  - Width  = number of animation frames (column 0 = frame 0, …).
  - Height = blade axis in pixels; row 0 = hilt (top), last row = tip (bottom).
  - Each pixel is one RGB sample on the column at that frame.

Output .scf format (see styles/strip_column.h):
  - One 512-byte record per frame; record i = frame i.
  - First (source_height * 3) bytes: RGB8 row-major for that frame's column
    (row 0 hilt … row source_height-1 tip); remainder zero-padded.

Example:
  python scripts/scf_from_image.py plasma.png animations/plasma.scf
  python scripts/scf_from_image.py strip.bmp out.scf --height 144
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

RECORD_SIZE = 512
MAX_SOURCE_HEIGHT = 170


def load_rgb_image(path: Path):
    try:
        from PIL import Image
    except ImportError:
        sys.stderr.write(
            "Pillow is required: pip install pillow\n"
        )
        sys.exit(1)

    img = Image.open(path)
    if img.mode not in ("RGB", "RGBA", "L", "P"):
        img = img.convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")
    return img


def column_bytes_for_frame(pixels, width: int, height: int, frame_x: int, source_height: int) -> bytes:
    """Extract one vertical column (hilt=row 0) as RGB row-major bytes."""
    out = bytearray(source_height * 3)
    for row in range(source_height):
        r, g, b = pixels[frame_x, row]
        i = row * 3
        out[i] = r
        out[i + 1] = g
        out[i + 2] = b
    return bytes(out)


def write_scf(pixels, width: int, img_height: int, source_height: int, out_path: Path) -> None:
    if source_height > MAX_SOURCE_HEIGHT:
        sys.stderr.write(
            f"warning: source_height {source_height} exceeds {MAX_SOURCE_HEIGHT}; "
            f"strip_column will clamp (see strip_column.h).\n"
        )
    if source_height > img_height:
        sys.stderr.write(
            f"error: --height {source_height} is taller than image height {img_height}.\n"
        )
        sys.exit(1)

    with out_path.open("wb") as f:
        for frame_x in range(width):
            col = column_bytes_for_frame(pixels, width, img_height, frame_x, source_height)
            if len(col) > RECORD_SIZE:
                sys.stderr.write(
                    f"error: source_height {source_height} needs {len(col)} bytes "
                    f"(max {RECORD_SIZE}).\n"
                )
                sys.exit(1)
            f.write(col)
            f.write(b"\x00" * (RECORD_SIZE - len(col)))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a .scf strip-column file from a PNG or BMP image.",
        epilog=(
            "Image: width = frame count, height = blade column (hilt=top, tip=bottom). "
            "Or save 24-bit BMP directly for strip_column on SD (no .scf). "
            "Copy the file to SD and reference it in strip_column <path> <source_height> …"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Input PNG or BMP (24-bit RGB)")
    parser.add_argument("output", type=Path, help="Output .scf path")
    parser.add_argument(
        "--height",
        type=int,
        default=None,
        metavar="N",
        help=(
            f"source_height for the file (default: full image height; max useful {MAX_SOURCE_HEIGHT})"
        ),
    )
    args = parser.parse_args()

    if not args.input.is_file():
        sys.stderr.write(f"error: input not found: {args.input}\n")
        sys.exit(1)

    img = load_rgb_image(args.input)
    width, img_height = img.size
    if width < 1 or img_height < 1:
        sys.stderr.write("error: image must be at least 1×1.\n")
        sys.exit(1)

    source_height = args.height if args.height is not None else img_height
    if source_height < 1:
        sys.stderr.write("error: --height must be >= 1.\n")
        sys.exit(1)

    pixels = img.load()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_scf(pixels, width, img_height, source_height, args.output)

    print(
        f"Wrote {args.output}: {width} frame(s), source_height={source_height}, "
        f"{width * RECORD_SIZE} bytes."
    )


if __name__ == "__main__":
    main()
