"""Opaque-box DOM readers, negative-rule verifiers, and genuine pure-Python solvers for all 10 R4 minigames."""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any

from .app_helpers import (
    _is_visible_js,
    click_button_by_text,
    close_advent_calendar,
    get_advent_calendar_info,
    go_to_day,
)
from .cdp_client import ChromeCDPClient
from .types import FORBIDDEN_LEGACY_PUZZLES, PUZZLE_TYPES_R4, TOTAL_DAYS

# Spanish label -> canonical R4 PuzzleType mapping
PUZZLE_LABEL_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\bsudoku\b", "sudoku"),
    (r"sopa\s+de\s+letras", "wordsearch"),
    (r"\bmurdoku\b", "murdoku"),
    (r"s[íi]labas|palabras\s+clave", "syllables"),
    (r"criptograma|criptograf", "cryptogram"),
    (r"crucigrama", "crossword"),
    (r"futoshiki", "futoshiki"),
    (r"connections|conexiones", "connections"),
    (r"nonograma", "nonogram"),
    (r"buscaminas", "minesweeper"),
)

# Common Spanish mystery/general lexicon for cryptogram & crossword pattern solvers
SPANISH_LEXICON: tuple[str, ...] = (
    "EL", "LA", "LOS", "LAS", "UN", "UNA", "DE", "DEL", "EN", "CON", "POR", "PARA", "SIN", "SOBRE",
    "ENTRE", "HASTA", "DESDE", "QUE", "QUIEN", "COMO", "DONDE", "CUANDO", "NO", "SI", "MAS", "PERO",
    "SU", "SUS", "MI", "TU", "ES", "FUE", "ERA", "SON", "ESTA", "ESTE", "ESTO", "ESE", "ESA",
    "AL", "LO", "SE", "LE", "ME", "TE", "NOS", "YA", "MUY", "TODO", "TODA", "NADA", "NADIE",
    "ALGUIEN", "OTRO", "OTRA", "MISMO", "MISMA", "SOLO", "SOLA", "BAJO", "TRAS", "ANTE",
    "CRIMEN", "ASESINO", "ASESINA", "ASESINATO", "HOMICIDIO", "VICTIMA", "SOSPECHOSO", "SOSPECHOSA",
    "CUCHILLO", "VENENO", "PUÑAL", "DAGA", "CUERDA", "SOGA", "PISTOLA", "REVOLVER", "CANDELABRO",
    "ATIZADOR", "ABRIDOR", "TIJERAS", "ESTATUILLA", "ESCALPELO", "CORTE", "HERIDA", "SANGRE",
    "BIBLIOTECA", "COMEDOR", "COCINA", "SOTANO", "DESPACHO", "SALON", "GALERIA", "DORMITORIO",
    "INVERNADERO", "BODEGA", "CAPITA", "TORRE", "ESCALERA", "PASILLO", "CHIMENEA", "VENTANA",
    "PUERTA", "LLAVE", "CERRADURA", "CERROJO", "VENDA", "GUANTE", "GUANTES", "HUELLA", "HUELLAS",
    "PISTA", "PISTAS", "PRUEBA", "PRUEBAS", "COARTADA", "MOTIVO", "HERENCIA", "TESTAMENTO",
    "SECRETO", "SILENCIO", "SOMBRA", "SOMBRAS", "NOCHE", "NIEVE", "INVIERNO", "NAVIDAD",
    "VILLA", "ACEBO", "MANSION", "DETECTIVE", "AZLYNN", "ARTURO", "VALDEMAR", "RELOJ",
    "CAMPANA", "CAMPANADA", "MEDIANOCHE", "CARTA", "SOBRE", "TINTA", "PAPEL", "DIARIO",
    "VENDAJE", "FRASCO", "BOTELLA", "COPA", "VINO", "CENIZA", "POLVO", "BARRO", "HIELO",
    "METAL", "PLATA", "HIERRO", "BRONCE", "CRISTAL", "MADERA", "PIEDRA", "MARMOL",
    "CULPABLE", "INOCENTE", "MENTIRA", "VERDAD", "TRAICION", "VENGANZA", "CHANTAJE", "DEUDA",
    "DINERO", "JOYAS", "ANILLO", "COLLAR", "MALETA", "ABRIGO", "SOMBRERO", "BASTON",
    "MEDICO", "MAYORDOMO", "DONCELLA", "COCINERO", "JARDINERO", "ABOGADO", "NOTARIO",
    "TENIA", "ESTABA", "ESTUVO", "SALIO", "ENTRO", "OCULTO", "ESCONDIO", "MATO", "GOLPEO",
    "ESTRANGULO", "ENVENENO", "APUÑALO", "CAYO", "MURIO", "GRITO", "CORRIO", "VIO", "OYO",
    "CLAUSTROFOBIA", "ESTRANGULAMIENTO", "AJUSTE", "CUENTAS", "INEVITABLE", "IRREVOCABLE",
    "OSCURIDAD", "TORMENTA", "VENTISCA", "MISTERIO", "EXPEDIENTE", "VEREDICTO", "JUICIO",
)


def normalize_es(text: str) -> str:
    """Uppercase and strip Spanish diacritics except Ñ (kept distinct when needed)."""
    s = text.strip().upper()
    out = []
    for ch in s:
        if ch in ("Ñ", "ñ"):
            out.append("Ñ")
        else:
            decomposed = unicodedata.normalize("NFD", ch)
            out.append("".join(c for c in decomposed if unicodedata.category(c) != "Mn"))
    return "".join(out)


def classify_puzzle_label(label: str) -> str | None:
    low = label.lower()
    for bad in FORBIDDEN_LEGACY_PUZZLES:
        if bad in low:
            raise AssertionError(f"Forbidden legacy puzzle detected: {label!r}")
    if "entreletras" in low:
        raise AssertionError(f"Forbidden legacy puzzle 'Entreletras' detected: {label!r}")
    for pat, ptype in PUZZLE_LABEL_PATTERNS:
        if re.search(pat, low):
            return ptype
    return None


def detect_active_puzzle_type(client: ChromeCDPClient) -> str:
    """Inspect section.page-recto in DOM to determine which of the 10 R4 puzzle types is active."""
    info = client.eval_js(
        """
        (() => {
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const text = (recto.innerText || '').trim();
          const dataType = recto.querySelector('[data-puzzle-type]')?.getAttribute('data-puzzle-type') || '';
          const heading = Array.from(recto.querySelectorAll('h2, h3, h4, span')).slice(0, 8)
            .map(e => (e.innerText || '').trim()).join(' | ');
          return { text: text.slice(0, 800), dataType, heading };
        })()
        """
    )
    if not info:
        raise AssertionError("No active puzzle section found in <main>")
    if info["dataType"]:
        dt = info["dataType"].strip().lower()
        if dt in FORBIDDEN_LEGACY_PUZZLES:
            raise AssertionError(f"Forbidden legacy puzzle type in DOM: {dt}")
        if dt in PUZZLE_TYPES_R4:
            return dt
    for candidate in (info["heading"], info["text"]):
        classified = classify_puzzle_label(candidate)
        if classified:
            return classified
    raise AssertionError(f"Could not classify active R4 puzzle from recto: {info['heading']!r}")


def discover_all_10_puzzle_days(client: ChromeCDPClient) -> dict[str, list[int]]:
    """Open AdventCalendar, verify 30 days + zero Entreletras, and return {puzzle_type: [days...]}."""
    cal = get_advent_calendar_info(client)
    # Click 'Todos' inside AdventCalendar modal if filtered
    try:
        click_button_by_text(client, "Todos", scope_selector=".fixed.inset-0")
        client.drain_events(0.15)
        cal = get_advent_calendar_info(client)
    except AssertionError:
        pass

    by_type: dict[str, list[int]] = {pt: [] for pt in PUZZLE_TYPES_R4}
    seen_days: set[int] = set()
    for card in cal["cards"]:
        day = int(card["day"])
        seen_days.add(day)
        pt = classify_puzzle_label(card["text"])
        if pt is None:
            raise AssertionError(f"Day {day} card in AdventCalendar has unknown puzzle label: {card['text']!r}")
        by_type[pt].append(day)

    close_advent_calendar(client)

    if len(seen_days) != TOTAL_DAYS:
        raise AssertionError(f"Expected {TOTAL_DAYS} days in AdventCalendar, found {len(seen_days)}: {sorted(seen_days)}")
    missing = [pt for pt, days in by_type.items() if not days]
    if missing:
        raise AssertionError(f"Missing R4 puzzle types in 30-day campaign: {missing} (found: {by_type})")
    return by_type


# ---------------------------------------------------------------------------
# Pure-Python Mathematical & Logical Solvers (independently unit-testable)
# ---------------------------------------------------------------------------

