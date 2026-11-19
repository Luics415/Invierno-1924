"""Tier 1 E2E Tests: Happy-Path Feature Coverage across EF1–EF5 (37 tests)."""

from __future__ import annotations

import json
from typing import Any

from .app_helpers import (
    close_advent_calendar,
    close_azlynn_bubble,
    close_dossier,
    close_suspect_modal,
    close_verdict_modal,
    collect_all_74_album_cards,
    click_button_by_text,
    click_element_by_selector,
    ensure_book_open,
    find_detective_state,
    get_advent_calendar_info,
    get_background_and_snow_state,
    get_book_layout_geometry,
    get_dossier_counts,
    get_header_controls_state,
    get_suspect_card_info,
    get_suspect_modal_info,
    get_verdict_options,
    go_to_day,
    inspect_viewport_bounds,
    inspect_zero_emojis_in_dom,
    open_azlynn_tab,
    toggle_book_cover,
    trigger_new_case,
    trigger_reset_game,
)
from .cdp_client import ChromeCDPClient
from .media_checks import (
    scan_source_for_emojis,
    validate_all_portraits_and_backgrounds,
    verify_legacy_absent,
)
from .puzzle_solvers import (
    discover_all_10_puzzle_days,
    inspect_puzzle_by_type,
    solve_sudoku_ui,
    solve_wordsearch_ui,
)
from .server import PROJECT_ROOT
from .types import (
    FORBIDDEN_LEGACY_STRINGS,
    PUZZLE_TYPES_R4,
    STORAGE_KEY,
    TOTAL_ACTS,
    TOTAL_DAYS,
    TOTAL_ROOMS,
    TOTAL_SUSPECTS,
    TOTAL_WEAPONS,
    TestCase,
    VIEWPORTS,
)


def _nav(client: ChromeCDPClient, base_url: str, vp_key: str = "desktop") -> None:
    w, h, mob, dpr = VIEWPORTS[vp_key]
    client.navigate_fresh(base_url, width=w, height=h, mobile=mob, dpr=dpr)
    ensure_book_open(client)


# --- EF1: 74 Equal Suspects, Portrait-Text Coherence & Diversity (7 tests) ---

