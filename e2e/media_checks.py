"""Pillow 12.2.0 media validation, R5 zero-emoji checks, and legacy cleanup checks."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

from PIL import Image

from .types import BACKGROUND_IMAGES, DETECTIVE_PORTRAITS, TOTAL_SUSPECTS

# Covers R5 Unicode emoji blocks + regional/enclosed + playing cards/mahjong + CJK enclosed + keycap + variation selector / ZWJ
EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001F0FF"
    "\U0001F100-\U0001F2FF"
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U00002300-\U000023FF"
    "\U00002B00-\U00002BFF"
    "\U00003297\U00003299"
    "\U000020E3"
    "\U0000FE0F"
    "\U0000200D"
    "]"
)

LEGACY_ABSENT_PATTERNS: tuple[tuple[str, str], ...] = (
    ("between-lines", "Legacy 'between-lines' puzzle type"),
    ("BetweenLinesPuzzle", "Legacy BetweenLinesPuzzle component reference"),
    ("Justo Segura", "Legacy victim/suspect placeholder 'Justo Segura'"),
    ("Sospechosos Principales", "Legacy privileged 'Sospechosos Principales' label"),
    ("Círculo Central", "Legacy privileged 'Círculo Central' label"),
    ("Círculo Íntimo Central", "Legacy privileged 'Círculo Íntimo Central' label"),
    ("24 Campanadas", "Legacy 24-day title/branding '24 Campanadas'"),
    ("/christmas-bg.jpg", "Legacy background image '/christmas-bg.jpg'"),
    ("App.css", "Unused template App.css reference"),
    ("react.svg", "Unused template react.svg reference"),
    ("vite.svg", "Unused template vite.svg reference"),
)

LEGACY_ABSENT_REGEXES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\.gif\b", re.IGNORECASE), "Legacy .gif portrait/asset reference"),
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_png_asset(path: Path, min_width: int = 64, min_height: int = 64) -> dict[str, Any]:
    """Validate that `path` is a genuine, non-empty, non-corrupt raster PNG/JPEG asset meeting minimum dimensions."""
    path = Path(path)
    if not path.exists() or not path.is_file():
        raise AssertionError(f"Image asset does not exist: {path}")
    size_bytes = path.stat().st_size
    if size_bytes <= 0:
        raise AssertionError(f"Image asset is empty (0 bytes): {path}")

    with Image.open(path) as img:
        fmt = img.format
        if fmt not in ("PNG", "JPEG"):
            raise AssertionError(f"Expected PNG or JPEG raster format for {path.name}, got {fmt!r}")
        width, height = img.size
        if width < min_width or height < min_height:
            raise AssertionError(
                f"Image {path.name} resolution {width}x{height} is smaller than {min_width}x{min_height}"
            )

    with Image.open(path) as img_verify:
        img_verify.verify()

    return {
        "path": str(path),
        "filename": path.name,
        "format": fmt,
        "width": width,
        "height": height,
        "size_bytes": size_bytes,
        "sha256": sha256_file(path),
    }


def validate_all_portraits_and_backgrounds(public_dir: Path) -> dict[str, Any]:
    """Verify all 74 suspect PNGs (01-*..74-*), 5 Azlynn PNGs, 4 backgrounds, and zero .gif files."""
    portraits_dir = Path(public_dir) / "portraits"
    if not portraits_dir.exists():
        raise AssertionError(f"Portraits directory missing: {portraits_dir}")

    gif_files = sorted(p.name for p in portraits_dir.glob("*.gif"))
    if gif_files:
        raise AssertionError(f"Unexpected legacy .gif files in {portraits_dir}: {gif_files}")

    suspect_pngs: list[dict[str, Any]] = []
    missing_numbers: list[int] = []
    duplicate_numbers: dict[int, list[str]] = {}
    for num in range(1, TOTAL_SUSPECTS + 1):
        matches = sorted(portraits_dir.glob(f"{num:02d}-*.png"))
        if not matches:
            missing_numbers.append(num)
            continue
        if len(matches) != 1:
            duplicate_numbers[num] = [m.name for m in matches]
            continue
        suspect_pngs.append(validate_png_asset(matches[0], min_width=64, min_height=64))

    if missing_numbers:
        raise AssertionError(f"Missing suspect portrait PNGs for numbers: {missing_numbers}")
    if duplicate_numbers:
        raise AssertionError(f"Duplicate suspect portrait PNGs found (expected exactly 1 per number): {duplicate_numbers}")

    detective_pngs = [
        validate_png_asset(portraits_dir / fname, min_width=64, min_height=64)
        for fname in DETECTIVE_PORTRAITS
    ]
    background_pngs = [
        validate_png_asset(portraits_dir / fname, min_width=256, min_height=256)
        for fname in BACKGROUND_IMAGES
    ]

    return {
        "suspect_count": len(suspect_pngs),
        "detective_count": len(detective_pngs),
        "background_count": len(background_pngs),
        "suspect_samples": [suspect_pngs[0], suspect_pngs[-1]],
    }


def find_emojis(text: str) -> list[dict[str, Any]]:
    """Return every Unicode emoji match in `text` with codepoint and index."""
    hits: list[dict[str, Any]] = []
    for m in EMOJI_RE.finditer(text):
        ch = m.group(0)
        hits.append(
            {
                "char": ch,
                "codepoint": f"U+{ord(ch):04X}",
                "index": m.start(),
            }
        )
    return hits


def scan_source_for_emojis(project_root: Path) -> list[dict[str, Any]]:
    """Scan `src/` and `index.html` for any forbidden Unicode emojis (R5)."""
    project_root = Path(project_root)
    files_to_scan: list[Path] = []
    index_html = project_root / "index.html"
    if index_html.exists():
        files_to_scan.append(index_html)

    src_dir = project_root / "src"
    if src_dir.exists():
        for p in sorted(src_dir.rglob("*")):
            if p.is_file() and p.suffix.lower() in {".ts", ".tsx", ".js", ".jsx", ".css", ".html"}:
                files_to_scan.append(p)

    violations: list[dict[str, Any]] = []
    for fpath in files_to_scan:
        content = fpath.read_text(encoding="utf-8", errors="replace")
        for line_no, line in enumerate(content.splitlines(), start=1):
            matches = find_emojis(line)
            if matches:
                violations.append(
                    {
                        "file": str(fpath.relative_to(project_root)),
                        "line": line_no,
                        "matches": matches,
                        "snippet": line.strip()[:120],
                    }
                )
    return violations


def verify_legacy_absent(project_root: Path) -> dict[str, Any]:
    """Verify legacy `BetweenLinesPuzzle.tsx`, `App.css`, SVGs, and pre-redesign labels are absent from `src/`."""
    project_root = Path(project_root)
    violations: list[dict[str, Any]] = []

    src_dir = project_root / "src"
    for forbidden_file in (
        src_dir / "components" / "puzzles" / "BetweenLinesPuzzle.tsx",
        src_dir / "App.css",
        src_dir / "assets" / "react.svg",
        src_dir / "assets" / "vite.svg",
    ):
        if forbidden_file.exists():
            violations.append(
                {
                    "file": str(forbidden_file.relative_to(project_root)),
                    "reason": "Forbidden legacy/template file still exists",
                }
            )

    scan_files: list[Path] = []
    if (project_root / "index.html").exists():
        scan_files.append(project_root / "index.html")
    if src_dir.exists():
        for p in sorted(src_dir.rglob("*")):
            if p.is_file() and p.suffix.lower() in {".ts", ".tsx", ".js", ".jsx", ".css", ".html"}:
                scan_files.append(p)

    for fpath in scan_files:
        text = fpath.read_text(encoding="utf-8", errors="replace")
        for needle, reason in LEGACY_ABSENT_PATTERNS:
            if needle in text:
                violations.append(
                    {
                        "file": str(fpath.relative_to(project_root)),
                        "needle": needle,
                        "reason": reason,
                    }
                )
        for regex, reason in LEGACY_ABSENT_REGEXES:
            m = regex.search(text)
            if m:
                violations.append(
                    {
                        "file": str(fpath.relative_to(project_root)),
                        "needle": m.group(0),
                        "reason": reason,
                    }
                )

    return {"clean": len(violations) == 0, "violations": violations}
