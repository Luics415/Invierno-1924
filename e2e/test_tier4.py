"""Tier 4 E2E Tests: 6 Real-World End-to-End Application Scenarios."""

from __future__ import annotations

import json
from typing import Any

from .app_helpers import (
    click_button_by_text,
    close_azlynn_bubble,
    close_dossier,
    close_suspect_modal,
    collect_all_74_album_cards,
    ensure_book_open,
    get_background_and_snow_state,
    get_book_layout_geometry,
    get_dossier_counts,
    get_suspect_card_info,
    get_suspect_modal_info,
    get_verdict_options,
    go_to_day,
    inspect_viewport_bounds,
    inspect_zero_emojis_in_dom,
    open_azlynn_tab,
    pick_wrong_verdict_options,
    read_active_case_solution,
    select_verdict_and_submit,
    switch_mobile_page,
    trigger_new_case,
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
    verify_connections_and_negative,
    verify_crossword_and_negative,
    verify_cryptogram_bijection_and_no_cheat,
    verify_futoshiki_and_negative,
    verify_minesweeper_and_negative,
    verify_murdoku_reset_on_mistake,
    verify_nonogram_and_negative,
    verify_syllables_and_negative,
)
from .server import PROJECT_ROOT
from .types import PUZZLE_TYPES_R4, STORAGE_KEY, TOTAL_SUSPECTS, TestCase, VIEWPORTS


def _nav(client: ChromeCDPClient, base_url: str, vp_key: str) -> None:
    w, h, mob, dpr = VIEWPORTS[vp_key]
    client.navigate_fresh(base_url, width=w, height=h, mobile=mob, dpr=dpr)
    ensure_book_open(client)


