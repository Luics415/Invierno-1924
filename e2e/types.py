"""Shared types and opaque-box constants for the R1–R5 E2E suite."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

TestFn = Callable[[Any, str, dict[str, Any]], str]


@dataclass(frozen=True)
class TestCase:
    test_id: str
    feature: str
    description: str
    fn: TestFn


# (width, height, is_mobile, dpr)
VIEWPORTS: dict[str, tuple[int, int, bool, float]] = {
    "desktop_xl": (1440, 900, False, 1.0),
    "desktop": (1280, 800, False, 1.0),
    "tablet_lg": (1024, 768, False, 1.0),
    "mobile": (375, 812, True, 2.0),
    "mobile_sm": (360, 740, True, 2.0),
}

STORAGE_KEY = "villa-acebo-game-storage"

TOTAL_DAYS = 30
TOTAL_ACTS = 5
DAYS_PER_ACT = 6
TOTAL_SUSPECTS = 74
TOTAL_WEAPONS = 18
TOTAL_ROOMS = 9

PUZZLE_TYPES_R4: tuple[str, ...] = (
    "sudoku",
    "wordsearch",
    "murdoku",
    "syllables",
    "cryptogram",
    "crossword",
    "futoshiki",
    "connections",
    "nonogram",
    "minesweeper",
)

FORBIDDEN_LEGACY_PUZZLES: tuple[str, ...] = ("between-lines",)

FORBIDDEN_LEGACY_STRINGS: tuple[str, ...] = (
    "Justo Segura",
    "Sospechosos Principales",
    "Círculo Central",
    "Círculo Íntimo Central",
    "24 Campanadas",
    "Entreletras",
)

DETECTIVE_PORTRAITS: tuple[str, ...] = (
    "detective-angry.png",
    "detective-happy.png",
    "detective-scared.png",
    "detective-thinking.png",
    "detective-worried.png",
)

BACKGROUND_IMAGES: tuple[str, ...] = (
    "background-1.png",
    "background-2.png",
    "background-3.png",
    "background-4.png",
)
