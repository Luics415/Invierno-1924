"""Tier 3 E2E Tests: Pairwise Cross-Feature Combinations across EF1–EF5 (10 tests)."""

from __future__ import annotations

import json
import re
from typing import Any

from .app_helpers import (
    click_button_by_text,
    click_element_by_selector,
    close_azlynn_bubble,
    close_dossier,
    close_suspect_modal,
    close_verdict_modal,
    ensure_book_open,
    get_background_and_snow_state,
    get_book_layout_geometry,
    get_dossier_counts,
    get_header_controls_state,
    get_suspect_card_info,
    get_suspect_modal_info,
    go_to_day,
    inspect_viewport_bounds,
    inspect_zero_emojis_in_dom,
    open_azlynn_tab,
    open_dossier,
    pick_wrong_verdict_options,
    read_active_case_solution,
    select_verdict_and_submit,
    switch_mobile_page,
    toggle_book_cover,
    toggle_header_collapse,
    trigger_new_case,
)
from .cdp_client import ChromeCDPClient
from .puzzle_solvers import (
    discover_all_10_puzzle_days,
    solve_sudoku_ui,
    verify_cryptogram_bijection_and_no_cheat,
)
from .types import STORAGE_KEY, TestCase, VIEWPORTS


def _nav(client: ChromeCDPClient, base_url: str, vp_key: str = "desktop") -> None:
    w, h, mob, dpr = VIEWPORTS[vp_key]
    client.navigate_fresh(base_url, width=w, height=h, mobile=mob, dpr=dpr)
    ensure_book_open(client)


