#!/usr/bin/env python3
"""Build the ACC 雏鹰计划 3.0 course guide PDF.

Keeps guide.md readable by leaving the ACC jersey artwork out of the prose.
Decoration tokens are substituted here for inline base64 data URIs, because the
make-pdf renderer resolves data URIs but not relative image paths.

Tokens understood in guide.md:
    {{MARK:<name>[:<width_px>]}}  centred jersey symbol from assets/<name>.svg
    {{BAND}}                      vermilion waist-transition divider band

Usage:
    python3 docs/programs/eaglet-3.0/build-pdf.py [output.pdf]
"""
from __future__ import annotations

import base64
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets"
GUIDE = HERE / "guide.md"

MAKE_PDF = Path.home() / ".claude/skills/gstack/make-pdf/dist/pdf"

DEFAULT_MARK_WIDTH = 86
BAND_ASSET = "waist-transition-front-traced"

_MARK_RE = re.compile(r"\{\{MARK:([a-z0-9-]+)(?::(\d+))?\}\}")


def _data_uri(name: str) -> str:
    """Return an SVG asset as a base64 data URI."""
    path = ASSETS / f"{name}.svg"
    if not path.is_file():
        raise SystemExit(f"Missing SVG asset: {path}")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _mark(name: str, width: int) -> str:
    """Centred decorative symbol, sized down and muted so it stays a garnish."""
    return (
        '<p style="text-align:center;margin:2.2em 0 1.4em">'
        f'<img src="{_data_uri(name)}" width="{width}" '
        'style="opacity:0.85" alt="" />'
        "</p>"
    )


def _band() -> str:
    """Section divider: the jersey's vermilion waist transition, cropped to its
    brushed top edge. The full graphic is a solid block — at any size that reads
    as a red slab on the page, so only the textured edge is shown."""
    return (
        '<div style="text-align:center;margin:2.4em 0">'
        '<div style="display:inline-block;width:170px;height:15px;'
        'overflow:hidden;line-height:0">'
        f'<img src="{_data_uri(BAND_ASSET)}" width="170" '
        'style="opacity:0.85;margin-top:-5px" alt="" />'
        "</div></div>"
    )


def render(markdown: str) -> str:
    """Substitute every decoration token with inline artwork."""
    out = _MARK_RE.sub(
        lambda m: _mark(m.group(1), int(m.group(2) or DEFAULT_MARK_WIDTH)),
        markdown,
    )
    return out.replace("{{BAND}}", _band())


def main() -> None:
    if not GUIDE.is_file():
        raise SystemExit(f"Missing guide source: {GUIDE}")
    if not MAKE_PDF.is_file():
        raise SystemExit(
            f"make-pdf binary not found at {MAKE_PDF}. "
            "Run './setup' in the gstack repo first."
        )

    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE / "ACC-雏鹰计划-3.0-课程指南.pdf"

    built = HERE / ".guide.built.md"
    built.write_text(render(GUIDE.read_text(encoding="utf-8")), encoding="utf-8")

    try:
        subprocess.run(
            [
                str(MAKE_PDF),
                "generate",
                "--cover",
                "--toc",
                "--no-confidential",
                "--title", "ACC 雏鹰计划 3.0",
                "--author", "Across Cycling Club · München",
                str(built),
                str(output),
            ],
            check=True,
        )
    finally:
        built.unlink(missing_ok=True)

    print(f"\nBuilt: {output}")


if __name__ == "__main__":
    main()