def solve_sudoku_9x9(board: list[list[int]]) -> list[list[int]]:
    """Solve a 9x9 Sudoku (3x3 blocks) using MRV backtracking."""
    if len(board) != 9 or any(len(row) != 9 for row in board):
        raise ValueError("Sudoku board must be 9x9")
    grid = [row[:] for row in board]
    rows = [0] * 9
    cols = [0] * 9
    boxes = [0] * 9
    empties: list[tuple[int, int]] = []

    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            if isinstance(v, bool) or not isinstance(v, int):
                raise ValueError(f"Invalid Sudoku digit {v} at ({r},{c})")
            if v == 0:
                empties.append((r, c))
            else:
                if not (1 <= v <= 9):
                    raise ValueError(f"Invalid Sudoku digit {v} at ({r},{c})")
                bit = 1 << v
                b = (r // 3) * 3 + (c // 3)
                if (rows[r] & bit) or (cols[c] & bit) or (boxes[b] & bit):
                    raise ValueError(f"Conflicting initial Sudoku digit {v} at ({r},{c})")
                rows[r] |= bit
                cols[c] |= bit
                boxes[b] |= bit

    ALL_MASK = 0b1111111110  # bits 1..9

    def backtrack(remaining: list[tuple[int, int]]) -> bool:
        if not remaining:
            return True
        # Pick cell with fewest candidates (MRV)
        best_idx = -1
        best_cands = 0
        best_count = 10
        for idx, (r, c) in enumerate(remaining):
            b = (r // 3) * 3 + (c // 3)
            used = rows[r] | cols[c] | boxes[b]
            cands = ALL_MASK & ~used
            cnt = cands.bit_count()
            if cnt == 0:
                return False
            if cnt < best_count:
                best_count = cnt
                best_cands = cands
                best_idx = idx
                if cnt == 1:
                    break

        r, c = remaining.pop(best_idx)
        b = (r // 3) * 3 + (c // 3)
        for v in range(1, 10):
            bit = 1 << v
            if best_cands & bit:
                grid[r][c] = v
                rows[r] |= bit
                cols[c] |= bit
                boxes[b] |= bit
                if backtrack(remaining):
                    return True
                rows[r] &= ~bit
                cols[c] &= ~bit
                boxes[b] &= ~bit
                grid[r][c] = 0
        remaining.insert(best_idx, (r, c))
        return False

    if not backtrack(empties):
        raise ValueError("Sudoku 9x9 has no valid solution")
    return grid


def find_words_in_grid(
    grid: list[list[str]],
    words: list[str],
) -> dict[str, tuple[tuple[int, int], tuple[int, int]]]:
    """Locate each word in an RxC character grid across all 8 directions."""
    if not grid or not grid[0]:
        raise ValueError("Empty WordSearch grid")
    R, C = len(grid), len(grid[0])
    norm_grid = [[normalize_es(cell) for cell in row] for row in grid]
    dirs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    found: dict[str, tuple[tuple[int, int], tuple[int, int]]] = {}

    for raw_word in words:
        w = re.sub(r"\s+", "", normalize_es(raw_word))
        if not w:
            continue
        match_span: tuple[tuple[int, int], tuple[int, int]] | None = None
        for r in range(R):
            for c in range(C):
                if norm_grid[r][c] != w[0]:
                    continue
                for dr, dc in dirs:
                    er = r + dr * (len(w) - 1)
                    ec = c + dc * (len(w) - 1)
                    if not (0 <= er < R and 0 <= ec < C):
                        continue
                    if all(norm_grid[r + dr * k][c + dc * k] == w[k] for k in range(len(w))):
                        match_span = ((r, c), (er, ec))
                        break
                if match_span:
                    break
            if match_span:
                break
        if not match_span:
            raise ValueError(f"Word {raw_word!r} not found in {R}x{C} grid")
        found[raw_word] = match_span
    return found


def solve_murdoku_csp(
    rows: list[str],
    cols: list[str],
    constraints: list[dict[str, Any]],
) -> dict[str, str]:
    """
    Solve a bijection Murdoku grid (len(rows) == len(cols)) given constraints:
    - {"type": "eq", "row": r, "col": c}
    - {"type": "neq", "row": r, "col": c}
    Returns {row_name: col_name}.
    """
    if len(rows) != len(cols):
        raise ValueError("Murdoku rows and cols must have equal length")
    allowed: dict[str, set[str]] = {r: set(cols) for r in rows}
    for con in constraints:
        ctype = con["type"]
        r = con["row"]
        c = con["col"]
        if r not in allowed:
            raise ValueError(f"Unknown Murdoku row: {r}")
        if c not in cols:
            raise ValueError(f"Unknown Murdoku col: {c}")
        if ctype == "eq":
            allowed[r] &= {c}
            for other in rows:
                if other != r:
                    allowed[other].discard(c)
        elif ctype == "neq":
            allowed[r].discard(c)
        else:
            raise ValueError(f"Unknown Murdoku constraint type: {ctype}")

    assignment: dict[str, str] = {}
    used_cols: set[str] = set()
    ordered_rows = sorted(rows, key=lambda x: len(allowed[x]))

    def backtrack(idx: int) -> bool:
        if idx == len(ordered_rows):
            return True
        r = ordered_rows[idx]
        for c in sorted(allowed[r]):
            if c in used_cols:
                continue
            assignment[r] = c
            used_cols.add(c)
            if backtrack(idx + 1):
                return True
            used_cols.remove(c)
            del assignment[r]
        return False

    if not backtrack(0):
        raise ValueError("Murdoku CSP has no valid bijection solution")
    return assignment


def _match_murdoku_entities(text: str, norm_map: dict[str, str]) -> list[str]:
    """Match entity names longest-first with span masking so 'Salón' never collides inside 'Salón Principal'."""
    used_spans: list[tuple[int, int]] = []
    matched: list[tuple[int, str]] = []
    for k in sorted(norm_map.keys(), key=lambda s: (-len(s), s)):
        for m in re.finditer(rf"\b{re.escape(k)}\b", text):
            s, e = m.start(), m.end()
            if any(not (e <= us or s >= ue) for us, ue in used_spans):
                continue
            used_spans.append((s, e))
            matched.append((s, norm_map[k]))
    matched.sort(key=lambda item: item[0])
    return list(dict.fromkeys(orig for _, orig in matched))


def parse_spanish_murdoku_clues(
    rows: list[str],
    cols: list[str],
    clue_texts: list[str],
) -> list[dict[str, Any]]:
    """Extract eq/neq constraints from Spanish Murdoku clue sentences (longest-match, clause-aware)."""
    constraints: list[dict[str, Any]] = []
    norm_rows = {normalize_es(r): r for r in rows}
    norm_cols = {normalize_es(c): c for c in cols}
    clause_split_re = re.compile(r"[,;]+|\b(?:pero|sino|aunque|mientras\s+que)\b|\by\s+(?=no\b)", re.IGNORECASE)
    neg_re = re.compile(
        r"\b(no|ni|nunca|jamas|tampoco|ningun[oa]?|lejos\s+de(?:l)?|ausente\s+de(?:l)?|"
        r"fuera\s+de(?:l)?|apartad[oa]\s+de(?:l)?|evit[oa]|descart[oa])\b",
        re.IGNORECASE,
    )

    for raw in clue_texts:
        n = normalize_es(raw)
        clauses = [cl.strip() for cl in clause_split_re.split(n) if cl.strip()]
        pending_rows: list[str] = []
        last_rows: list[str] = []

        for clause in clauses:
            c_rows = _match_murdoku_entities(clause, norm_rows)
            c_cols = _match_murdoku_entities(clause, norm_cols)
            is_neg = bool(neg_re.search(clause))

            if c_rows and not c_cols:
                for r_name in c_rows:
                    if r_name not in pending_rows:
                        pending_rows.append(r_name)
                continue

            if c_cols and not c_rows:
                effective_rows = list(pending_rows) if pending_rows else list(last_rows)
                if not effective_rows:
                    continue
                pending_rows.clear()
            elif c_rows and c_cols:
                effective_rows = list(dict.fromkeys(pending_rows + c_rows))
                pending_rows.clear()
                last_rows = list(effective_rows)
            else:
                continue

            if is_neg:
                for r_name in effective_rows:
                    for c_name in c_cols:
                        constraints.append({"type": "neq", "row": r_name, "col": c_name})
            elif len(effective_rows) == 1 and len(c_cols) == 1:
                constraints.append({"type": "eq", "row": effective_rows[0], "col": c_cols[0]})

    return constraints


def solve_futoshiki(
    n: int,
    board: list[list[int]],
    inequalities: list[tuple[tuple[int, int], str, tuple[int, int]]],
) -> list[list[int]]:
    """
    Solve an NxN Futoshiki Latin square with pairwise inequalities.
    Each inequality is ((r1, c1), op, (r2, c2)) where op in {'<', '>', '^', 'v', 'V', '∧', '∨'}.
    """
    if len(board) != n or any(len(row) != n for row in board):
        raise ValueError(f"Futoshiki board must be {n}x{n}")
    grid = [row[:] for row in board]
    neighbors: dict[tuple[int, int], list[tuple[str, tuple[int, int]]]] = {
        (r, c): [] for r in range(n) for c in range(n)
    }
    op_map = {"<": "<", ">": ">", "^": "<", "∧": "<", "v": ">", "V": ">", "∨": ">"}
    norm_ineqs: list[tuple[tuple[int, int], str, tuple[int, int]]] = []
    for (r1, c1), raw_op, (r2, c2) in inequalities:
        op = op_map.get(raw_op)
        if op is None:
            raise ValueError(f"Invalid Futoshiki operator: {raw_op}")
        if not (0 <= r1 < n and 0 <= c1 < n and 0 <= r2 < n and 0 <= c2 < n):
            raise ValueError(f"Futoshiki inequality out of bounds: {(r1, c1)} {raw_op} {(r2, c2)}")
        if (r1, c1) == (r2, c2):
            raise ValueError(f"Futoshiki self-inequality is impossible: {(r1, c1)} {raw_op} {(r2, c2)}")
        norm_ineqs.append(((r1, c1), op, (r2, c2)))
        neighbors[(r1, c1)].append((op, (r2, c2)))
        neighbors[(r2, c2)].append((">" if op == "<" else "<", (r1, c1)))

    # Validate pre-filled cells upfront (range 1..n, row/col uniqueness, pre-filled inequalities)
    for r in range(n):
        row_seen: set[int] = set()
        for c in range(n):
            v = grid[r][c]
            if v == 0:
                continue
            if isinstance(v, bool) or not isinstance(v, int) or not (1 <= v <= n):
                raise ValueError(f"Invalid Futoshiki digit {v} at ({r},{c})")
            if v in row_seen:
                raise ValueError(f"Duplicate Futoshiki digit {v} in row {r}")
            row_seen.add(v)
    for c in range(n):
        col_seen: set[int] = set()
        for r in range(n):
            v = grid[r][c]
            if v != 0:
                if v in col_seen:
                    raise ValueError(f"Duplicate Futoshiki digit {v} in col {c}")
                col_seen.add(v)
    for (r1, c1), op, (r2, c2) in norm_ineqs:
        v1, v2 = grid[r1][c1], grid[r2][c2]
        if v1 != 0 and v2 != 0:
            if (op == "<" and not (v1 < v2)) or (op == ">" and not (v1 > v2)):
                raise ValueError(
                    f"Conflicting pre-filled Futoshiki inequality ({r1},{c1})={v1} {op} ({r2},{c2})={v2}"
                )

    def valid_val(r: int, c: int, val: int) -> bool:
        for k in range(n):
            if grid[r][k] == val or grid[k][c] == val:
                return False
        for op, (nr, nc) in neighbors[(r, c)]:
            other = grid[nr][nc]
            if other == 0:
                continue
            if op == "<" and not (val < other):
                return False
            if op == ">" and not (val > other):
                return False
        return True

    empties = [(r, c) for r in range(n) for c in range(n) if grid[r][c] == 0]

    def backtrack() -> bool:
        if not empties:
            return True
        # MRV selection
        best_idx = -1
        best_vals: list[int] = []
        best_cnt = n + 1
        for idx, (r, c) in enumerate(empties):
            vals = [v for v in range(1, n + 1) if valid_val(r, c, v)]
            if not vals:
                return False
            if len(vals) < best_cnt:
                best_cnt = len(vals)
                best_vals = vals
                best_idx = idx
                if best_cnt == 1:
                    break
        r, c = empties.pop(best_idx)
        for v in best_vals:
            grid[r][c] = v
            if backtrack():
                return True
            grid[r][c] = 0
        empties.insert(best_idx, (r, c))
        return False

    if not backtrack():
        raise ValueError("Futoshiki has no valid solution")
    return grid


def _line_possibilities(length: int, clues: list[int]) -> list[tuple[int, ...]]:
    """Generate all valid binary patterns of `length` satisfying nonogram `clues`."""
    if not clues or clues == [0]:
        return [(0,) * length]
    results: list[tuple[int, ...]] = []

    def gen(pos: int, clue_idx: int, cur: list[int]) -> None:
        if clue_idx == len(clues):
            results.append(tuple(cur + [0] * (length - pos)))
            return
        run = clues[clue_idx]
        min_rem = sum(clues[clue_idx:]) + (len(clues) - clue_idx - 1)
        for start in range(pos, length - min_rem + 1):
            nxt = cur + [0] * (start - pos) + [1] * run
            next_pos = start + run
            if clue_idx < len(clues) - 1:
                nxt.append(0)
                next_pos += 1
            gen(next_pos, clue_idx + 1, nxt)

    gen(0, 0, [])
    return results


def solve_nonogram(row_clues: list[list[int]], col_clues: list[list[int]]) -> list[list[int]]:
    """Solve any RxC Nonogram via line propagation + backtracking."""
    R = len(row_clues)
    C = len(col_clues)
    row_opts = [_line_possibilities(C, rc) for rc in row_clues]
    col_opts = [_line_possibilities(R, cc) for cc in col_clues]
    grid: list[list[int | None]] = [[None] * C for _ in range(R)]

    def propagate() -> bool:
        changed = True
        while changed:
            changed = False
            for r in range(R):
                valid = [
                    opt for opt in row_opts[r]
                    if all(grid[r][c] is None or grid[r][c] == opt[c] for c in range(C))
                ]
                if not valid:
                    return False
                row_opts[r] = valid
                for c in range(C):
                    if grid[r][c] is None:
                        v0 = valid[0][c]
                        if all(opt[c] == v0 for opt in valid):
                            grid[r][c] = v0
                            changed = True
            for c in range(C):
                valid = [
                    opt for opt in col_opts[c]
                    if all(grid[r][c] is None or grid[r][c] == opt[r] for r in range(R))
                ]
                if not valid:
                    return False
                col_opts[c] = valid
                for r in range(R):
                    if grid[r][c] is None:
                        v0 = valid[0][r]
                        if all(opt[r] == v0 for opt in valid):
                            grid[r][c] = v0
                            changed = True
        return True

    def backtrack() -> list[list[int]] | None:
        nonlocal row_opts, col_opts, grid
        if not propagate():
            return None
        unresolved = [(r, c) for r in range(R) for c in range(C) if grid[r][c] is None]
        if not unresolved:
            return [[int(grid[r][c] or 0) for c in range(C)] for r in range(R)]
        r, c = unresolved[0]
        saved_grid = [row[:] for row in grid]
        saved_row_opts = [list(x) for x in row_opts]
        saved_col_opts = [list(x) for x in col_opts]
        for guess in (1, 0):
            grid[r][c] = guess
            res = backtrack()
            if res is not None:
                return res
            grid = [row[:] for row in saved_grid]
            row_opts = [list(x) for x in saved_row_opts]
            col_opts = [list(x) for x in saved_col_opts]
        return None

    sol = backtrack()
    if sol is None:
        raise ValueError("Nonogram has no valid solution")
    return sol


def deduce_minesweeper_moves(
    rows: int,
    cols: int,
    board: list[list[Any]],
) -> tuple[set[tuple[int, int]], set[tuple[int, int]]]:
    """
    Given a partially revealed Minesweeper board where:
      - int 0..8 = revealed number
      - '?' = hidden unflagged cell
      - 'F' = flagged mine cell
    Return (safe_cells, mine_cells) deduced by single-tile and subset constraint equations.
    """
    equations: list[tuple[frozenset[tuple[int, int]], int]] = []
    for r in range(rows):
        for c in range(cols):
            val = board[r][c]
            if isinstance(val, bool) or not isinstance(val, int) or val < 0:
                continue
            hidden: set[tuple[int, int]] = set()
            flags = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        nv = board[nr][nc]
                        if nv == "?":
                            hidden.add((nr, nc))
                        elif nv == "F":
                            flags += 1
            rem = val - flags
            if hidden:
                equations.append((frozenset(hidden), rem))

    safe: set[tuple[int, int]] = set()
    mines: set[tuple[int, int]] = set()

    # Single-cell and pairwise subset propagation
    changed = True
    while changed:
        changed = False
        new_eqs: list[tuple[frozenset[tuple[int, int]], int]] = []
        for cells, rem in equations:
            rem_cells = set(cells)
            new_rem = rem
            for m in list(rem_cells & mines):
                rem_cells.remove(m)
                new_rem -= 1
            rem_cells -= safe
            if not rem_cells:
                continue
            if new_rem == 0:
                safe.update(rem_cells)
                changed = True
                continue
            if new_rem == len(rem_cells):
                mines.update(rem_cells)
                changed = True
                continue
            new_eqs.append((frozenset(rem_cells), new_rem))
        equations = list(dict.fromkeys(new_eqs))

        # Subset and overlapping-difference reduction
        added_pairs: list[tuple[frozenset[tuple[int, int]], int]] = []
        for i in range(len(equations)):
            s1, r1 = equations[i]
            for j in range(len(equations)):
                if i == j:
                    continue
                s2, r2 = equations[j]
                if s1 < s2:
                    diff = s2 - s1
                    drem = r2 - r1
                    if drem == 0:
                        safe.update(diff)
                        changed = True
                    elif drem == len(diff):
                        mines.update(diff)
                        changed = True
                    elif 0 < drem < len(diff):
                        pair = (diff, drem)
                        if pair not in equations and pair not in added_pairs:
                            added_pairs.append(pair)
                elif s1 & s2:
                    diff21 = s2 - s1
                    diff12 = s1 - s2
                    if diff21 and (r2 - r1) == len(diff21):
                        mines.update(diff21)
                        if diff12:
                            safe.update(diff12)
                        changed = True
        if added_pairs:
            equations.extend(added_pairs)
            changed = True

    return safe - mines, mines - safe


def solve_cryptogram_bijection(
    cipher_words: list[list[int]],
    fixed_map: dict[int, str],
    extra_lexicon: set[str] | None = None,
) -> dict[int, str]:
    """
    Solve a Spanish numeric substitution cryptogram enforcing strict 1-to-1 bijection.
    `cipher_words` is a list of words where each word is a list of integer cipher codes.
    """
    lexicon = {normalize_es(w) for w in SPANISH_LEXICON}
    if extra_lexicon:
        lexicon |= {normalize_es(w) for w in extra_lexicon}

    by_len: dict[int, list[str]] = {}
    for w in lexicon:
        by_len.setdefault(len(w), []).append(w)

    code_to_char: dict[int, str] = {k: normalize_es(v) for k, v in fixed_map.items()}
    char_to_code: dict[str, int] = {v: k for k, v in code_to_char.items()}
    if len(char_to_code) != len(code_to_char):
        raise ValueError("Initial fixed_map violates 1-to-1 bijection")

    # Deduplicate and sort words most-constrained first (longest / fewest candidates)
    unique_words = sorted(
        {tuple(w) for w in cipher_words if w},
        key=lambda w: (-len(set(w)), -len(w)),
    )

    def candidates_for(cword: tuple[int, ...]) -> list[str]:
        pool = by_len.get(len(cword), [])
        res: list[str] = []
        for cand in pool:
            local_c2ch: dict[int, str] = {}
            local_ch2c: dict[str, int] = {}
            ok = True
            for code, ch in zip(cword, cand):
                mapped_ch = code_to_char.get(code)
                if mapped_ch is None:
                    mapped_ch = local_c2ch.get(code)
                if mapped_ch is not None:
                    if mapped_ch != ch:
                        ok = False
                        break
                else:
                    mapped_code = char_to_code.get(ch)
                    if mapped_code is None:
                        mapped_code = local_ch2c.get(ch)
                    if mapped_code is not None and mapped_code != code:
                        ok = False
                        break
                    local_c2ch[code] = ch
                    local_ch2c[ch] = code
            if ok:
                res.append(cand)
        return res

    def backtrack(idx: int) -> bool:
        if idx == len(unique_words):
            return True
        cword = unique_words[idx]
        for cand in candidates_for(cword):
            added: list[tuple[int, str]] = []
            for code, ch in zip(cword, cand):
                if code not in code_to_char:
                    code_to_char[code] = ch
                    char_to_code[ch] = code
                    added.append((code, ch))
            if backtrack(idx + 1):
                return True
            for code, ch in added:
                del code_to_char[code]
                del char_to_code[ch]
        return False

    if not backtrack(0):
        raise ValueError("Cryptogram bijection solver found no matching lexicon solution")
    return dict(code_to_char)


def solve_crossword_slots(
    slots: list[dict[str, Any]],
    extra_lexicon: set[str] | None = None,
) -> dict[tuple[int, int], str]:
    """
    Solve an intersecting crossword given slots:
      {"cells": [(r, c), ...], "candidates": [str, ...]}
    If "candidates" is omitted, falls back to SPANISH_LEXICON filtered by length.
    """
    lexicon = {normalize_es(w) for w in SPANISH_LEXICON}
    if extra_lexicon:
        lexicon |= {normalize_es(w) for w in extra_lexicon}

    sorted_lex = sorted(lexicon)
    ordered = sorted(slots, key=lambda s: len(s["cells"]))

    def run_solve(enforce_unique: bool) -> dict[tuple[int, int], str] | None:
        grid: dict[tuple[int, int], str] = {}
        used_words: set[str] = set()

        def backtrack(idx: int) -> bool:
            if idx == len(ordered):
                return True
            slot = ordered[idx]
            cells = [tuple(c) for c in slot["cells"]]
            L = len(cells)
            raw_cands = slot.get("candidates")
            pool = raw_cands if raw_cands is not None else [w for w in sorted_lex if len(w) == L]
            for word in pool:
                nw = normalize_es(word)
                if len(nw) != L:
                    continue
                if enforce_unique and nw in used_words:
                    continue
                if all(grid.get(cell, nw[k]) == nw[k] for k, cell in enumerate(cells)):
                    added: list[tuple[int, int]] = []
                    for k, cell in enumerate(cells):
                        if cell not in grid:
                            grid[cell] = nw[k]
                            added.append(cell)
                    used_words.add(nw)
                    if backtrack(idx + 1):
                        return True
                    used_words.remove(nw)
                    for cell in added:
                        del grid[cell]
            return False

        return grid if backtrack(0) else None

    sol = run_solve(True)
    if sol is None:
        sol = run_solve(False)
    if sol is None:
        raise ValueError("Crossword slot solver found no intersecting solution")
    return sol


def solve_syllables_from_bank(
    target_counts: list[int],
    bank: list[str],
    valid_words: set[str] | None = None,
) -> list[list[str]]:
    """Assemble `len(target_counts)` valid Spanish words using exact syllable counts from `bank` (with distractors)."""
    word_source = SPANISH_LEXICON if valid_words is None else valid_words
    lex = {normalize_es(w) for w in word_source}
    used = [False] * len(bank)
    result: list[list[str]] = []

    def build_word(word_idx: int, need_sylls: int, cur_sylls: list[str]) -> bool:
        if need_sylls == 0:
            candidate = normalize_es("".join(cur_sylls))
            if candidate not in lex:
                return False
            result.append(list(cur_sylls))
            if word_idx + 1 == len(target_counts):
                return True
            if build_word(word_idx + 1, target_counts[word_idx + 1], []):
                return True
            result.pop()
            return False

        for i, syl in enumerate(bank):
            if used[i]:
                continue
            used[i] = True
            cur_sylls.append(syl)
            if build_word(word_idx, need_sylls - 1, cur_sylls):
                return True
            cur_sylls.pop()
            used[i] = False
        return False

    if not target_counts:
        return []
    if not build_word(0, target_counts[0], []):
        raise ValueError("Could not assemble target words from syllable bank")
    return result


# ---------------------------------------------------------------------------
# Opaque-Box DOM Puzzle Readers & Interactive Negative/Solve Drivers
# ---------------------------------------------------------------------------

def is_recto_solved(client: ChromeCDPClient) -> bool:
    return bool(
        client.eval_js(
            """
            (() => {
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return false;
              const txt = recto.innerText || '';
              return /lacrado|resuelto con éxito|mensaje cifrado revelado|deducción murdoku verificada|sílabas clave ensambladas|letras sobrantes descifradas|conexiones resueltas|nonograma resuelto|buscaminas despejado|futoshiki resuelto|crucigrama completado/i.test(txt);
            })()
            """
        )
    )


def verify_sudoku_9x9_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Sudoku is strictly 9x9 (81 cells, 3x3 blocks, keypad 1..9), lock & pencil/conflict negative rules."""
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const grids = Array.from(recto.querySelectorAll('.grid')).filter(isVis);
          const boardGrid = grids.find(g => g.children.length === 81) || grids[0];
          if (!boardGrid) return null;
          const cells = Array.from(boardGrid.children).map((el, idx) => {{
            const r = el.getBoundingClientRect();
            const txt = (el.innerText || '').trim();
            const digit = /^[1-9]$/.test(txt) ? parseInt(txt, 10) : 0;
            return {{
              idx,
              row: Math.floor(idx / 9),
              col: idx % 9,
              digit,
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
              className: el.className || ''
            }};
          }});
          const keypad = Array.from(recto.querySelectorAll('button')).filter(b =>
            isVis(b) && !boardGrid.contains(b) && /^[1-9]$/.test((b.innerText || '').trim())
          ).map(b => {{
            const r = b.getBoundingClientRect();
            return {{ digit: parseInt(b.innerText.trim(), 10), disabled: !!b.disabled, x: r.left + r.width / 2, y: r.top + r.height / 2 }};
          }});
          return {{ cellCount: cells.length, cells, keypad }};
        }})()
        """
    )
    if not info or info["cellCount"] != 81:
        raise AssertionError(f"R4 violation: Expected 9x9 Sudoku (81 cells), got {info['cellCount'] if info else None}")
    if len(info["keypad"]) != 9:
        raise AssertionError(f"Expected 9 keypad digits (1..9), got {len(info['keypad'])}")

    # Negative check 1: Pre-filled cell resists overwrite (keypad disabled or digit unchanged)
    prefilled = next((c for c in info["cells"] if c["digit"] != 0), None)
    empty_cell = next(
        (c for c in info["cells"] if c["digit"] == 0 and any(o["row"] == c["row"] and o["digit"] != 0 for o in info["cells"])),
        next((c for c in info["cells"] if c["digit"] == 0), None),
    )
    if not prefilled or not empty_cell:
        raise AssertionError("Sudoku board missing prefilled or empty cells")

    client.click_at(prefilled["x"], prefilled["y"])
    client.drain_events(0.1)
    # Try clicking a different digit on keypad if enabled; prefilled digit must stay unchanged
    other_digit = (prefilled["digit"] % 9) + 1
    kbtn = next((k for k in info["keypad"] if k["digit"] == other_digit), None)
    if kbtn and not kbtn["disabled"]:
        client.click_at(kbtn["x"], kbtn["y"])
        client.drain_events(0.1)
    after_digit = client.eval_js(
        f"""
        (() => {{
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          const g = Array.from(recto.querySelectorAll('.grid')).find(x => x.children.length === 81);
          return g ? (g.children[{prefilled['idx']}].innerText || '').trim() : '';
        }})()
        """
    )
    if str(prefilled["digit"]) != str(after_digit):
        raise AssertionError(f"Prefilled Sudoku cell overwritten: {prefilled['digit']} -> {after_digit}")

    # Negative check 2: Enter a deliberate row conflict on empty_cell -> must remain unsolved
    row_digits = {c["digit"] for c in info["cells"] if c["row"] == empty_cell["row"] and c["digit"] != 0}
    if row_digits:
        conflict_d = next(iter(row_digits))
        client.click_at(empty_cell["x"], empty_cell["y"])
        ckbtn = next(k for k in info["keypad"] if k["digit"] == conflict_d)
        if not ckbtn["disabled"]:
            client.click_at(ckbtn["x"], ckbtn["y"])
            client.drain_events(0.1)
        if is_recto_solved(client):
            raise AssertionError("Sudoku falsely marked solved on conflict digit")
        # Clear cell if needed via Borrar or re-click
        try:
            click_button_by_text(client, "Borrar", scope_selector="main")
        except AssertionError:
            pass

    return info


def solve_sudoku_ui(client: ChromeCDPClient) -> None:
    """Read 9x9 Sudoku from DOM, solve via solve_sudoku_9x9, and click every empty cell + digit."""
    info = verify_sudoku_9x9_and_negative(client)
    board = [[0] * 9 for _ in range(9)]
    for c in info["cells"]:
        board[c["row"]][c["col"]] = c["digit"]
    solution = solve_sudoku_9x9(board)

    # Ensure Tinta (normal) mode if toggle exists
    try:
        click_button_by_text(client, "Tinta", scope_selector="main")
    except AssertionError:
        pass

    keypad_map = {k["digit"]: (k["x"], k["y"]) for k in info["keypad"]}
    for c in info["cells"]:
        if c["digit"] == 0:
            sol_d = solution[c["row"]][c["col"]]
            client.click_at(c["x"], c["y"])
            kx, ky = keypad_map[sol_d]
            client.click_at(kx, ky)

    client.wait_until(
        "/lacrado|sudoku resuelto/i.test((document.querySelector('main section.page-recto') || document.querySelector('main')).innerText)",
        timeout=6.0,
        description="9x9 Sudoku solved",
    )


def verify_wordsearch_and_negative(client: ChromeCDPClient, use_touch: bool = False) -> dict[str, Any]:
    """Verify WordSearch is >=11x11, >=8 words, zero '!', and rejects invalid 2-cell non-word drag."""
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const grids = Array.from(recto.querySelectorAll('.grid')).filter(isVis);
          const board = grids.find(g => g.children.length >= 100) || grids[0];
          if (!board) return null;
          const cells = Array.from(board.children).map((el, idx) => {{
            const r = el.getBoundingClientRect();
            return {{ idx, ch: (el.innerText || '').trim(), x: r.left + r.width / 2, y: r.top + r.height / 2, top: Math.round(r.top) }};
          }});
          const rowGroups = new Map();
          for (const c of cells) {{
            const bucket = Array.from(rowGroups.keys()).find(k => Math.abs(k - c.top) <= 4);
            if (bucket !== undefined) rowGroups.get(bucket).push(c);
            else rowGroups.set(c.top, [c]);
          }}
          const rows = Array.from(rowGroups.entries()).sort((a, b) => a[0] - b[0]).map(e => e[1]);
          let wordEls = Array.from(recto.querySelectorAll('[data-wordsearch-words] span, [data-wordsearch-words] li, [data-wordsearch-word]')).filter(isVis);
          if (!wordEls.length) {{
            const heading = Array.from(recto.querySelectorAll('h2, h3, h4, p, span, div')).find(el =>
              isVis(el)
              && (el.tagName !== 'DIV' || (el.querySelectorAll('div, p, ul, ol, button').length === 0 && (el.innerText || '').trim().length <= 100))
              && /t[eé]rminos\\s+clave|palabras\\s+a\\s+encontrar/i.test(el.innerText || '')
            );
            const wordBox = heading ? heading.parentElement : null;
            const scope = wordBox || recto;
            wordEls = Array.from(scope.querySelectorAll('span, li, div')).filter(el => {{
              if (!isVis(el) || board.contains(el)) return false;
              if (el.children.length > 0) return false;
              if (el.closest('button, h1, h2, h3, h4, header, nav, [role="button"], [data-toolbar]')) return false;
              const t = (el.innerText || '').trim();
              if (/^(PISTA|REINICIAR|BORRAR|LACRADO|AYUDA)$/i.test(t)) return false;
              return /^[A-ZÁÉÍÓÚÜÑ]{{4,20}}$/.test(t);
            }});
          }}
          const words = Array.from(new Set(wordEls.map(e => (e.innerText || '').trim()).filter(t => /^[A-ZÁÉÍÓÚÜÑ]{{4,20}}$/.test(t))));
          return {{
            rowCount: rows.length,
            colCount: rows[0] ? rows[0].length : 0,
            hasBang: cells.some(c => c.ch.includes('!')),
            rows,
            words
          }};
        }})()
        """
    )
    if not info or info["rowCount"] < 11 or info["colCount"] < 11:
        raise AssertionError(f"R4 violation: WordSearch must be >=11x11, got {info['rowCount'] if info else None}x{info['colCount'] if info else None}")
    if info["hasBang"]:
        raise AssertionError("WordSearch contains forbidden '!' filler characters")
    if len(info["words"]) < 8:
        raise AssertionError(f"R4 violation: Expected >=8 words in WordSearch, found {len(info['words'])}: {info['words']}")

    # Negative drag across just 2 cells (too short / non-word) -> stays unsolved
    c0 = info["rows"][0][0]
    c1 = info["rows"][0][1]
    if use_touch:
        client.touch_drag(c0["x"], c0["y"], c1["x"], c1["y"], steps=6)
    else:
        client.drag_mouse(c0["x"], c0["y"], c1["x"], c1["y"], steps=6)
    if is_recto_solved(client):
        raise AssertionError("WordSearch falsely solved by 2-cell non-word drag")
    return info


def solve_wordsearch_ui(client: ChromeCDPClient, use_touch: bool = False) -> None:
    info = verify_wordsearch_and_negative(client, use_touch=use_touch)
    grid_chars = [[cell["ch"] for cell in row] for row in info["rows"]]
    spans = find_words_in_grid(grid_chars, info["words"])
    for word, ((r1, c1), (r2, c2)) in spans.items():
        p1 = info["rows"][r1][c1]
        p2 = info["rows"][r2][c2]
        if use_touch:
            client.touch_drag(p1["x"], p1["y"], p2["x"], p2["y"], steps=12)
        else:
            client.drag_mouse(p1["x"], p1["y"], p2["x"], p2["y"], steps=12)
    client.wait_until(
        "/lacrado|letras sobrantes descifradas/i.test((document.querySelector('main section.page-recto') || document.querySelector('main')).innerText)",
        timeout=6.0,
        description="WordSearch solved",
    )


def _murdoku_grid_js() -> str:
    return f"""
    {_is_visible_js()}
    function readMurdokuGrid(recto) {{
      let cells = Array.from(recto.querySelectorAll('[data-murdoku-cell]')).filter(isVis);
      if (!cells.length) {{
        cells = Array.from(recto.querySelectorAll('td button, .grid button')).filter(b => {{
          if (!isVis(b)) return false;
          if (b.closest('[data-toolbar], header, nav')) return false;
          const txt = (b.innerText || '').trim();
          if (/confirmar|descartar|pista|reiniciar|borrar/i.test(txt)) return false;
          return txt === '' || txt === '·' || txt === '?' || txt === '✓' || txt === '✗' || txt === 'X' || b.hasAttribute('data-state') || !!b.querySelector('svg');
        }});
      }}
      if (!cells.length) {{
        const matrixBox = recto.querySelector('.border-2, table') || recto;
        cells = Array.from(matrixBox.querySelectorAll('div.cursor-pointer, td[role="button"], div[role="button"]')).filter(el => {{
          if (!isVis(el)) return false;
          const txt = (el.innerText || '').trim();
          return txt === '' || txt === '·' || txt === '?' || txt === '✓' || txt === '✗' || txt === 'X' || !!el.querySelector('svg');
        }});
      }}
      const detectState = (el) => {{
        const ds = (el.getAttribute('data-state') || '').toLowerCase();
        if (ds === 'check' || ds === 'cross' || ds === 'question' || ds === 'neutral') return ds;
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (/confirm|check|marca\\s*✓/i.test(aria)) return 'check';
        if (/descart|cross|marca\\s*✗/i.test(aria)) return 'cross';
        if (/duda|\\?/i.test(aria)) return 'question';
        if (el.querySelector('svg.lucide-check, [data-lucide="check"]')) return 'check';
        if (el.querySelector('svg.lucide-x, [data-lucide="x"]')) return 'cross';
        const cls = (el.className || '').toLowerCase();
        if (/emerald/.test(cls)) return 'check';
        if (/crimson/.test(cls)) return 'cross';
        if (/gold/.test(cls)) return 'question';
        const txt = (el.innerText || '').trim();
        if (txt === '✓') return 'check';
        if (txt === '✗' || txt === 'X') return 'cross';
        if (txt === '?') return 'question';
        return 'neutral';
      }};
      const parsed = cells.map((el, idx) => {{
        const r = el.getBoundingClientRect();
        return {{
          idx,
          rowAttr: el.getAttribute('data-row'),
          colAttr: el.getAttribute('data-col'),
          state: detectState(el),
          ariaLabel: el.getAttribute('aria-label') || '',
          top: Math.round(r.top),
          left: Math.round(r.left),
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        }};
      }});
      const rowGroups = new Map();
      for (const c of parsed) {{
        const key = c.rowAttr !== null ? 'r:' + c.rowAttr : null;
        if (key !== null) {{
          if (!rowGroups.has(key)) rowGroups.set(key, []);
          rowGroups.get(key).push(c);
        }} else {{
          const bucket = Array.from(rowGroups.keys()).find(k => typeof k === 'number' && Math.abs(k - c.top) <= 4);
          if (bucket !== undefined) rowGroups.get(bucket).push(c);
          else rowGroups.set(c.top, [c]);
        }}
      }}
      const rows = Array.from(rowGroups.entries())
        .sort((a, b) => (a[1][0]?.top || 0) - (b[1][0]?.top || 0))
        .map(e => e[1].sort((c1, c2) => c1.left - c2.left));
      const markedCount = parsed.filter(c => c.state !== 'neutral').length;
      const clues = Array.from(recto.querySelectorAll('li, p')).filter(isVis).map(e => (e.innerText || '').trim()).filter(t => t.length > 10);
      return {{ cellCount: parsed.length, rows, markedCount, cells: parsed, clues }};
    }}
    """


def verify_murdoku_reset_on_mistake(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Murdoku is >=4x4, registers valid marks, and immediately resets the entire board on mistake."""
    def _read_grid() -> dict[str, Any] | None:
        return client.eval_js(
            f"""
            (() => {{
              {_murdoku_grid_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return null;
              return readMurdokuGrid(recto);
            }})()
            """
        )

    info = _read_grid()
    if not info or len(info["rows"]) < 4 or len(info["rows"][0]) < 4:
        raise AssertionError(
            f"R4 violation: Expected >=4x4 Murdoku (>=16 cells in >=4x4 grid), got {info['cellCount'] if info else None} cells"
        )

    has_mode_toggle = bool(
        client.eval_js(
            "(() => { const sc = document.querySelector('main section.page-recto') || document.querySelector('main'); "
            "return sc ? Array.from(sc.querySelectorAll('button')).some(b => /confirmar|descartar/i.test(b.innerText || '')) : false; })()"
        )
    )
    row0 = info["rows"][0]

    # Phase 1: Prove interactive mark registration before triggering mistake reset
    if has_mode_toggle:
        try:
            click_button_by_text(client, "Descartar", scope_selector="main")
        except AssertionError:
            pass
    client.click_at(row0[0]["x"], row0[0]["y"])
    client.drain_events(0.15)
    after_p1 = _read_grid()
    if not after_p1 or after_p1["markedCount"] == 0:
        # row0[0] might have been the solution's 'check' cell and reset on 'cross'; try row0[1]
        client.click_at(row0[1]["x"], row0[1]["y"])
        client.drain_events(0.15)
        after_p1 = _read_grid()
    if not after_p1 or after_p1["markedCount"] < 1:
        raise AssertionError("Murdoku failed to register any initial mark before mistake test")

    # Phase 2: Trigger guaranteed mistake in row 0 -> board must reset to 0 surviving marks
    if has_mode_toggle:
        try:
            click_button_by_text(client, "Confirmar", scope_selector="main")
        except AssertionError:
            pass
        client.click_at(row0[0]["x"], row0[0]["y"])
        client.drain_events(0.15)
        cur = _read_grid()
        if cur and cur["markedCount"] > 0:
            client.click_at(row0[1]["x"], row0[1]["y"])
            client.drain_events(0.15)
    else:
        # Cycle mode: drive row0[0] until reset or 'check', then row0[1] until reset
        for cell_idx in (0, 1):
            for _ in range(3):
                cur = _read_grid()
                if cur and cur["markedCount"] == 0:
                    break
                cstate = cur["rows"][0][cell_idx]["state"] if cur else "neutral"
                if cell_idx == 0 and cstate == "check":
                    break
                client.click_at(row0[cell_idx]["x"], row0[cell_idx]["y"])
                client.drain_events(0.15)
            cur = _read_grid()
            if cur and cur["markedCount"] == 0:
                break

    if is_recto_solved(client):
        raise AssertionError("Murdoku falsely solved after conflicting row clicks")

    # Poll up to 1.2s in case a brief mistake-flash timeout precedes the board wipe
    try:
        client.wait_until(
            f"""
            (() => {{
              {_murdoku_grid_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return false;
              const g = readMurdokuGrid(recto);
              return g.markedCount === 0;
            }})()
            """,
            timeout=1.2,
            poll_interval=0.08,
            description="Murdoku full reset to 0 marks",
        )
    except TimeoutError:
        final_g = _read_grid()
        surviving = [c for c in (final_g["cells"] if final_g else []) if c["state"] != "neutral"]
        raise AssertionError(f"Murdoku did not reset board to 0 marks on mistake; surviving: {surviving}")

    return info