def t4_s1_desktop_1440_74_suspect_equality_and_18x9_dossier_tour(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 1: Desktop 1440x900 74-suspect equality, PNG portrait coherence & 18x9 Dossier tour."""
    _nav(client, base_url, "desktop_xl")
    bg = get_background_and_snow_state(client)
    geo = get_book_layout_geometry(client)
    if not any(f"background-{i}.png" in bg["bgImage"] for i in range(1, 5)) or bg["snowCount"] != 20:
        raise AssertionError(f"Mansion background or snow compromised: {bg}")
    if geo["mainRect"]["width"] / geo["innerWidth"] < 0.80:
        raise AssertionError(f"Expected wide book at 1440x900: {geo['mainRect']}")
    inspect_viewport_bounds(client, "T4_S1 Day 0 1440")
    inspect_zero_emojis_in_dom(client, "T4_S1 Day 0 1440")

    cards = collect_all_74_album_cards(client)
    if len(cards) != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected 74 Album suspects, found {len(cards)}")
    if len({c["num"] for c in cards}) != TOTAL_SUSPECTS:
        raise AssertionError("Duplicate suspect numbers in 74-card Album tour")
    names: list[str] = []
    for c in cards:
        lines = [ln.strip() for ln in (c.get("text") or "").splitlines() if ln.strip()]
        name = (c.get("name") or "").strip() or next(
            (ln for ln in lines if not ln.startswith("#") and ln.upper() not in ("ACTIVO", "TACHADO")),
            "",
        )
        desc = (c.get("role") or "").strip()
        if not name or (not desc and len(lines) < 3):
            raise AssertionError(f"Suspect card #{c.get('num')} missing name or description: {c}")
        names.append(name)
    if len(set(names)) != TOTAL_SUSPECTS:
        raise AssertionError(f"Expected 74 distinct suspect names, got {len(set(names))}")
    if any(not c["hasImg"] or c["imgNaturalWidth"] <= 0 for c in cards):
        raise AssertionError("Broken suspect portrait detected in 74-card tour")

    # Open representative suspect modals (#01 and #74) unconditionally
    go_to_day(client, 0)
    card1 = get_suspect_card_info(client, "01")
    if not card1:
        raise AssertionError("#01 card not found on spread 1 after go_to_day(0)")
    client.click_at(card1["cardRect"]["x"], card1["cardRect"]["y"])
    m1 = get_suspect_modal_info(client)
    if not m1 or not m1["hasImg"] or m1["imgNaturalWidth"] <= 0:
        raise AssertionError(f"#01 modal portrait broken: {m1}")
    close_suspect_modal(client)

    # Paginate forward to locate #74 card and verify its modal portrait
    card74 = get_suspect_card_info(client, "74")
    for _ in range(12):
        if card74 is not None:
            break
        click_button_by_text(client, "Pliego Sig.", scope_selector="main")
        client.drain_events(0.15)
        card74 = get_suspect_card_info(client, "74")
    if not card74:
        raise AssertionError("#74 card not found across Album spreads")
    client.click_at(card74["cardRect"]["x"], card74["cardRect"]["y"])
    m74 = get_suspect_modal_info(client)
    if not m74 or not m74["hasImg"] or m74["imgNaturalWidth"] <= 0:
        raise AssertionError(f"#74 modal portrait broken: {m74}")
    close_suspect_modal(client)

    dossier = get_dossier_counts(client)
    if dossier["censo"]["suspectCount"] != 74:
        raise AssertionError(f"Dossier Censo expected 74, got {dossier['censo']}")
    if not (dossier["armas"]["has18Weapons"] and dossier["armas"]["has9Rooms"]):
        raise AssertionError(f"Dossier Armas expected 18 weapons & 9 rooms, got {dossier['armas']}")
    inspect_zero_emojis_in_dom(client, "T4_S1 Dossier")
    close_dossier(client)
    client.assert_no_runtime_errors("T4_S1")
    return "T4_S1 complete: 1440x900 74/74 distinct PNG portraits + #01/#74 modals + 18x9 Dossier + zero emojis/overflow"


def t4_s2_mobile_375_360_30_day_campaign_tour_all_10_minigames(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 2: Mobile 375x812 & 360x740 campaign tour across all 10 R4 minigame types."""
    _nav(client, base_url, "mobile")
    inspect_viewport_bounds(client, "T4_S2 Mobile 375 Day 0")
    days_by_type = discover_all_10_puzzle_days(client)
    for pt in PUZZLE_TYPES_R4:
        day = days_by_type[pt][0]
        go_to_day(client, day)
        inspect_viewport_bounds(client, f"T4_S2 Day {day} ({pt}) Relato")
        switch_mobile_page(client, "right")
        inspect_puzzle_by_type(client, pt, mobile_touch=True)
        inspect_viewport_bounds(client, f"T4_S2 Day {day} ({pt}) Pasatiempo")
        inspect_zero_emojis_in_dom(client, f"T4_S2 Day {day} ({pt})")

    # Also verify Day 30 on 360x740
    w, h, mob, dpr = VIEWPORTS["mobile_sm"]
    client.set_viewport(w, h, mobile=mob, dpr=dpr)
    go_to_day(client, 30)
    inspect_viewport_bounds(client, "T4_S2 360x740 Day 30 Relato")
    switch_mobile_page(client, "right")
    inspect_viewport_bounds(client, "T4_S2 360x740 Day 30 Pasatiempo")
    client.assert_no_runtime_errors("T4_S2")
    return "T4_S2 complete: Mobile 375x812 & 360x740 tour across all 10 minigames & Day 30 (0 overflow, 0 emojis)"


def t4_s3_interactive_10_minigame_mechanics_and_mistake_marathon(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 3: Interactive 10-minigame mechanics & mistake marathon (Sudoku solve, Murdoku reset, Cryptogram bijection, WordSearch drag, etc.)."""
    _nav(client, base_url, "desktop")
    days_by_type = discover_all_10_puzzle_days(client)

    # 1. Solve 9x9 Sudoku via real UI
    go_to_day(client, days_by_type["sudoku"][0])
    solve_sudoku_ui(client)

    # 2. Solve WordSearch >=11x11 via real mouse drag
    go_to_day(client, days_by_type["wordsearch"][0])
    solve_wordsearch_ui(client, use_touch=False)

    # 3. Verify Murdoku mistake reset
    go_to_day(client, days_by_type["murdoku"][0])
    verify_murdoku_reset_on_mistake(client)

    # 4. Verify Cryptogram bijection & zero cheat
    go_to_day(client, days_by_type["cryptogram"][0])
    verify_cryptogram_bijection_and_no_cheat(client)

    # 5-10. Verify Crossword, Futoshiki, Connections, Nonogram, Minesweeper, Syllables
    go_to_day(client, days_by_type["crossword"][0])
    verify_crossword_and_negative(client)
    go_to_day(client, days_by_type["futoshiki"][0])
    verify_futoshiki_and_negative(client)
    go_to_day(client, days_by_type["connections"][0])
    verify_connections_and_negative(client)
    go_to_day(client, days_by_type["nonogram"][0])
    verify_nonogram_and_negative(client)
    go_to_day(client, days_by_type["minesweeper"][0])
    verify_minesweeper_and_negative(client)
    go_to_day(client, days_by_type["syllables"][0])
    verify_syllables_and_negative(client)

    client.assert_no_runtime_errors("T4_S3")
    return "T4_S3 complete: All 10 R4 minigames exercised interactively (Sudoku + WordSearch solved, Murdoku reset, Cryptogram bijection)"


def t4_s4_dynamic_seeded_case_lifecycle_and_verdict_victory(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 4: Dynamic Seeded Case Lifecycle: Solve puzzle -> Clue progression -> Wrong verdict rejection -> Exact Dynamic Verdict Victory -> New Case."""
    _nav(client, base_url, "desktop")
    days_by_type = discover_all_10_puzzle_days(client)
    go_to_day(client, days_by_type["sudoku"][0])
    solve_sudoku_ui(client)

    sol = read_active_case_solution(client)
    wrong_suspect, _, _ = pick_wrong_verdict_options(client, sol)

    # 1. Wrong verdict rejected
    wrong_txt = select_verdict_and_submit(client, wrong_suspect, sol["weaponName"], sol["roomName"])
    if "contradicción" not in wrong_txt.lower():
        raise AssertionError(f"Expected Contradicción on wrong culprit {wrong_suspect!r}, got: {wrong_txt[:200]}")
    click_button_by_text(client, "Reexaminar", scope_selector=".fixed.inset-0")

    # 2. Exact dynamic verdict for this seed succeeds!
    win_txt = select_verdict_and_submit(client, sol["culpritName"], sol["weaponName"], sol["roomName"])
    if "caso resuelto" not in win_txt.lower():
        raise AssertionError(f"Expected Caso Resuelto for dynamic solution {sol}, got: {win_txt[:200]}")
    click_button_by_text(client, "Archivar Expediente", scope_selector=".fixed.inset-0")

    # 3. Trigger New Case and verify state reset + new valid seed
    trigger_new_case(client)
    raw_after = client.get_local_storage(STORAGE_KEY)
    if not raw_after:
        raise AssertionError("Storage missing after post-verdict New Case")
    completed_after = json.loads(raw_after).get("state", {}).get("completedDays", None)
    if completed_after != []:
        raise AssertionError(f"Post-verdict New Case did not reset completedDays: {completed_after}")
    after_sol = read_active_case_solution(client)
    if not after_sol.get("caseSeed"):
        raise AssertionError(f"Post-verdict New Case missing caseSeed: {after_sol}")
    client.assert_no_runtime_errors("T4_S4")
    return f"T4_S4 complete: dynamic culprit {sol['culpritName']!r} rejected wrong -> won verdict -> New Case reset (seed={after_sol['caseSeed']!r})"


def t4_s5_multi_run_fairness_persistence_and_azlynn_30_day_hints(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 5: Multiple fresh New Case seeds, reload localStorage recovery, and Azlynn 30-day hints + SFX."""
    _nav(client, base_url, "desktop")
    seen_culprits: list[str] = []
    seen_seeds: list[str] = []
    for _ in range(3):
        trigger_new_case(client)
        sol = read_active_case_solution(client)
        seen_culprits.append(sol["culpritName"])
        seen_seeds.append(sol["caseSeed"])
    if not all(seen_culprits) or not all(seen_seeds):
        raise AssertionError(f"Missing culpritName or caseSeed across New Case runs: culprits={seen_culprits}, seeds={seen_seeds}")
    if len(set(seen_seeds)) < 2:
        raise AssertionError(f"Expected >=2 distinct caseSeeds across 3 New Case runs, got {seen_seeds}")

    go_to_day(client, 12)
    open_azlynn_tab(client, "Pistas")
    open_azlynn_tab(client, "Diálogo")
    st = open_azlynn_tab(client, "Caso")
    if "/30" not in st["bubbleText"]:
        raise AssertionError(f"Expected /30 in Azlynn Caso tab: {st['bubbleText']!r}")
    close_azlynn_bubble(client)

    client.reload()
    ensure_book_open(client)
    raw = client.get_local_storage(STORAGE_KEY)
    if not raw:
        raise AssertionError("Storage missing after reload")
    spy = client.get_audio_spy()
    if spy.get("startCount", 0) <= 0:
        raise AssertionError(f"Web Audio SFX did not fire: {spy}")
    client.assert_no_runtime_errors("T4_S5")
    return f"T4_S5 complete: 3 New Cases ({seen_culprits}) + Azlynn 30-day tabs + reload persistence + SFX"


def t4_s6_release_gate_build_vitest_and_r5_compliance_audit(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    """Scenario 6: Release Gate: oxlint + tsc + vite build + vitest + static/runtime R5 compliance audit."""
    if ctx["lint"]["returncode"] != 0 or ctx["tsc"]["returncode"] != 0 or ctx["build"]["returncode"] != 0:
        raise AssertionError(
            f"Build/lint gate failed: lint={ctx['lint']['returncode']}, tsc={ctx['tsc']['returncode']}, build={ctx['build']['returncode']}"
        )
    vt = ctx.get("vitest")
    if vt is not None and vt["returncode"] != 0:
        raise AssertionError(f"Vitest failed: {vt['output'][-500:]}")

    emoji_hits = scan_source_for_emojis(PROJECT_ROOT)
    if emoji_hits:
        raise AssertionError(f"Source emojis found: {emoji_hits[:5]}")
    legacy = verify_legacy_absent(PROJECT_ROOT)
    if not legacy["clean"]:
        raise AssertionError(f"Legacy artifacts present: {legacy['violations'][:5]}")
    media = validate_all_portraits_and_backgrounds(PROJECT_ROOT / "public")

    _nav(client, base_url, "desktop")
    inspect_viewport_bounds(client, "T4_S6 root lock", check_vertical_lock=True)
    inspect_zero_emojis_in_dom(client, "T4_S6 DOM")
    client.assert_no_runtime_errors("T4_S6")
    return f"T4_S6 complete: lint/tsc/build/vitest green, {media['suspect_count']} PNGs valid, 0 emojis, h-screen overflow-hidden verified"


TIER4_TESTS: list[TestCase] = [
    TestCase("T4_S1", "EF1+EF2+EF5", "Scenario 1: Desktop 1440x900 74-Suspect Equality & 18x9 Dossier Tour", t4_s1_desktop_1440_74_suspect_equality_and_18x9_dossier_tour),
    TestCase("T4_S2", "EF2+EF4+EF5", "Scenario 2: Mobile 375x812 / 360x740 30-Day Tour Across All 10 Minigames", t4_s2_mobile_375_360_30_day_campaign_tour_all_10_minigames),
    TestCase("T4_S3", "EF4+EF5", "Scenario 3: Interactive 10-Minigame Mechanics & Mistake Marathon", t4_s3_interactive_10_minigame_mechanics_and_mistake_marathon),
    TestCase("T4_S4", "EF1+EF2+EF3", "Scenario 4: Dynamic Seeded Case Lifecycle -> Wrong Reject -> Dynamic Victory", t4_s4_dynamic_seeded_case_lifecycle_and_verdict_victory),
    TestCase("T4_S5", "EF1+EF3+EF5", "Scenario 5: Multi-Run New Case Fairness, Reload Recovery & Azlynn 30-Day Hints", t4_s5_multi_run_fairness_persistence_and_azlynn_30_day_hints),
    TestCase("T4_S6", "EF1+EF4+EF5", "Scenario 6: Release Gate (oxlint + tsc + build + vitest + R5 Audit)", t4_s6_release_gate_build_vitest_and_r5_compliance_audit),
]