def t3_01_collapsed_header_plus_wide_book_plus_snow_and_lock(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop_xl")
    toggle_header_collapse(client)
    geo = get_book_layout_geometry(client)
    bg = get_background_and_snow_state(client)
    ratio = geo["mainRect"]["width"] / geo["innerWidth"]
    outer_snow = [p for p in geo["snowParticles"] if p["left"] < geo["mainRect"]["left"] or p["right"] > geo["mainRect"]["right"]]
    inspect_viewport_bounds(client, "T3_01", check_vertical_lock=True)
    if ratio < 0.80 or bg["snowCount"] != 20 or not outer_snow:
        raise AssertionError(f"Pairwise EF2+EF5 failed: ratio={ratio:.2f}, snow={bg['snowCount']}, outer={len(outer_snow)}")
    return f"Collapsed header + wide book ({ratio:.1%}) + {len(outer_snow)} outer snow + vertical lock"


def t3_02_solve_sudoku_plus_dossier_clue_plus_album(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    sudoku_day = discover_all_10_puzzle_days(client)["sudoku"][0]
    go_to_day(client, sudoku_day)
    solve_sudoku_ui(client)

    open_dossier(client)
    click_button_by_text(client, "Pistas", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    dossier_txt = client.eval_js(
        """
        (() => {
          const isVis = el => {
            if (!el) return false;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0.5 && r.height > 0.5;
          };
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && /cuaderno del detective/i.test(el.innerText || '')
          );
          return modal ? (modal.innerText || '') : '';
        })()
        """
    )
    if not dossier_txt or not re.search(r"(?<!\d)1\s*/\s*30\b|\b1\s+pista\b", dossier_txt, re.IGNORECASE):
        raise AssertionError(f"Unlocked clue (1/30) did not reflect in Dossier -> Pistas Obtenidas: {dossier_txt[:200]!r}")
    close_dossier(client)
    go_to_day(client, 0)
    album_cards = client.eval_js(
        """
        (() => {
          const isVis = el => {
            if (!el) return false;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0.5 && r.height > 0.5;
          };
          return Array.from(document.querySelectorAll('main .grid > div')).filter(
            c => isVis(c) && /#\\d{2}/.test(c.innerText || '')
          ).length;
        })()
        """
    )
    if not album_cards or album_cards < 1:
        raise AssertionError(f"Album failed to render visible suspect cards after returning from Dossier: {album_cards}")
    card1 = get_suspect_card_info(client, "01")
    if not card1 or not card1["hasImg"] or card1["imgNaturalWidth"] <= 0:
        raise AssertionError(f"Album card #01 portrait broken after returning from Dossier: {card1}")
    client.assert_no_runtime_errors("T3_02")
    return f"Solved Day {sudoku_day} 9x9 Sudoku -> Dossier clue unlocked (1/30) -> Album verified"


def t3_03_mobile_375_album_filter_modal_zero_emojis(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile")
    click_button_by_text(client, "Familia", scope_selector="main")
    client.drain_events(0.15)
    inspect_viewport_bounds(client, "T3_03 mobile Familia")
    card = get_suspect_card_info(client, "01")
    if not card or not card["hasImg"] or card["imgNaturalWidth"] <= 0:
        raise AssertionError(f"Mobile Familia #01 portrait failed: {card}")
    client.click_at(card["cardRect"]["x"], card["cardRect"]["y"])
    modal = get_suspect_modal_info(client)
    if not modal or modal["imgNaturalWidth"] <= 0:
        raise AssertionError(f"Mobile detail modal #01 portrait failed: {modal}")
    inspect_viewport_bounds(client, "T3_03 mobile modal")
    inspect_zero_emojis_in_dom(client, "T3_03 mobile modal")
    close_suspect_modal(client)
    return "Mobile 375x812 Familia filter + #01 PNG + Detail Modal zero overflow & zero emojis"


def t3_04_mobile_360_cross_day_and_azlynn_context(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile_sm")
    go_to_day(client, 1)
    h1 = open_azlynn_tab(client, "Pistas")["bubbleText"]
    close_azlynn_bubble(client)
    go_to_day(client, 30)
    switch_mobile_page(client, "right")
    inspect_viewport_bounds(client, "T3_04 Day 30 mobile")
    h30 = open_azlynn_tab(client, "Pistas")["bubbleText"]
    close_azlynn_bubble(client)
    if not h1 or not h30 or h1 == h30:
        raise AssertionError(f"Expected distinct Azlynn contextual hints Day 1 vs Day 30: {h1!r} vs {h30!r}")
    return "Mobile 360x740 Day 1 -> Day 30 maintains single-page isolation & updates Azlynn context"


def t3_05_seeded_muted_plus_collapse_plus_sfx(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    w, h, mob, dpr = VIEWPORTS["desktop"]
    client.navigate_fresh(
        base_url,
        width=w,
        height=h,
        mobile=mob,
        dpr=dpr,
        seed_storage={STORAGE_KEY: json.dumps({"state": {"soundMuted": True, "currentDay": 0}, "version": 0})},
    )
    ensure_book_open(client)
    toggle_header_collapse(client)
    toggle_header_collapse(client)
    go_to_day(client, 2)
    spy = client.get_audio_spy()
    hdr = get_header_controls_state(client)
    if hdr["muteButtons"] or spy.get("startCount", 0) <= 0:
        raise AssertionError(f"Expected no mute button & active SFX: mute={hdr['muteButtons']}, spy={spy}")
    return f"Legacy muted + collapse/expand + Web Audio SFX active (starts={spy['startCount']})"


def t3_06_solve_puzzle_reload_persists_completion(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    sudoku_day = discover_all_10_puzzle_days(client)["sudoku"][0]
    go_to_day(client, sudoku_day)
    solve_sudoku_ui(client)
    client.reload()
    ensure_book_open(client)
    hdr = get_header_controls_state(client)
    if "1/30" not in hdr["headerText"] and "1 / 30" not in hdr["headerText"]:
        raise AssertionError(f"Solved day count 1/30 did not persist in header across reload: {hdr['headerText']}")
    go_to_day(client, sudoku_day)
    recto_txt = client.eval_js("(document.querySelector('main section.page-recto') || document.querySelector('main'))?.innerText || ''")
    if "lacrado" not in recto_txt.lower():
        raise AssertionError(f"Solved puzzle Day {sudoku_day} recto did not persist 'Lacrado' state across reload")
    return f"Solved Day {sudoku_day} (1/30 & Lacrado) persists across reload"


def t3_07_dossier_all_tabs_plus_wrong_verdict_retry(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    dossier = get_dossier_counts(client)
    if dossier["censo"]["suspectCount"] != 74:
        raise AssertionError(f"Expected 74 suspects in Censo: {dossier['censo']}")
    if not (dossier["armas"]["has18Weapons"] and dossier["armas"]["has9Rooms"]):
        raise AssertionError(f"Expected 18 weapons & 9 rooms in Armas: {dossier['armas']}")
    close_dossier(client)
    sol = read_active_case_solution(client)
    wrong_suspect, wrong_weapon, wrong_room = pick_wrong_verdict_options(client, sol)
    res_txt = select_verdict_and_submit(client, wrong_suspect, wrong_weapon, wrong_room)
    if "contradicción" not in res_txt.lower():
        raise AssertionError(f"Wrong verdict was not rejected: {res_txt[:200]}")
    click_button_by_text(client, "Reexaminar", scope_selector=".fixed.inset-0")
    close_verdict_modal(client)
    return "Dossier 74x18x9 inspection + FinalVerdict wrong/retry flow verified"


def t3_08_mid_campaign_new_case_resets_solved_day(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    sudoku_day = discover_all_10_puzzle_days(client)["sudoku"][0]
    go_to_day(client, sudoku_day)
    solve_sudoku_ui(client)
    trigger_new_case(client)
    hdr = get_header_controls_state(client)
    raw = client.get_local_storage(STORAGE_KEY)
    if not raw:
        raise AssertionError("localStorage missing after mid-campaign New Case")
    completed = json.loads(raw).get("state", {}).get("completedDays", None)
    if completed != []:
        raise AssertionError(f"New Case did not clear completedDays in localStorage: {completed}")
    if "1/30" in hdr["headerText"] or "1 / 30" in hdr["headerText"]:
        raise AssertionError(f"New Case did not reset completed counter: {hdr['headerText']}")
    if "0/30" not in hdr["headerText"] and "0 / 30" not in hdr["headerText"]:
        raise AssertionError(f"Expected 0/30 in header after New Case, got: {hdr['headerText']}")
    return "Mid-campaign New Case resets completed 1/30 -> 0/30 cleanly"


def t3_09_mobile_375_cryptogram_plus_azlynn_non_blocking(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile")
    cday = discover_all_10_puzzle_days(client)["cryptogram"][0]
    go_to_day(client, cday)
    switch_mobile_page(client, "right")
    verify_cryptogram_bijection_and_no_cheat(client)
    open_azlynn_tab(client, "Diálogo")
    inspect_viewport_bounds(client, "T3_09 mobile cryptogram + Azlynn")
    close_azlynn_bubble(client)
    return f"Mobile 375x812 Day {cday} Cryptogram + Azlynn bubble non-blocking & 0 overflow"


def t3_10_book_cover_flip_plus_day30_plus_zero_runtime_errors(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    toggle_book_cover(client, "back")
    click_button_by_text(client, "Abrir Libreta")
    client.wait_until("!!document.querySelector('main')", timeout=4.0, description="Reopened")
    go_to_day(client, 30)
    inspect_viewport_bounds(client, "T3_10 Day 30")
    inspect_zero_emojis_in_dom(client, "T3_10 Day 30")
    client.assert_no_runtime_errors("T3_10")
    return "Book cover flip -> reopen -> Day 30 with 0 emojis & 0 runtime errors"


TIER3_TESTS: list[TestCase] = [
    TestCase("T3_01", "EF2+EF5", "Collapsed header + wide 1440x900 book + snow margins + vertical lock", t3_01_collapsed_header_plus_wide_book_plus_snow_and_lock),
    TestCase("T3_02", "EF1+EF4", "Solve 9x9 Sudoku -> Dossier clue unlocked -> Album updated", t3_02_solve_sudoku_plus_dossier_clue_plus_album),
    TestCase("T3_03", "EF1+EF5", "Mobile 375x812 Familia filter + #01 PNG + Detail Modal zero emojis", t3_03_mobile_375_album_filter_modal_zero_emojis),
    TestCase("T3_04", "EF2+EF4+EF5", "Mobile 360x740 Day 1->30 single-page + Azlynn context change", t3_04_mobile_360_cross_day_and_azlynn_context),
    TestCase("T3_05", "EF3+EF5", "Legacy soundMuted:true + collapse/expand + Web Audio SFX", t3_05_seeded_muted_plus_collapse_plus_sfx),
    TestCase("T3_06", "EF3+EF4", "Solve puzzle -> reload persists completion in localStorage", t3_06_solve_puzzle_reload_persists_completion),
    TestCase("T3_07", "EF1+EF2+EF3", "Dossier 74x18x9 inspection + wrong verdict retry flow", t3_07_dossier_all_tabs_plus_wrong_verdict_retry),
    TestCase("T3_08", "EF3+EF4", "Mid-campaign New Case resets solved 1/30 -> 0/30", t3_08_mid_campaign_new_case_resets_solved_day),
    TestCase("T3_09", "EF4+EF5", "Mobile 375x812 Cryptogram bijection + Azlynn non-blocking", t3_09_mobile_375_cryptogram_plus_azlynn_non_blocking),
    TestCase("T3_10", "EF1+EF3+EF5", "Book cover flip -> reopen -> Day 30 zero emojis/errors", t3_10_book_cover_flip_plus_day30_plus_zero_runtime_errors),
]