def _cryptogram_extract_slots_js() -> str:
    return f"""
    {_is_visible_js()}
    function extractCryptogramData(recto) {{
      const cheatBtn = Array.from(recto.querySelectorAll('button')).find(b =>
        isVis(b) && /revelar\\s*1\\s*letra|revelar letra/i.test(b.innerText || '')
      );
      const keys = Array.from(recto.querySelectorAll('button')).filter(b =>
        isVis(b) && /^[A-ZÑ]$/.test((b.innerText || '').trim())
      ).map(b => {{
        const r = b.getBoundingClientRect();
        return {{ ch: b.innerText.trim(), disabled: !!b.disabled, x: r.left + r.width / 2, y: r.top + r.height / 2 }};
      }});
      const byAttr = Array.from(recto.querySelectorAll('[data-cipher-code]')).filter(isVis);
      const rawSlots = byAttr.length > 0 ? byAttr : Array.from(recto.querySelectorAll('button, div')).filter(el => {{
        if (!isVis(el) || el.closest('header, nav')) return false;
        if (el.querySelector('[data-cipher-code]')) return false;
        const txt = (el.innerText || '').trim();
        if (/^[A-ZÑ]$/.test(txt)) return false;
        return /^([A-ZÑ\\?\\·•\\-_\\s]*)\\d{{1,2}}$/.test(txt) && txt.length <= 6 && !/\\d{{1,2}}.*\\d{{1,2}}/.test(txt);
      }});
      const slots = rawSlots.map(el => {{
        const r = el.getBoundingClientRect();
        const attrCode = el.getAttribute('data-cipher-code');
        const code = (attrCode !== null && attrCode !== '') ? attrCode : ((el.innerText || '').match(/\\d{{1,2}}/)?.[0] || '');
        const attrLetter = el.getAttribute('data-letter');
        const letter = attrLetter !== null ? attrLetter : ((el.innerText || '').match(/^[A-ZÑ]/)?.[0] || '');
        return {{ code: String(code), letter: letter.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }};
      }}).filter(s => s.code !== '');
      return {{ hasCheatButton: !!cheatBtn, keys, slots }};
    }}
    """