def t1_ef1_01_all_74_png_portraits_valid_on_disk(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    res = validate_all_portraits_and_backgrounds(PROJECT_ROOT / "public")
    if res["suspect_count"] != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected {TOTAL_SUSPECTS} suspect PNGs, got {res}")
    return f"Validated {res['suspect_count']} suspect PNGs, {res['detective_count']} Azlynn PNGs, {res['background_count']} backgrounds (0 .gif)"


def t1_ef1_02_album_renders_all_74_portraits_no_broken_imgs(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    cards = collect_all_74_album_cards(client)
    if len(cards) != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected {TOTAL_SUSPECTS} suspect cards across Album spreads, found {len(cards)}")
    nums = {c["num"] for c in cards}
    if len(nums) != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected {TOTAL_SUSPECTS} distinct suspect numbers, got {len(nums)}")
    names: list[str] = []
    for c in cards:
        lines = [ln.strip() for ln in (c.get("text") or "").splitlines() if ln.strip()]
        name = (c.get("name") or "").strip() or next(
            (ln for ln in lines if not ln.startswith("#") and ln.upper() not in ("ACTIVO", "TACHADO")),
            "",
        )
        desc = (c.get("role") or "").strip()
        if not name or (not desc and len(lines) < 3):
            raise AssertionError(f"Suspect card #{c.get('num')} missing name or descriptive text: {c}")
        names.append(name)
    if len(set(names)) != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected {TOTAL_SUSPECTS} distinct suspect names across Album, got {len(set(names))}")
    broken = [c["num"] for c in cards if not c["hasImg"] or not c["imgComplete"] or c["imgNaturalWidth"] <= 0]
    if broken:
        raise AssertionError(f"Broken or missing suspect portrait <img> for numbers: {broken}")
    png_errors = [r for r in client.responses if "/portraits/" in r["url"] and r["status"] >= 400]
    if png_errors:
        raise AssertionError(f"Portrait HTTP errors: {png_errors}")
    client.assert_no_runtime_errors("T1_EF1_02")
    return f"All {len(cards)}/74 Album portraits & distinct names rendered with naturalWidth > 0"


def t1_ef1_03_no_principal_suspect_hierarchy(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    album_txt = client.eval_js("document.body.innerText")
    for bad in ("Sospechosos Principales", "Círculo Central", "Círculo Íntimo Central", "Sospechoso Principal", "Justo Segura"):
        if bad.lower() in album_txt.lower():
            raise AssertionError(f"Forbidden legacy hierarchy string {bad!r} found in Album UI")
    dossier = get_dossier_counts(client)
    for bad in ("Sospechosos Principales", "Círculo Central", "Círculo Íntimo Central", "Sospechoso Principal"):
        if bad.lower() in dossier["matrixText"].lower():
            raise AssertionError(f"Forbidden legacy hierarchy string {bad!r} found in Dossier Matrix")
    close_dossier(client)
    return "Zero principal/central-circle hierarchy labels in Album and Dossier"


def t1_ef1_04_album_search_and_category_filters(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    seen_subsets: list[tuple[str, ...]] = []
    for cat in ("Familia", "Invitados", "Servicio", "Valle"):
        click_button_by_text(client, cat, scope_selector="main")
        client.drain_events(0.1)
        snap = client.eval_js(
            """
            (() => {
              const isVis = el => {
                if (!el) return false;
                const st = getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
                const r = el.getBoundingClientRect();
                return r.width > 0.5 && r.height > 0.5;
              };
              const cards = Array.from(document.querySelectorAll('main .grid > div')).filter(isVis);
              const nums = cards.map(c => ((c.innerText || '').match(/#\\d{2}/) || [''])[0]).filter(Boolean);
              const texts = cards.map(c => (c.innerText || '').toLowerCase());
              const mainTxt = document.querySelector('main')?.innerText || '';
              const m = mainTxt.match(/Pliego\\s+\\d+\\s+de\\s+(\\d+)/i);
              return { count: cards.length, nums, texts, totalSpreads: m ? parseInt(m[1], 10) : null };
            })()
            """
        )
        if not snap or snap["count"] < 1 or snap["count"] >= TOTAL_SUSPECTS:
            raise AssertionError(f"Category filter {cat!r} yielded invalid card count: {snap}")
        if snap["totalSpreads"] is None or snap["totalSpreads"] >= 7:
            raise AssertionError(f"Category filter {cat!r} did not reduce Album spread count from 7: {snap}")
        if not all(cat.lower() in t for t in snap["texts"]):
            raise AssertionError(f"Category filter {cat!r} showed non-matching cards: {snap['nums']}")
        seen_subsets.append(tuple(snap["nums"]))
    if len(set(seen_subsets)) != 4:
        raise AssertionError(f"Category filters did not produce 4 distinct suspect subsets: {seen_subsets}")
    click_button_by_text(client, "Todos (74)", scope_selector="main")
    client.drain_events(0.1)
    all_snap = client.eval_js(
        """
        (() => {
          const isVis = el => {
            if (!el) return false;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0.5 && r.height > 0.5;
          };
          const cards = Array.from(document.querySelectorAll('main .grid > div')).filter(isVis);
          const mainTxt = document.querySelector('main')?.innerText || '';
          const m = mainTxt.match(/Pliego\\s+(\\d+)\\s+de\\s+(\\d+)/i);
          return { count: cards.length, spread: m ? parseInt(m[1], 10) : null, totalSpreads: m ? parseInt(m[2], 10) : null };
        })()
        """
    )
    if not all_snap or all_snap["count"] != 12 or all_snap["totalSpreads"] != 7:
        raise AssertionError(f"'Todos (74)' failed to restore 7-spread 74-suspect Album: {all_snap}")
    client.eval_js(
        """
        (() => {
          const inp = document.querySelector('main input');
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          proto.set.call(inp, 'Elena');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        })()
        """
    )
    client.drain_events(0.15)
    card = get_suspect_card_info(client, "01")
    if not card or "Elena" not in card["text"]:
        raise AssertionError(f"Album search for 'Elena' did not surface #01: {card}")
    return "Album category filters and search input filter 74 suspects cleanly"


def t1_ef1_05_suspect_detail_modal_photo_and_notes(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    card = get_suspect_card_info(client, "01")
    if not card:
        raise AssertionError("#01 card not found")
    client.click_at(card["cardRect"]["x"], card["cardRect"]["y"])
    modal = get_suspect_modal_info(client)
    if not modal or not modal["hasImg"] or modal["imgNaturalWidth"] <= 0:
        raise AssertionError(f"Suspect detail modal portrait failed: {modal}")
    if "Móvil Presunto (Círculo Íntimo)" in modal["text"]:
        raise AssertionError("Legacy principal-only 'Móvil Presunto (Círculo Íntimo)' label still present")
    click_button_by_text(client, "Notas", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    flipped_to_notes = client.eval_js(
        "!!document.querySelector('.fixed.inset-0 .photo-flip-inner.is-flipped')"
    )
    if not flipped_to_notes:
        raise AssertionError("Clicking 'Notas' did not flip suspect portrait card to Kodak back notes")
    click_button_by_text(client, "Foto", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    unflipped = client.eval_js(
        "!!document.querySelector('.fixed.inset-0 .photo-flip-inner') && !document.querySelector('.fixed.inset-0 .photo-flip-inner.is-flipped')"
    )
    modal_after = get_suspect_modal_info(client)
    if not unflipped or not modal_after or not modal_after["hasImg"] or modal_after["imgNaturalWidth"] <= 0:
        raise AssertionError(f"Clicking 'Foto' did not restore front portrait: unflipped={unflipped}, modal={modal_after}")
    close_suspect_modal(client)
    return "Suspect detail modal opens, flips Foto/Notas, shows equal fields, and closes"


def t1_ef1_06_album_manual_strike_and_restore(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
    client.drain_events(0.15)
    txt1 = client.eval_js("document.body.innerText")
    if "73 / 74" not in txt1 and "73/74" not in txt1:
        raise AssertionError("Manual strike did not decrement active count to 73/74")
    click_element_by_selector(client, 'main button[title*="Quitar"], main button[title*="Restaurar"], main button[aria-label*="Quitar"]', index=0)
    client.drain_events(0.15)
    txt2 = client.eval_js("document.body.innerText")
    if "74 / 74" not in txt2 and "74/74" not in txt2:
        raise AssertionError("Manual restore did not return active count to 74/74")
    return "Manual suspect strike and restore updates counter 74 -> 73 -> 74"


def t1_ef1_07_dossier_censo_lists_all_74_suspects(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    dossier = get_dossier_counts(client)
    censo = dossier["censo"]
    if not censo or censo["suspectCount"] != TOTAL_SUSPECTS or censo["brokenImgs"]:
        raise AssertionError(f"Dossier Censo invalid: {censo}")
    close_dossier(client)
    return f"Dossier Censo displays all {censo['suspectCount']}/74 suspects with intact portraits"


# --- EF2: 18 Weapons, 9 Rooms & 30-Day Campaign Structure (6 tests) ---

def t1_ef2_01_advent_calendar_30_days_and_5_acts(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    cal = get_advent_calendar_info(client)
    if cal["cardCount"] != TOTAL_DAYS:
        raise AssertionError(f"Expected {TOTAL_DAYS} days in AdventCalendar, got {cal['cardCount']}")
    if len(cal["actButtons"]) < TOTAL_ACTS:
        raise AssertionError(f"Expected {TOTAL_ACTS} Act buttons, got {cal['actButtons']}")
    close_advent_calendar(client)
    return f"AdventCalendar shows {cal['cardCount']} days across {len(cal['actButtons'])} Acts"


def t1_ef2_02_dossier_exposes_18_weapons_and_9_rooms(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    dossier = get_dossier_counts(client)
    armas = dossier["armas"]
    if not armas or not (armas["has18Weapons"] and armas["has9Rooms"]):
        raise AssertionError(
            f"Expected 18 weapons and 9 rooms in Dossier Armas tab, got armas={armas}"
        )
    close_dossier(client)
    return f"Dossier Armas y Habitaciones exposes 18 weapons & 9 rooms (grids={armas['gridSizes']})"


def t1_ef2_03_verdict_modal_exposes_74x18x9_parity(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    vopts = get_verdict_options(client)
    if not vopts:
        raise AssertionError("FinalVerdictModal failed to open")
    if (
        vopts["suspectCount"] != TOTAL_SUSPECTS
        or vopts["weaponCount"] != TOTAL_WEAPONS
        or vopts["roomCount"] != TOTAL_ROOMS
    ):
        raise AssertionError(
            f"FinalVerdictModal parity mismatch: expected {TOTAL_SUSPECTS}x{TOTAL_WEAPONS}x{TOTAL_ROOMS}, "
            f"got {vopts['suspectCount']}x{vopts['weaponCount']}x{vopts['roomCount']}"
        )
    close_verdict_modal(client)
    return f"FinalVerdictModal exposes {vopts['suspectCount']} suspects x {vopts['weaponCount']} weapons x {vopts['roomCount']} rooms parity"


def t1_ef2_04_header_navigation_day0_to_day30(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    go_to_day(client, 1)
    hdr1 = get_header_controls_state(client)
    if "01" not in hdr1["headerText"]:
        raise AssertionError(f"Expected Day 01 in header: {hdr1['headerText']}")
    go_to_day(client, 30)
    hdr30 = get_header_controls_state(client)
    if "30" not in hdr30["headerText"]:
        raise AssertionError(f"Expected Day 30 in header: {hdr30['headerText']}")
    return "Header and calendar navigation smoothly reach Day 0 -> Day 1 -> Day 30"


def t1_ef2_05_day_spread_dual_page_layout_and_30_counter(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop_xl")
    go_to_day(client, 15)
    geo = get_book_layout_geometry(client)
    vis_sections = [s for s in geo["sections"] if s["visible"]]
    if len(vis_sections) != 2:
        raise AssertionError(f"Expected 2 side-by-side sections on desktop Day 15, got {len(vis_sections)}")
    body_txt = client.eval_js("document.body.innerText")
    if "/30" not in body_txt and "de 30" not in body_txt:
        raise AssertionError("Expected '/30' or 'de 30' campaign progress indicator on Day 15")
    return "Desktop 1440x900 renders 2-page spread with 30-day counter"


def t1_ef2_06_mansion_backgrounds_and_20_snow_particles(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    bg = get_background_and_snow_state(client)
    if not any(f"background-{i}.png" in bg["bgImage"] for i in range(1, 5)):
        raise AssertionError(f"Expected background-1..4.png active background, got {bg['bgImage']!r}")
    if bg["snowCount"] != 20:
        raise AssertionError(f"Expected 20 .snow-particle elements, got {bg['snowCount']}")
    return f"Active mansion background {bg['bgImage']} with 20 snow particles"


# --- EF3: Dynamic Seeded Case Engine, New Case & Verdict Flow (6 tests) ---

def t1_ef3_01_vitest_74_case_and_puzzle_suite(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    vt = ctx.get("vitest")
    if vt is None:
        return "Vitest skipped via --skip-vitest"
    if vt["returncode"] != 0:
        raise AssertionError(f"Vitest suite failed (rc={vt['returncode']}): {vt['output'][-600:]}")
    return "Vitest 74-case uniqueness & 10-minigame solver suite passed (rc=0)"


def t1_ef3_02_new_case_generates_seed_and_resets_progress(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
    client.drain_events(0.15)
    pre_body = client.eval_js("document.body.innerText")
    if "73 / 74" not in pre_body and "73/74" not in pre_body:
        raise AssertionError("Failed to create 73/74 state before testing New Case")
    go_to_day(client, 1)
    raw1 = client.get_local_storage(STORAGE_KEY)
    if raw1 is None:
        raise AssertionError("Expected localStorage before New Case")
    d1 = json.loads(raw1)
    st1 = d1.get("state", d1)
    seed1 = st1.get("caseSeed")
    if not seed1:
        raise AssertionError(f"Expected non-empty initial caseSeed before New Case: {st1}")
    if not st1.get("manualEliminations"):
        raise AssertionError(f"Expected manualEliminations persisted before New Case: {st1}")
    trigger_new_case(client)
    raw2 = client.get_local_storage(STORAGE_KEY)
    if raw2 is None:
        raise AssertionError("Storage missing (None) after New Case")
    d2 = json.loads(raw2)
    st2 = d2.get("state", d2)
    if not st2.get("caseSeed"):
        raise AssertionError(f"New Case did not persist non-empty caseSeed: {st2}")
    if st2.get("caseSeed") == seed1:
        raise AssertionError(f"New Case reused previous caseSeed={seed1!r} instead of generating a fresh seed")
    if st2.get("currentDay") != 0:
        raise AssertionError(f"New Case did not return currentDay to 0: {st2.get('currentDay')}")
    if st2.get("completedDays"):
        raise AssertionError(f"New Case did not reset completedDays: {st2.get('completedDays')}")
    if st2.get("manualEliminations"):
        raise AssertionError(f"New Case did not reset manualEliminations: {st2.get('manualEliminations')}")
    hdr = get_header_controls_state(client)
    body = client.eval_js("document.body.innerText")
    if "73 / 74" in body or "73/74" in body:
        raise AssertionError("New Case left 73/74 manual elimination active")
    if "74 / 74" not in body and "74/74" not in body:
        raise AssertionError(f"New Case did not restore 74/74 Day 0 Album state: header={hdr['headerText']}")
    return f"New Case generated seed={st2['caseSeed']!r} and reset progress cleanly (len={len(raw1)}->{len(raw2)})"


def t1_ef3_03_azlynn_reiniciar_resets_current_case(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
    client.drain_events(0.15)
    pre_body = client.eval_js("document.body.innerText")
    if "73 / 74" not in pre_body and "73/74" not in pre_body:
        raise AssertionError("Failed to create 73/74 state before testing Reiniciar")
    go_to_day(client, 1)
    trigger_reset_game(client)
    hdr = get_header_controls_state(client)
    body = client.eval_js("document.body.innerText")
    raw = client.get_local_storage(STORAGE_KEY)
    if not raw:
        raise AssertionError("Storage missing after Reiniciar")
    st = json.loads(raw).get("state", {})
    if "73 / 74" in body or "73/74" in body or st.get("manualEliminations"):
        raise AssertionError(f"Reiniciar did not clear manual eliminations: {st.get('manualEliminations')}")
    if st.get("currentDay") != 0 or ("74 / 74" not in body and "74/74" not in body):
        raise AssertionError(f"Expected reset to Day 0 (74/74), got currentDay={st.get('currentDay')} header={hdr['headerText']}")
    return "Azlynn radial 'Reiniciar' resets progress and manual eliminations cleanly"


def t1_ef3_04_verdict_modal_rejects_incomplete_or_wrong_verdict(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    vopts = get_verdict_options(client)
    # Submit button must be disabled before selecting all 3 charges
    submit_disabled = client.eval_js(
        """
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => /lacrar y proclamar/i.test(b.innerText || ''));
          return btn ? !!btn.disabled : null;
        })()
        """
    )
    if submit_disabled is not True:
        raise AssertionError("Verdict submit button should be disabled until suspect + weapon + room are selected")
    close_verdict_modal(client)
    return "FinalVerdictModal blocks incomplete verdict submission cleanly"


def t1_ef3_05_book_cover_open_close_flip_flow(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    toggle_book_cover(client, "back")
    click_button_by_text(client, "Ver Portada")
    client.wait_until("!!document.querySelector('button[aria-label*=\"Contraportada\"]')", timeout=4.0, description="Front cover")
    click_element_by_selector(client, 'button[aria-label*="Abrir Libreta"]')
    client.wait_until("!!document.querySelector('header') && !!document.querySelector('main')", timeout=4.0, description="Book reopened")
    return "Book cover close -> back cover -> front cover -> reopen works cleanly"


def t1_ef3_06_localstorage_persists_case_state_across_reload(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    go_to_day(client, 7)
    before = client.get_local_storage(STORAGE_KEY)
    if not before:
        raise AssertionError("Expected villa-acebo-game-storage in localStorage")
    client.reload()
    ensure_book_open(client)
    hdr = get_header_controls_state(client)
    if "07" not in hdr["headerText"]:
        raise AssertionError(f"Expected Day 07 persisted across reload, got {hdr['headerText']}")
    return "localStorage persists active day & case state across page reload"


# --- EF4: Exclusive 10 Logic Minigames & Zero Legacy Modes (11 tests) ---

def t1_ef4_01_all_10_puzzles_present_zero_legacy_entreletras(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    days_by_type = discover_all_10_puzzle_days(client)
    counts = {k: len(v) for k, v in days_by_type.items()}
    if set(counts.keys()) != set(PUZZLE_TYPES_R4):
        raise AssertionError(f"Mismatch in R4 puzzle types: {counts}")
    return f"All 10 R4 puzzle types discovered across 30 days (zero Entreletras): {counts}"


def _test_single_puzzle_t1(client: ChromeCDPClient, base_url: str, puzzle_type: str) -> str:
    _nav(client, base_url, "desktop")
    days_by_type = discover_all_10_puzzle_days(client)
    day = days_by_type[puzzle_type][0]
    go_to_day(client, day)
    inspect_puzzle_by_type(client, puzzle_type, mobile_touch=False)
    inspect_viewport_bounds(client, f"T1 {puzzle_type} Day {day}")
    client.assert_no_runtime_errors(f"T1_{puzzle_type}")
    return f"{puzzle_type} verified on Day {day} with valid structure and zero runtime/layout errors"


def t1_ef4_02_sudoku_9x9(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    day = discover_all_10_puzzle_days(client)["sudoku"][0]
    go_to_day(client, day)
    solve_sudoku_ui(client)
    return f"9x9 Sudoku (3x3 blocks) verified and solved via real UI on Day {day}"


def t1_ef4_03_wordsearch_large_drag(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    day = discover_all_10_puzzle_days(client)["wordsearch"][0]
    go_to_day(client, day)
    solve_wordsearch_ui(client, use_touch=False)
    return f"WordSearch (>=11x11, >=8 words, zero '!') verified & solved via mouse drag on Day {day}"


def t1_ef4_04_murdoku(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "murdoku")


def t1_ef4_05_syllables_palabras_clave(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "syllables")


def t1_ef4_06_cryptogram_bijection(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "cryptogram")


def t1_ef4_07_crossword(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "crossword")


def t1_ef4_08_futoshiki(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "futoshiki")


def t1_ef4_09_connections(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "connections")


def t1_ef4_10_nonogram(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "nonogram")


def t1_ef4_11_minesweeper(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    return _test_single_puzzle_t1(client, base_url, "minesweeper")


# --- EF5: R5 Viewport Lock, Zero Emojis, Azlynn & Noir 1924 Polish (7 tests) ---

def t1_ef5_01_lint_tsc_build_gate(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    if ctx["lint"]["returncode"] != 0:
        raise AssertionError(f"oxlint failed: {ctx['lint']['output']}")
    if ctx["tsc"]["returncode"] != 0:
        raise AssertionError(f"tsc failed: {ctx['tsc']['output']}")
    if ctx["build"]["returncode"] != 0:
        raise AssertionError(f"build failed: {ctx['build']['output']}")
    return f"oxlint, tsc, and build status verified ({ctx['build']['output']})"


def t1_ef5_02_source_zero_emojis_and_legacy_absent(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    emoji_hits = scan_source_for_emojis(PROJECT_ROOT)
    if emoji_hits:
        raise AssertionError(f"R5 violation: Unicode emojis found in source: {emoji_hits[:5]}")
    legacy = verify_legacy_absent(PROJECT_ROOT)
    if not legacy["clean"]:
        raise AssertionError(f"Legacy files/strings still present: {legacy['violations'][:5]}")
    return "Source scan: 0 emojis and 0 legacy BetweenLines/Justo Segura/template artifacts"


def t1_ef5_03_dom_zero_emojis_and_noir_1924_branding(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    inspect_zero_emojis_in_dom(client, "T1_EF5_03 Day 0")
    title = client.eval_js("document.title")
    body = client.eval_js("document.body.innerText")
    if "Villa Acebo" not in (title + body) or "1924" not in (title + body):
        raise AssertionError(f"Missing Noir 1924 branding: title={title!r}")
    for bad in FORBIDDEN_LEGACY_STRINGS:
        if bad in title or bad in body:
            raise AssertionError(f"Forbidden legacy string {bad!r} rendered in UI")
    return f"DOM verified: 0 emojis, Noir 1924 branding intact (title={title!r})"


def t1_ef5_04_strict_h_screen_overflow_hidden_lock(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    rep0 = inspect_viewport_bounds(client, "T1_EF5_04 Day 0", check_vertical_lock=True)
    go_to_day(client, 1)
    rep1 = inspect_viewport_bounds(client, "T1_EF5_04 Day 1", check_vertical_lock=True)
    return f"h-screen overflow-hidden verified (scrollHeight={rep1['docScrollHeight']} <= {rep1['innerHeight']})"


def t1_ef5_05_azlynn_radial_and_30_day_case_tab(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    for tab in ("Pistas", "Diálogo", "Caso"):
        st = open_azlynn_tab(client, tab)
        if not st["hasBubble"] or not st["bubbleText"]:
            raise AssertionError(f"Azlynn {tab} bubble empty")
        if not st["azlynnImgs"] or any(not i["complete"] or i["naturalWidth"] <= 0 for i in st["azlynnImgs"]):
            raise AssertionError(f"Azlynn portrait missing or broken on {tab}: {st['azlynnImgs']}")
    if "/30" not in st["bubbleText"]:
        raise AssertionError(f"Expected '/30' progress in Azlynn Caso tab, got {st['bubbleText']!r}")
    close_azlynn_bubble(client)
    return "Azlynn radial Pistas/Diálogo/Caso tabs render /30 progress and valid detective PNGs"


def t1_ef5_06_no_mute_button_and_web_audio_sfx_active(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    hdr = get_header_controls_state(client)
    if hdr["muteButtons"]:
        raise AssertionError(f"Audio mute button must remain removed: {hdr['muteButtons']}")
    go_to_day(client, 1)
    spy = client.get_audio_spy()
    if spy.get("startCount", 0) <= 0:
        raise AssertionError(f"Expected Web Audio SFX to fire on interaction: {spy}")
    return f"Zero mute button; Web Audio SFX active (starts={spy['startCount']})"


def t1_ef5_07_header_collapse_and_expand_works(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    from .app_helpers import toggle_header_collapse

    _nav(client, base_url, "desktop")
    st0 = get_header_controls_state(client)
    toggle_header_collapse(client)
    st1 = get_header_controls_state(client)
    if st1["adviento"]["visible"] or not st1["headerRect"] or st1["headerRect"]["height"] >= st0["headerRect"]["height"] * 0.70:
        raise AssertionError(f"Header did not collapse: st0={st0['headerRect']}, st1={st1}")
    toggle_header_collapse(client)
    st2 = get_header_controls_state(client)
    if not st2["adviento"]["visible"]:
        raise AssertionError("Header did not re-expand")
    return "Header collapse and expand cycle works deterministically"


TIER1_TESTS: list[TestCase] = [
    TestCase("T1_EF1_01", "EF1", "74 suspect PNGs, 5 Azlynn PNGs, 4 backgrounds valid on disk (0 .gif)", t1_ef1_01_all_74_png_portraits_valid_on_disk),
    TestCase("T1_EF1_02", "EF1", "All 74 suspect portraits load in Album with naturalWidth > 0", t1_ef1_02_album_renders_all_74_portraits_no_broken_imgs),
    TestCase("T1_EF1_03", "EF1", "Zero principal/central-circle hierarchy labels in Album and Dossier", t1_ef1_03_no_principal_suspect_hierarchy),
    TestCase("T1_EF1_04", "EF1", "Album category pills and search filter 74 suspects", t1_ef1_04_album_search_and_category_filters),
    TestCase("T1_EF1_05", "EF1", "Suspect Detail Modal opens, flips Foto/Notas, and closes", t1_ef1_05_suspect_detail_modal_photo_and_notes),
    TestCase("T1_EF1_06", "EF1", "Album manual strike and restore updates counter 74->73->74", t1_ef1_06_album_manual_strike_and_restore),
    TestCase("T1_EF1_07", "EF1", "Dossier Censo tab lists all 74 suspects with intact portraits", t1_ef1_07_dossier_censo_lists_all_74_suspects),
    TestCase("T1_EF2_01", "EF2", "AdventCalendar displays 30 days across 5 Acts", t1_ef2_01_advent_calendar_30_days_and_5_acts),
    TestCase("T1_EF2_02", "EF2", "Dossier Armas y Habitaciones exposes 18 weapons & 9 rooms", t1_ef2_02_dossier_exposes_18_weapons_and_9_rooms),
    TestCase("T1_EF2_03", "EF2", "FinalVerdictModal exposes 74 suspects x 18 weapons x 9 rooms parity", t1_ef2_03_verdict_modal_exposes_74x18x9_parity),
    TestCase("T1_EF2_04", "EF2", "Navigation smoothly reaches Day 0 -> Day 1 -> Day 30", t1_ef2_04_header_navigation_day0_to_day30),
    TestCase("T1_EF2_05", "EF2", "Desktop 1440x900 renders dual spread with 30-day counter", t1_ef2_05_day_spread_dual_page_layout_and_30_counter),
    TestCase("T1_EF2_06", "EF2", "Active background-1..4.png & 20 .snow-particle nodes present", t1_ef2_06_mansion_backgrounds_and_20_snow_particles),
    TestCase("T1_EF3_01", "EF3", "Vitest 74-case uniqueness & 10-minigame suite passes", t1_ef3_01_vitest_74_case_and_puzzle_suite),
    TestCase("T1_EF3_02", "EF3", "New Case trigger generates fresh case state", t1_ef3_02_new_case_generates_seed_and_resets_progress),
    TestCase("T1_EF3_03", "EF3", "Azlynn Reiniciar resets current case progress", t1_ef3_03_azlynn_reiniciar_resets_current_case),
    TestCase("T1_EF3_04", "EF3", "FinalVerdictModal blocks incomplete verdict submission", t1_ef3_04_verdict_modal_rejects_incomplete_or_wrong_verdict),
    TestCase("T1_EF3_05", "EF3", "Book cover close, back-cover flip, and reopen flow", t1_ef3_05_book_cover_open_close_flip_flow),
    TestCase("T1_EF3_06", "EF3", "localStorage persists active day & case state across reload", t1_ef3_06_localstorage_persists_case_state_across_reload),
    TestCase("T1_EF4_01", "EF4", "All 10 R4 minigames discovered across 30 days (0 Entreletras)", t1_ef4_01_all_10_puzzles_present_zero_legacy_entreletras),
    TestCase("T1_EF4_02", "EF4", "Sudoku 9x9 (3x3 blocks) verified and solved via UI", t1_ef4_02_sudoku_9x9),
    TestCase("T1_EF4_03", "EF4", "WordSearch >=11x11 & >=8 words solved via mouse drag", t1_ef4_03_wordsearch_large_drag),
    TestCase("T1_EF4_04", "EF4", "Murdoku >=4x4 rendered and verified", t1_ef4_04_murdoku),
    TestCase("T1_EF4_05", "EF4", "Syllables (Palabras clave más largas) rendered and verified", t1_ef4_05_syllables_palabras_clave),
    TestCase("T1_EF4_06", "EF4", "Cryptogram 1-to-1 bijection & no cheat button verified", t1_ef4_06_cryptogram_bijection),
    TestCase("T1_EF4_07", "EF4", "Crossword (Crucigrama) grid and clues verified", t1_ef4_07_crossword),
    TestCase("T1_EF4_08", "EF4", "Futoshiki NxN grid and inequalities verified", t1_ef4_08_futoshiki),
    TestCase("T1_EF4_09", "EF4", "Connections 16-tile grid verified", t1_ef4_09_connections),
    TestCase("T1_EF4_10", "EF4", "Nonogram >=5x5 grid and clues verified", t1_ef4_10_nonogram),
    TestCase("T1_EF4_11", "EF4", "Minesweeper grid and mine counter verified", t1_ef4_11_minesweeper),
    TestCase("T1_EF5_01", "EF5", "oxlint, tsc, and build status check", t1_ef5_01_lint_tsc_build_gate),
    TestCase("T1_EF5_02", "EF5", "Zero emojis in src/ and zero legacy BetweenLines/template files", t1_ef5_02_source_zero_emojis_and_legacy_absent),
    TestCase("T1_EF5_03", "EF5", "Zero emojis in DOM and Noir 1924 Villa Acebo branding", t1_ef5_03_dom_zero_emojis_and_noir_1924_branding),
    TestCase("T1_EF5_04", "EF5", "Strict h-screen overflow-hidden lock on root viewport", t1_ef5_04_strict_h_screen_overflow_hidden_lock),
    TestCase("T1_EF5_05", "EF5", "Azlynn radial Pistas/Diálogo/Caso tabs & /30 progress", t1_ef5_05_azlynn_radial_and_30_day_case_tab),
    TestCase("T1_EF5_06", "EF5", "No mute button & Web Audio SFX active", t1_ef5_06_no_mute_button_and_web_audio_sfx_active),
    TestCase("T1_EF5_07", "EF5", "Header collapse and expand toggle works", t1_ef5_07_header_collapse_and_expand_works),
]
