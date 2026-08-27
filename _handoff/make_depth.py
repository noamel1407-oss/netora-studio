#!/usr/bin/env python3
"""
Generate depth maps for the Netora frames.

Output convention used by the renderer:
    white = nearest to camera, black = farthest.

Install (once):
    pip install torch torchvision transformers pillow

Run:
    python make_depth.py hero.png
    python make_depth.py frames/*.png -o depth/

The first run downloads the model (~100 MB for Small, ~400 MB for Base).
Small is enough for this; switch to Base if fine detail at building
edges looks mushy.
"""

import argparse
import pathlib
import sys

MODEL_SMALL = "depth-anything/Depth-Anything-V2-Small-hf"
MODEL_BASE = "depth-anything/Depth-Anything-V2-Base-hf"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+", help="input image files")
    ap.add_argument("-o", "--outdir", default=".", help="output directory")
    ap.add_argument("--base", action="store_true", help="use the Base model")
    ap.add_argument(
        "--blur",
        type=float,
        default=1.5,
        help="gaussian blur radius on the depth map; softens the "
        "stretched triangles at depth edges. 0 disables.",
    )
    args = ap.parse_args()

    try:
        import numpy as np
        import torch
        from PIL import Image, ImageFilter
        from transformers import pipeline
    except ImportError as e:
        print(f"missing dependency: {e}")
        print("pip install torch torchvision transformers pillow")
        return 1

    device = (
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"device: {device}")

    pipe = pipeline(
        task="depth-estimation",
        model=MODEL_BASE if args.base else MODEL_SMALL,
        device=device,
    )

    outdir = pathlib.Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    for path in args.images:
        src = pathlib.Path(path)
        if not src.exists():
            print(f"skip (not found): {src}")
            continue

        img = Image.open(src).convert("RGB")
        result = pipe(img)

        # Depth Anything returns relative INVERSE depth: larger = nearer.
        arr = np.asarray(result["depth"], dtype=np.float32)
        lo, hi = float(arr.min()), float(arr.max())
        arr = (arr - lo) / (hi - lo + 1e-8)          # 0..1, 1 = nearest
        depth = Image.fromarray((arr * 255).astype("uint8"), mode="L")

        if depth.size != img.size:
            depth = depth.resize(img.size, Image.BICUBIC)
        if args.blur > 0:
            depth = depth.filter(ImageFilter.GaussianBlur(args.blur))

        out = outdir / f"{src.stem}-depth.png"
        depth.save(out)
        print(f"{src.name}  ->  {out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