def verify_cryptogram_bijection_and_no_cheat(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Cryptogram has zero unlimited 'Revelar 1 letra' cheat, <=1 initial reveal, and strict 1-to-1 bijection."""
    def _read_crypto() -> dict[str, Any] | None:
        return client.eval_js(
            f"""
            (() => {{
              {_cryptogram_extract_slots_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return null;
              return extractCryptogramData(recto);
            }})()
            """
        )

    info = _read_crypto()
    if not info:
        raise AssertionError("Cryptogram DOM not found in recto")
    if info["hasCheatButton"]:
        raise AssertionError("R4 violation: Cryptogram still exposes unlimited 'Revelar 1 letra' cheat button")
    if not info["slots"]:
        raise AssertionError("Cryptogram rendered 0 cipher slots — cannot verify bijection")
    if len(info["keys"]) < 10:
        raise AssertionError(f"Expected >=10 virtual keyboard keys in Cryptogram, found {len(info['keys'])}")

    initial_revealed_codes = {s["code"] for s in info["slots"] if s["letter"]}
    if len(initial_revealed_codes) > 1:
        raise AssertionError(f"R4 violation: Expected <=1 initial revealed cipher letter, got {initial_revealed_codes}")

    unmapped: list[dict[str, Any]] = []
    seen_codes: set[str] = set()
    for s in info["slots"]:
        if not s["letter"] and s["code"] not in seen_codes:
            seen_codes.add(s["code"])
            unmapped.append(s)
    if len(unmapped) < 2:
        raise AssertionError(f"Expected >=2 distinct unmapped cipher codes to test bijection, found {len(unmapped)}")

    avail_key = next((k for k in info["keys"] if not k["disabled"]), None)
    if not avail_key:
        raise AssertionError("No enabled keyboard letter available to test Cryptogram bijection")

    # Assign avail_key['ch'] to unmapped[0] and verify it actually took effect
    client.click_at(unmapped[0]["x"], unmapped[0]["y"])
    client.click_at(avail_key["x"], avail_key["y"])
    client.drain_events(0.12)

    after_assign = _read_crypto()
    codes_with_ch = {
        s["code"] for s in (after_assign["slots"] if after_assign else []) if s["letter"] == avail_key["ch"]
    }
    if unmapped[0]["code"] not in codes_with_ch:
        raise AssertionError(
            f"Cryptogram failed to assign {avail_key['ch']!r} to cipher code {unmapped[0]['code']!r}"
        )

    # Select a second distinct unmapped code and verify bijection blocks duplicate assignment
    client.click_at(unmapped[1]["x"], unmapped[1]["y"])
    client.drain_events(0.1)
    key_state = client.eval_js(
        f"""
        (() => {{
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          const btn = Array.from(recto.querySelectorAll('button')).find(b => (b.innerText || '').trim() === {json.dumps(avail_key['ch'])});
          return btn ? {{ disabled: !!btn.disabled }} : null;
        }})()
        """
    )
    if key_state is None:
        raise AssertionError(f"Virtual key {avail_key['ch']!r} disappeared during Cryptogram bijection check")
    if not key_state["disabled"]:
        client.click_at(avail_key["x"], avail_key["y"])
        client.drain_events(0.12)
        after_dup = _read_crypto()
        dup_codes = {
            s["code"] for s in (after_dup["slots"] if after_dup else []) if s["letter"] == avail_key["ch"]
        }
        if len(dup_codes) > 1 or unmapped[1]["code"] in dup_codes:
            raise AssertionError(
                f"R4 violation: Cryptogram allowed duplicate letter {avail_key['ch']!r} across cipher codes {sorted(dup_codes)}"
            )

    return info


def verify_syllables_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Syllables ('Palabras clave más largas') has distractor bank (> target slots) and returns wrongly placed syllables."""
    def _read_syllables() -> dict[str, Any] | None:
        return client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return null;
              let bankBtns = Array.from(recto.querySelectorAll('[data-syllable-bank] button')).filter(isVis);
              if (!bankBtns.length) {{
                const heading = Array.from(recto.querySelectorAll('h2, h3, h4, p, span, div')).find(el =>
                  isVis(el)
                  && (el.tagName !== 'DIV' || (el.querySelectorAll('div, p, ul, ol, button').length === 0 && (el.innerText || '').trim().length <= 100))
                  && /banco\\s+de\\s+s[íi]labas/i.test(el.innerText || '')
                );
                const scope = (heading && heading.parentElement) || recto;
                bankBtns = Array.from(scope.querySelectorAll('button')).filter(b => {{
                  if (!isVis(b)) return false;
                  if (b.closest('h1, h2, h3, h4, [data-word-slot], [data-toolbar], .border-b')) return false;
                  const txt = (b.innerText || '').trim();
                  if (/^(pista|reiniciar|borrar|limpiar|ayuda|tinta|l[áa]piz)$/i.test(txt)) return false;
                  return /^[A-ZÁÉÍÓÚÜÑ]{{1,6}}$/i.test(txt);
                }});
              }}
              const mappedBtns = bankBtns.map(b => ({{
                text: (b.innerText || '').trim(),
                disabled: !!b.disabled,
                x: b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2,
                y: b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2
              }}));
              const slots = Array.from(recto.querySelectorAll('[data-syllable-slot], [data-word-slot] button')).filter(isVis);
              const filledSlots = slots.filter(s => (s.innerText || '').trim() !== '' && (s.innerText || '').trim() !== '·').length;
              return {{ bankCount: mappedBtns.length, slotCount: slots.length, filledSlots, bankBtns: mappedBtns, text: (recto.innerText || '').trim() }};
            }})()
            """
        )

    info = _read_syllables()
    if not info or info["bankCount"] < 4:
        raise AssertionError(f"Syllables bank missing or too small: {info}")
    before_count = sum(1 for b in info["bankBtns"] if not b["disabled"])
    before_filled = info["filledSlots"]
    target_btn = next((b for b in info["bankBtns"] if not b["disabled"]), info["bankBtns"][0])
    client.click_at(target_btn["x"], target_btn["y"])
    client.drain_events(0.12)
    if is_recto_solved(client):
        raise AssertionError("Syllables falsely solved after 1 syllable click")
    after = _read_syllables()
    if not after:
        raise AssertionError("Syllables DOM vanished after clicking bank tile")
    after_count = sum(1 for b in after["bankBtns"] if not b["disabled"])
    if after_count >= before_count and after["filledSlots"] <= before_filled:
        raise AssertionError(
            f"Syllables click did not consume bank tile or fill slot: before=({before_count}, {before_filled}), after=({after_count}, {after['filledSlots']})"
        )
    return info


def verify_crossword_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Crossword has grid cells + Horizontales/Verticales clues and stays unsolved on wrong input."""
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const txt = recto.innerText || '';
          const cells = Array.from(recto.querySelectorAll('input, [data-crossword-cell], .grid button')).filter(el => {{
            if (!isVis(el)) return false;
            if (el.disabled) return false;
            if (el.closest('[data-toolbar], header, nav')) return false;
            return true;
          }});
          const first = cells[0] || null;
          const r = first ? first.getBoundingClientRect() : null;
          return {{
            hasAcross: /horizontales/i.test(txt),
            hasDown: /verticales/i.test(txt),
            cellCount: cells.length,
            firstCell: first ? {{
              isInput: first.tagName === 'INPUT',
              x: r.left + r.width / 2,
              y: r.top + r.height / 2
            }} : null
          }};
        }})()
        """
    )
    if not info or not (info["hasAcross"] and info["hasDown"]) or info["cellCount"] < 8:
        raise AssertionError(f"Crossword missing Horizontales/Verticales or grid cells: {info}")
    if info["firstCell"]:
        client.click_at(info["firstCell"]["x"], info["firstCell"]["y"])
        if info["firstCell"]["isInput"]:
            client.insert_text("Z")
        else:
            client.press_key("Z", "KeyZ", 90)
        client.drain_events(0.1)
        if is_recto_solved(client):
            raise AssertionError("Crossword falsely solved after single wrong letter")
    return info


def verify_futoshiki_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Futoshiki has NxN (N>=4) grid, inequality symbols, 1..N keypad, and rejects duplicates."""
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const grids = Array.from(recto.querySelectorAll('.grid')).filter(isVis);
          const boardGrid = grids.find(g => g.querySelectorAll('button, [data-futoshiki-cell]').length >= 16) || grids[0];
          const cellsRaw = Array.from((boardGrid || recto).querySelectorAll('[data-futoshiki-cell], button')).filter(b => {{
            if (!isVis(b)) return false;
            const t = (b.innerText || '').trim();
            return t === '' || /^[1-9]$/.test(t);
          }});
          const cells = cellsRaw.map((b, idx) => {{
            const r = b.getBoundingClientRect();
            const t = (b.innerText || '').trim();
            return {{
              idx,
              digit: /^[1-9]$/.test(t) ? parseInt(t, 10) : 0,
              disabled: !!b.disabled,
              top: Math.round(r.top),
              left: Math.round(r.left),
              x: r.left + r.width / 2,
              y: r.top + r.height / 2
            }};
          }});
          const keypad = Array.from(recto.querySelectorAll('button')).filter(b =>
            isVis(b) && (!boardGrid || !boardGrid.contains(b)) && /^[1-9]$/.test((b.innerText || '').trim())
          ).map(b => ({{
            digit: parseInt((b.innerText || '').trim(), 10),
            disabled: !!b.disabled,
            x: b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2,
            y: b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2
          }}));
          const ineqLeaf = Array.from(recto.querySelectorAll('span, div, [data-futoshiki-ineq]')).some(e =>
            isVis(e) && e.children.length === 0 && /^[<>∧∨^v]$/.test((e.innerText || '').trim())
          );
          const txt = recto.innerText || '';
          const hasInequalities = ineqLeaf || /(?:^|\\s)[<>∧∨^v](?:\\s|$)|[<>∧∨]/.test(txt)
            || !!recto.querySelector('[data-futoshiki-ineq], [aria-label*="menor"], [aria-label*="mayor"]');
          return {{ cellCount: cells.length, cells, keypad, hasInequalities }};
        }})()
        """
    )
    if not info or info["cellCount"] < 16 or not info["hasInequalities"]:
        raise AssertionError(f"Futoshiki invalid (>=4x4 grid + inequalities required): {info}")
    n = int(round(info["cellCount"] ** 0.5))
    if n < 4 or n * n != info["cellCount"]:
        raise AssertionError(f"Futoshiki cell count {info['cellCount']} is not an NxN (N>=4) square")
    keypad_digits = sorted(k["digit"] for k in info["keypad"])
    if keypad_digits != list(range(1, n + 1)):
        raise AssertionError(f"Futoshiki expected 1..{n} keypad, got {keypad_digits}")

    # Interactive duplicate-digit negative check: scan rows 0..n-1 for an editable empty cell
    sorted_cells = sorted(info["cells"], key=lambda c: (c["top"], c["left"]))
    rows_cells = [sorted_cells[i * n:(i + 1) * n] for i in range(n)]
    candidate_rows = [
        (
            r_cells,
            [c for c in r_cells if c["digit"] == 0 and not c["disabled"]],
            [c["digit"] for c in r_cells if c["digit"] != 0],
        )
        for r_cells in rows_cells
    ]
    with_empties = [(r_cells, emps, digs) for (r_cells, emps, digs) in candidate_rows if emps]
    if not with_empties:
        raise AssertionError("Futoshiki has no editable empty cell for duplicate-digit negative check")
    chosen = next(
        (item for item in with_empties if item[2]),
        next((item for item in with_empties if len(item[1]) >= 2), with_empties[0]),
    )
    _, empties, row_digits = chosen
    dup_digit = row_digits[0] if row_digits else 1
    kbtn = next(k for k in info["keypad"] if k["digit"] == dup_digit)
    client.click_at(empties[0]["x"], empties[0]["y"])
    client.click_at(kbtn["x"], kbtn["y"])
    if not row_digits and len(empties) >= 2:
        client.click_at(empties[1]["x"], empties[1]["y"])
        client.click_at(kbtn["x"], kbtn["y"])
    client.drain_events(0.1)
    if is_recto_solved(client):
        raise AssertionError("Futoshiki falsely solved after entering duplicate row digit")
    try:
        click_button_by_text(client, "Borrar", scope_selector="main")
    except AssertionError:
        pass

    return info


def verify_connections_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Connections has 16 tiles, 3-tile disabled submit, 4-tile cap, and rejects invalid group."""
    def _read_connections() -> dict[str, Any] | None:
        return client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return null;
              let tileEls = Array.from(recto.querySelectorAll('[data-connections-tile]')).filter(isVis);
              if (!tileEls.length) {{
                const grids = Array.from(recto.querySelectorAll('.grid')).filter(isVis);
                const grid16 = grids.find(g => g.querySelectorAll('button').length === 16) || grids[0];
                if (grid16) {{
                  tileEls = Array.from(grid16.querySelectorAll('button')).filter(isVis);
                }}
              }}
              if (!tileEls.length) {{
                tileEls = Array.from(recto.querySelectorAll('button')).filter(b => {{
                  if (!isVis(b)) return false;
                  const t = (b.innerText || '').trim();
                  return t.length >= 2 && !/^(enviar|comprobar|mezclar|deseleccionar|limpiar|pista)$/i.test(t);
                }});
              }}
              const tiles = tileEls.map((b, idx) => {{
                const r = b.getBoundingClientRect();
                return {{
                  idx,
                  text: (b.innerText || '').trim(),
                  className: b.className || '',
                  ariaPressed: b.getAttribute('aria-pressed'),
                  dataSelected: b.getAttribute('data-selected'),
                  disabled: !!b.disabled,
                  x: r.left + r.width / 2,
                  y: r.top + r.height / 2
                }};
              }});
              const submitBtn = Array.from(recto.querySelectorAll('button')).find(b =>
                isVis(b) && /enviar|comprobar/i.test(b.innerText || '')
              );
              const sbRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
              return {{
                tileCount: tiles.length,
                tiles,
                submitDisabled: submitBtn ? !!submitBtn.disabled : null,
                submitPos: sbRect ? {{ x: sbRect.left + sbRect.width / 2, y: sbRect.top + sbRect.height / 2 }} : null
              }};
            }})()
            """
        )

    info = _read_connections()
    if not info or len(info["tiles"]) != 16:
        raise AssertionError(f"Connections must show 16 tiles, found {len(info['tiles']) if info else None}")

    baseline_classes = [t["className"] for t in info["tiles"]]

    def _selected_indices(state: dict[str, Any]) -> list[int]:
        sel = []
        for t in state["tiles"]:
            is_sel = (
                t["ariaPressed"] == "true"
                or t["dataSelected"] == "true"
                or t["className"] != baseline_classes[t["idx"]]
            )
            if is_sel:
                sel.append(t["idx"])
        return sel

    # 1. Select 3 tiles -> submit must be strictly disabled (True)
    for t in info["tiles"][:3]:
        client.click_at(t["x"], t["y"])
    s3 = _read_connections()
    if not s3 or s3["submitDisabled"] is not True:
        raise AssertionError(f"Connections submit button must be disabled (True) at 3 tiles, got {s3['submitDisabled'] if s3 else None}")

    # 2. Select 4th tile -> submit enabled; click 5th tile -> cap must hold at 4 selected
    client.click_at(info["tiles"][3]["x"], info["tiles"][3]["y"])
    s4 = _read_connections()
    if not s4 or s4["submitDisabled"] is not False:
        raise AssertionError(f"Connections submit button must be enabled at 4 tiles, got {s4['submitDisabled'] if s4 else None}")

    client.click_at(info["tiles"][4]["x"], info["tiles"][4]["y"])
    client.move_mouse(5, 5)
    client.drain_events(0.1)
    s5 = _read_connections()
    if not s5:
        raise AssertionError("Connections DOM vanished after clicking 5th tile")
    sel_after_5 = _selected_indices(s5)
    if len(sel_after_5) > 4:
        raise AssertionError(f"Connections allowed selecting >4 tiles (5th tile violated cap): {sel_after_5}")

    # 3. Submit 4 tiles -> verify not solved & invalid group stays rejected (or try cross-row if 0..3 fluked a match)
    if not s4["submitPos"]:
        raise AssertionError("Connections submit button coordinates missing at 4 selected tiles")
    client.click_at(s4["submitPos"]["x"], s4["submitPos"]["y"])
    client.drain_events(0.2)
    if is_recto_solved(client):
        raise AssertionError("Connections falsely solved after submitting 1 candidate group")
    after_sub = _read_connections()
    if not after_sub:
        raise AssertionError("Connections DOM vanished after submitting 4 tiles")
    if len(after_sub["tiles"]) == 16 and len(_selected_indices(after_sub)) > 0:
        # Still 16 tiles (did not match a valid group); deselect cleanly
        for idx in _selected_indices(after_sub):
            t = after_sub["tiles"][idx]
            client.click_at(t["x"], t["y"])
    elif len(after_sub["tiles"]) == 12:
        # By 1/455 fluke tiles[0..3] matched 1 group; submit 4 cross-stride tiles from remaining 12 to test rejection
        pick = [after_sub["tiles"][0], after_sub["tiles"][3], after_sub["tiles"][6], after_sub["tiles"][9]]
        for t in pick:
            client.click_at(t["x"], t["y"])
        s_retry = _read_connections()
        if not s_retry or not s_retry["submitPos"] or s_retry["submitDisabled"] is not False:
            raise AssertionError(f"Connections retry submit failed to enable for 4 tiles: {s_retry}")
        client.click_at(s_retry["submitPos"]["x"], s_retry["submitPos"]["y"])
        client.drain_events(0.2)
        if is_recto_solved(client):
            raise AssertionError("Connections falsely solved")
        after_retry = _read_connections()
        if not after_retry:
            raise AssertionError("Connections DOM vanished after retry submit")
        for idx in _selected_indices(after_retry):
            t = after_retry["tiles"][idx]
            client.click_at(t["x"], t["y"])

    return info


def verify_nonogram_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Nonogram has >=5x5 cells + row/col clues and stays unsolved on cross/incomplete marks."""
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
          if (!recto) return null;
          const cells = Array.from(recto.querySelectorAll('[data-nonogram-cell], .grid button')).filter(isVis);
          const explicitClues = Array.from(recto.querySelectorAll('[data-nonogram-row-clue], [data-nonogram-col-clue]')).filter(isVis).length;
          const numericClues = Array.from(recto.querySelectorAll('div, span')).filter(el => {{
            if (!isVis(el) || el.closest('button, header, nav')) return false;
            const t = (el.innerText || '').replace(/\\s+/g, ' ').trim();
            return /^\\d+(?:\\s+\\d+)*$/.test(t) && el.children.length === 0;
          }}).length;
          return {{
            cellCount: cells.length,
            clueCount: Math.max(explicitClues, numericClues),
            firstCell: cells[0] ? {{ x: cells[0].getBoundingClientRect().left + cells[0].getBoundingClientRect().width / 2, y: cells[0].getBoundingClientRect().top + cells[0].getBoundingClientRect().height / 2 }} : null
          }};
        }})()
        """
    )
    if not info or info["cellCount"] < 25:
        raise AssertionError(f"Nonogram must have >=5x5 (25) cells, found {info['cellCount'] if info else None}")
    if info["clueCount"] < 10:
        raise AssertionError(f"Nonogram missing row/column clues (expected >=10, found {info['clueCount']})")
    if info["firstCell"]:
        client.click_at(info["firstCell"]["x"], info["firstCell"]["y"])
        if is_recto_solved(client):
            raise AssertionError("Nonogram falsely solved after 1 click")
    return info


def verify_minesweeper_and_negative(client: ChromeCDPClient) -> dict[str, Any]:
    """Verify Minesweeper has grid tiles, dedicated mine counter, flag protection, and safe-cell deduction."""
    def _read_minesweeper() -> dict[str, Any] | None:
        return client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const recto = document.querySelector('main section.page-recto') || document.querySelector('main');
              if (!recto) return null;
              const cellsRaw = Array.from(recto.querySelectorAll('[data-minesweeper-cell], .grid button')).filter(b => {{
                if (!isVis(b)) return false;
                if (b.closest('[data-toolbar], header, nav')) return false;
                const txt = (b.innerText || '').trim();
                return !/bandera|marcar|revelar|pista|reiniciar/i.test(txt);
              }});
              const txt = recto.innerText || '';
              const hasCounter = /(?:minas|banderas|restantes|ocultas)\\s*:?\\s*\\d+|\\d+\\s*(?:minas|banderas)/i.test(txt)
                || !!recto.querySelector('[data-mine-counter]');
              const cells = cellsRaw.map((b, idx) => {{
                const r = b.getBoundingClientRect();
                const ds = (b.getAttribute('data-state') || '').toLowerCase();
                const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                const inner = (b.innerText || '').trim();
                let val = '?';
                if (ds === 'flagged' || /bandera|flag/i.test(aria) || !!b.querySelector('svg.lucide-flag, [data-lucide="flag"]')) {{
                  val = 'F';
                }} else if (ds === 'revealed' || b.disabled || /^[0-8]$/.test(inner)) {{
                  val = /^[0-8]$/.test(inner) ? parseInt(inner, 10) : 0;
                }}
                return {{
                  idx,
                  val,
                  top: Math.round(r.top),
                  left: Math.round(r.left),
                  x: r.left + r.width / 2,
                  y: r.top + r.height / 2
                }};
              }});
              const rowGroups = new Map();
              for (const c of cells) {{
                const bucket = Array.from(rowGroups.keys()).find(k => Math.abs(k - c.top) <= 4);
                if (bucket !== undefined) rowGroups.get(bucket).push(c);
                else rowGroups.set(c.top, [c]);
              }}
              const rows = Array.from(rowGroups.entries())
                .sort((a, b) => a[0] - b[0])
                .map(e => e[1].sort((c1, c2) => c1.left - c2.left));
              return {{ cellCount: cells.length, hasCounter, rows }};
            }})()
            """
        )

    info = _read_minesweeper()
    if not info or info["cellCount"] < 25 or not info["hasCounter"]:
        raise AssertionError(f"Minesweeper missing grid (>=25 cells) or dedicated mine counter: {info}")

    rows_grid = info["rows"]
    hidden_cells = [c for row in rows_grid for c in row if c["val"] == "?"]
    if not hidden_cells:
        raise AssertionError("Minesweeper has no hidden '?' cells to test flag toggle/protection")
    target = hidden_cells[0]
    has_flag_mode = bool(
        client.eval_js(
            "Array.from(document.querySelectorAll('main button')).some(b => /bandera|marcar/i.test(b.innerText || ''))"
        )
    )
    if has_flag_mode:
        click_button_by_text(client, "Bandera", scope_selector="main")
        client.click_at(target["x"], target["y"])
    else:
        client.eval_js(
            f"""
            (() => {{
              const el = document.elementFromPoint({target['x']}, {target['y']});
              if (el) el.dispatchEvent(new MouseEvent('contextmenu', {{ bubbles: true, cancelable: true, button: 2 }}));
            }})()
            """
        )
    client.drain_events(0.12)
    after_flag = _read_minesweeper()
    flagged_cell = next(
        (c for row in (after_flag["rows"] if after_flag else []) for c in row if c["idx"] == target["idx"]),
        None,
    )
    if not flagged_cell or flagged_cell["val"] != "F":
        raise AssertionError(f"Minesweeper failed to place flag on {target}: got {flagged_cell}")

    # Verify flag protection: clicking flagged cell in reveal mode must NOT reveal/explode it
    if has_flag_mode:
        try:
            click_button_by_text(client, "Revelar", scope_selector="main")
        except AssertionError:
            click_button_by_text(client, "Bandera", scope_selector="main")
    client.click_at(target["x"], target["y"])
    client.drain_events(0.1)
    after_click = _read_minesweeper()
    still_flagged = next(
        (c for row in (after_click["rows"] if after_click else []) for c in row if c["idx"] == target["idx"]),
        None,
    )
    if not still_flagged or still_flagged["val"] != "F":
        raise AssertionError(f"Minesweeper flag protection failed: {still_flagged}")
    # Unflag cleanly
    if has_flag_mode:
        click_button_by_text(client, "Bandera", scope_selector="main")
        client.click_at(target["x"], target["y"])
        try:
            click_button_by_text(client, "Revelar", scope_selector="main")
        except AssertionError:
            click_button_by_text(client, "Bandera", scope_selector="main")
    else:
        client.eval_js(
            f"""
            (() => {{
              const el = document.elementFromPoint({target['x']}, {target['y']});
              if (el) el.dispatchEvent(new MouseEvent('contextmenu', {{ bubbles: true, cancelable: true, button: 2 }}));
            }})()
            """
        )
    client.drain_events(0.1)

    # Smoke-test deduce_minesweeper_moves on current visible board
    latest = _read_minesweeper()
    if latest and latest["rows"] and all(len(r) == len(latest["rows"][0]) for r in latest["rows"]):
        board_mat = [[c["val"] for c in r] for r in latest["rows"]]
        safe_moves, _ = deduce_minesweeper_moves(len(board_mat), len(board_mat[0]), board_mat)
        if safe_moves:
            sr, sc = sorted(safe_moves)[0]
            cell = latest["rows"][sr][sc]
            client.click_at(cell["x"], cell["y"])
            client.drain_events(0.1)

    return info


def verify_pure_python_solvers_self_test() -> dict[str, Any]:
    """Run deterministic unit/adversarial checks across all pure-Python R4 puzzle solvers."""
    # 1. Sudoku 9x9
    board_9 = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
    sol_9 = solve_sudoku_9x9(board_9)
    if sol_9[0][:3] != [5, 3, 4]:
        raise AssertionError(f"Sudoku solver mismatch: {sol_9[0]}")

    # 2. WordSearch
    ws = find_words_in_grid(
        [["C", "R", "I", "M", "E", "N"], ["X"] * 6],
        ["CRIMEN"],
    )
    if ws["CRIMEN"] != ((0, 0), (0, 5)):
        raise AssertionError(f"WordSearch solver mismatch: {ws}")

    # 3. Murdoku CSP + Spanish parser
    try:
        solve_murdoku_csp(
            ["Elena", "Carlos"],
            ["Salón", "Cocina"],
            [{"type": "neq", "row": "Elena", "col": "Salón"}, {"type": "eq", "row": "Elena", "col": "Salón"}],
        )
        raise AssertionError("solve_murdoku_csp failed to reject neq+eq contradiction")
    except ValueError:
        pass
    parsed = parse_spanish_murdoku_clues(
        ["Elena", "Carlos", "Sofía"],
        ["Salón", "Salón Principal", "Cocina", "Biblioteca"],
        [
            "Elena no estuvo ni en la Cocina ni en la Biblioteca.",
            "Carlos estuvo en el Salón Principal, no en la Cocina.",
            "Sofía estuvo en la Cocina, donde no había luz.",
            "Elena estuvo lejos del Salón.",
        ],
    )
    expected_subset = [
        {"type": "neq", "row": "Elena", "col": "Cocina"},
        {"type": "neq", "row": "Elena", "col": "Biblioteca"},
        {"type": "eq", "row": "Carlos", "col": "Salón Principal"},
        {"type": "neq", "row": "Carlos", "col": "Cocina"},
        {"type": "eq", "row": "Sofía", "col": "Cocina"},
        {"type": "neq", "row": "Elena", "col": "Salón"},
    ]
    for item in expected_subset:
        if item not in parsed:
            raise AssertionError(f"Murdoku Spanish parser missed {item} in {parsed}")

    # 4. Futoshiki (pre-filled validation + ^/v)
    try:
        solve_futoshiki(4, [[4, 1, 0, 0]] + [[0] * 4] * 3, [((0, 0), "<", (0, 1))])
        raise AssertionError("solve_futoshiki accepted conflicting pre-filled inequality")
    except ValueError:
        pass
    try:
        solve_futoshiki(4, [[9, 0, 0, 0]] + [[0] * 4] * 3, [])
        raise AssertionError("solve_futoshiki accepted out-of-range digit 9 on 4x4")
    except ValueError:
        pass
    f_sol = solve_futoshiki(4, [[0] * 4 for _ in range(4)], [((0, 0), "^", (1, 0)), ((0, 1), "v", (1, 1))])
    if not (f_sol[0][0] < f_sol[1][0] and f_sol[0][1] > f_sol[1][1]):
        raise AssertionError(f"Futoshiki vertical inequalities violated: {f_sol}")

    # 5. Nonogram
    n_sol = solve_nonogram([[1], [1]], [[1], [1]])
    if n_sol not in ([[1, 0], [0, 1]], [[0, 1], [1, 0]]):
        raise AssertionError(f"Nonogram solver mismatch: {n_sol}")

    # 6. Minesweeper (0-prop + overlapping diff)
    s0, m0 = deduce_minesweeper_moves(2, 2, [[0, "?"], ["?", "?"]])
    if s0 != {(0, 1), (1, 0), (1, 1)} or m0:
        raise AssertionError(f"Minesweeper 0-propagation failed: safe={s0}, mines={m0}")
    s1, m1 = deduce_minesweeper_moves(2, 4, [[" ", 1, 2, " "], ["?", "?", "?", "?"]])
    if (1, 0) not in s1 or (1, 3) not in m1:
        raise AssertionError(f"Minesweeper overlapping diff failed: safe={s1}, mines={m1}")

    # 7. Cryptogram 0-code bijection
    try:
        solve_cryptogram_bijection([[0, 1]], {0: "E", 1: "L"}, extra_lexicon={"EL", "LA"})
    except ValueError as exc:
        raise AssertionError(f"Cryptogram 0-code valid bijection failed: {exc}")
    try:
        solve_cryptogram_bijection([[0, 1]], {0: "E", 1: "E"}, extra_lexicon={"EE"})
        raise AssertionError("Cryptogram fixed_map allowed duplicate 'E' assignment")
    except ValueError:
        pass
    try:
        solve_cryptogram_bijection(
            [[0, 1, 2, 3, 4, 5], [6, 1, 2, 3, 4, 5]],
            {0: "C", 1: "R", 2: "I", 3: "M", 4: "E", 5: "N"},
        )
        raise AssertionError("Cryptogram solver allowed duplicate 'C' assignment across distinct cipher codes 0 and 6")
    except ValueError:
        pass

    # 8. Crossword unique-word preference
    cw = solve_crossword_slots(
        [
            {"cells": [(0, 0), (0, 1), (0, 2)], "candidates": ["SOL", "SAL"]},
            {"cells": [(0, 0), (1, 0), (2, 0)], "candidates": ["SOL", "SAL"]},
        ]
    )
    w_across = "".join(cw[(0, c)] for c in range(3))
    w_down = "".join(cw[(r, 0)] for r in range(3))
    if w_across == w_down:
        raise AssertionError(f"Crossword reused identical word {w_across!r} despite distinct candidate")

    # 9. Syllables empty valid_words=set()
    try:
        solve_syllables_from_bank([2], ["PI", "STA"], valid_words=set())
        raise AssertionError("Syllables solver ignored explicit empty valid_words=set()")
    except ValueError:
        pass

    # Additional adversarial edge checks (bool in Sudoku, self-ineq in Futoshiki, explicit candidates=[] in Crossword)
    for bad_bool in (True, False):
        bad_board = [[0] * 9 for _ in range(9)]
        bad_board[0][0] = bad_bool  # type: ignore[assignment]
        try:
            solve_sudoku_9x9(bad_board)
            raise AssertionError(f"solve_sudoku_9x9 accepted boolean {bad_bool!r}")
        except ValueError:
            pass
    try:
        solve_futoshiki(4, [[0] * 4 for _ in range(4)], [((0, 0), "<", (0, 0))])
        raise AssertionError("solve_futoshiki accepted self-inequality (0,0) < (0,0)")
    except ValueError:
        pass
    try:
        solve_crossword_slots([{"cells": [(0, 0), (0, 1), (0, 2)], "candidates": []}])
        raise AssertionError("solve_crossword_slots ignored explicit empty candidates=[]")
    except ValueError:
        pass

    return {"ok": True, "solvers": 9}


def inspect_puzzle_by_type(client: ChromeCDPClient, puzzle_type: str, mobile_touch: bool = False) -> dict[str, Any]:
    """Verify structure and negative rules for any of the 10 R4 puzzle types on the active page-recto."""
    active = detect_active_puzzle_type(client)
    if active != puzzle_type:
        raise AssertionError(f"Expected active puzzle {puzzle_type!r}, detected {active!r}")

    if puzzle_type == "sudoku":
        return verify_sudoku_9x9_and_negative(client)
    if puzzle_type == "wordsearch":
        return verify_wordsearch_and_negative(client, use_touch=mobile_touch)
    if puzzle_type == "murdoku":
        return verify_murdoku_reset_on_mistake(client)
    if puzzle_type == "syllables":
        return verify_syllables_and_negative(client)
    if puzzle_type == "cryptogram":
        return verify_cryptogram_bijection_and_no_cheat(client)
    if puzzle_type == "crossword":
        return verify_crossword_and_negative(client)
    if puzzle_type == "futoshiki":
        return verify_futoshiki_and_negative(client)
    if puzzle_type == "connections":
        return verify_connections_and_negative(client)
    if puzzle_type == "nonogram":
        return verify_nonogram_and_negative(client)
    if puzzle_type == "minesweeper":
        return verify_minesweeper_and_negative(client)
    raise ValueError(f"Unsupported puzzle_type: {puzzle_type}")


def navigate_and_inspect_all_10_puzzles(client: ChromeCDPClient, mobile: bool = False) -> dict[str, int]:
    """Discover one day per R4 puzzle type dynamically via AdventCalendar and inspect each one."""
    from .app_helpers import inspect_viewport_bounds, switch_mobile_page

    days_by_type = discover_all_10_puzzle_days(client)
    chosen: dict[str, int] = {pt: days_by_type[pt][0] for pt in PUZZLE_TYPES_R4}
    for pt, day in chosen.items():
        go_to_day(client, day)
        if mobile:
            switch_mobile_page(client, "right")
        inspect_puzzle_by_type(client, pt, mobile_touch=mobile)
        inspect_viewport_bounds(client, f"Puzzle {pt} (Day {day}, mobile={mobile})")
    return chosen
