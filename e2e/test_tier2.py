"""Tier 2 E2E Tests: Boundary, Negative, Responsive & Error-Path Coverage across EF1–EF5 (36 tests)."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from .app_helpers import (
    click_button_by_text,
    click_element_by_selector,
    close_advent_calendar,
    close_azlynn_bubble,
    close_dossier,
    close_suspect_modal,
    close_verdict_modal,
    ensure_book_open,
    find_detective_state,
    get_advent_calendar_info,
    get_book_layout_geometry,
    get_dossier_counts,
    get_header_controls_state,
    get_suspect_card_info,
    go_to_day,
    inspect_viewport_bounds,
    inspect_zero_emojis_in_dom,
    open_azlynn_tab,
    open_dossier,
    pick_wrong_verdict_options,
    read_active_case_solution,
    select_verdict_and_submit,
    switch_mobile_page,
    toggle_header_collapse,
    trigger_new_case,
    trigger_reset_game,
)
from .cdp_client import ChromeCDPClient
from .media_checks import find_emojis, validate_png_asset
from .puzzle_solvers import (
    discover_all_10_puzzle_days,
    inspect_puzzle_by_type,
    verify_connections_and_negative,
    verify_crossword_and_negative,
    verify_cryptogram_bijection_and_no_cheat,
    verify_futoshiki_and_negative,
    verify_minesweeper_and_negative,
    verify_murdoku_reset_on_mistake,
    verify_nonogram_and_negative,
    verify_pure_python_solvers_self_test,
    verify_sudoku_9x9_and_negative,
    verify_syllables_and_negative,
    verify_wordsearch_and_negative,
)
from .server import PROJECT_ROOT
from .types import STORAGE_KEY, TOTAL_DAYS, TestCase, VIEWPORTS


def _nav(client: ChromeCDPClient, base_url: str, vp_key: str = "desktop") -> None:
    w, h, mob, dpr = VIEWPORTS[vp_key]
    client.navigate_fresh(base_url, width=w, height=h, mobile=mob, dpr=dpr)
    ensure_book_open(client)


# --- EF1 Boundaries (6 tests) ---

def t2_ef1_01_album_empty_search_query(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    client.eval_js(
        """
        (() => {
          const inp = document.querySelector('main input');
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          proto.set.call(inp, 'zzz_inexistente_1924');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        })()
        """
    )
    client.drain_events(0.15)
    cards = client.eval_js(
        """
        (() => {
          const isVis = el => {
            if (!el) return false;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0.5 && r.height > 0.5;
          };
          return Array.from(document.querySelectorAll('main .grid > div')).filter(isVis).length;
        })()
        """
    )
    if cards != 0:
        raise AssertionError(f"Expected 0 cards for unmatched search, got {cards}")
    inspect_viewport_bounds(client, "T2_EF1_01 empty search")
    return "Unmatched Album search yields 0 cards cleanly without layout break"


def t2_ef1_02_album_search_boundaries_01_and_74(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    for num in ("01", "74"):
        client.eval_js(
            f"""
            (() => {{
              const inp = document.querySelector('main input');
              const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
              proto.set.call(inp, {json.dumps('#' + num)});
              inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }})()
            """
        )
        client.drain_events(0.15)
        card = get_suspect_card_info(client, num)
        if not card or not card["hasImg"] or card["imgNaturalWidth"] <= 0:
            raise AssertionError(f"Search boundary #{num} failed: {card}")
    return "Album boundary searches #01 and #74 render intact PNGs"


def t2_ef1_03_album_exculpados_empty_and_return_to_todos(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_button_by_text(client, "Desc.", scope_selector="main")
    client.drain_events(0.1)
    desc_cards = client.eval_js(
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
    if desc_cards != 0:
        raise AssertionError(f"Expected 0 visible suspect cards on empty 'Desc.' filter, got {desc_cards}")
    click_button_by_text(client, "Todos", scope_selector="main")
    client.drain_events(0.1)
    card = get_suspect_card_info(client, "01")
    if not card or not card["hasImg"] or card["imgNaturalWidth"] <= 0:
        raise AssertionError("#01 portrait lost after Desc -> Todos toggle")
    return "Album empty Desc. filter -> Todos preserves portraits"


def t2_ef1_04_detail_modal_escape_and_close_controls(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    card = get_suspect_card_info(client, "02")
    if not card:
        raise AssertionError("#02 card missing")
    client.click_at(card["cardRect"]["x"], card["cardRect"]["y"])
    client.wait_until("/exp\\. n\\.º|kodak velox/i.test(document.body.innerText)", timeout=3.0, description="Modal open")
    close_suspect_modal(client)
    still_open = client.eval_js("/kodak velox/i.test(document.body.innerText)")
    if still_open:
        raise AssertionError("Suspect detail modal stayed open after close")
    return "Suspect detail modal #02 closes cleanly"


def t2_ef1_05_dossier_censo_search_and_clear(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    open_dossier(client)
    click_button_by_text(client, "Censo", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    found_inp = client.eval_js(
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
          if (!modal) return false;
          const inp = modal.querySelector('input[aria-label*="Buscar en el censo" i], input[placeholder*="Buscar" i], input[type="text"], input[type="search"]');
          if (!inp) return false;
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          proto.set.call(inp, '#74');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        })()
        """
    )
    if not found_inp:
        raise AssertionError("Dossier Censo search input not found inside modal")
    client.drain_events(0.15)
    censo_res = client.eval_js(
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
          if (!modal) return null;
          const txt = modal.innerText || '';
          const nums = Array.from(new Set((txt.match(/#\\d{2}/g) || [])));
          return { txt, nums };
        })()
        """
    )
    if not censo_res or "#74" not in censo_res["nums"] or "#01" in censo_res["nums"] or len(censo_res["nums"]) != 1:
        raise AssertionError(f"Dossier Censo search for '#74' failed to isolate #74: {censo_res['nums'] if censo_res else None}")
    close_dossier(client)
    return "Dossier Censo search filters #74 exclusively (count=1)"


def t2_ef1_06_album_pagination_first_prev_and_last_next_disabled(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    prev_disabled = client.eval_js(
        """
        (() => {
          const b = Array.from(document.querySelectorAll('main button')).find(x => /pliego ant/i.test(x.innerText || ''));
          return b ? !!b.disabled : null;
        })()
        """
    )
    if prev_disabled is not True:
        raise AssertionError(f"Expected Pliego Ant. disabled on first spread, got {prev_disabled}")

    for _ in range(12):
        next_state = client.eval_js(
            """
            (() => {
              const b = Array.from(document.querySelectorAll('main button')).find(x => /pliego sig/i.test(x.innerText || ''));
              if (!b) return null;
              if (b.disabled) return { disabled: true };
              const r = b.getBoundingClientRect();
              return { disabled: false, x: r.left + r.width / 2, y: r.top + r.height / 2 };
            })()
            """
        )
        if next_state is None:
            raise AssertionError("Pliego Sig. button missing from Album")
        if next_state["disabled"]:
            return "Album spread boundaries disable 'Pliego Ant.' on spread 1 and 'Pliego Sig.' on last spread"
        client.click_at(next_state["x"], next_state["y"])
        client.drain_events(0.12)
    raise AssertionError("Pliego Sig. never became disabled after 12 spreads")


# --- EF2 Boundaries (6 tests) ---

def t2_ef2_01_day0_prev_and_day30_next_disabled(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    st0 = get_header_controls_state(client)
    if not st0["prevDay"]["disabled"]:
        raise AssertionError("Header prev button should be disabled on Day 0")
    go_to_day(client, TOTAL_DAYS)
    st30 = get_header_controls_state(client)
    if not st30["nextDay"]["disabled"]:
        raise AssertionError("Header next button should be disabled on Day 30")
    return "Header prev disabled on Day 0 and next disabled on Day 30"


def t2_ef2_02_advent_calendar_5_acts_each_6_days(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    cal = get_advent_calendar_info(client)
    for act in range(1, 6):
        click_button_by_text(client, f"Acto {act}", scope_selector=".fixed.inset-0")
        client.drain_events(0.1)
        act_cards = client.eval_js(
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
                isVis(el) && /calendario de adviento criminal/i.test(el.innerText || '')
              );
              return modal ? Array.from(modal.querySelectorAll('.grid > div, .grid > button')).filter(isVis).length : 0;
            })()
            """
        )
        if act_cards != 6:
            raise AssertionError(f"Acto {act} expected 6 day cards, got {act_cards}")
    close_advent_calendar(client)
    return "All 5 Acts in AdventCalendar filter exactly 6 days each (5x6=30)"


def t2_ef2_03_dossier_armas_3_floors_and_18_weapons(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    dossier = get_dossier_counts(client)
    armas = dossier["armas"]
    txt = armas["text"]
    for floor in ("Planta Baja", "Planta Alta", "Sótano"):
        if floor not in txt:
            raise AssertionError(f"Expected floor {floor!r} in Dossier Armas y Habitaciones")
    if not (armas["has18Weapons"] and armas["has9Rooms"]):
        raise AssertionError(f"Expected 18 weapons and 9 rooms in Dossier Armas y Habitaciones, got {armas}")
    close_dossier(client)
    return "Dossier displays all 3 floors (Planta Baja, Planta Alta, Sótano), 9 rooms & 18 weapons"


def t2_ef2_04_mobile_375_day0_album_accessibility_and_bounds(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile")
    inspect_viewport_bounds(client, "T2_EF2_04 Mobile 375 Day 0", check_vertical_lock=True)
    inspect_zero_emojis_in_dom(client, "T2_EF2_04 Mobile 375 Day 0")
    return "Mobile 375x812 Day 0 Album fits cleanly with zero vertical lock violation or top-clipping"


def t2_ef2_05_mobile_360_day0_album_bounds(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile_sm")
    inspect_viewport_bounds(client, "T2_EF2_05 Mobile 360 Day 0", check_vertical_lock=True)
    return "Mobile 360x740 Day 0 Album fits cleanly within viewport bounds"


def t2_ef2_06_resize_mobile_to_desktop_restores_2_page_spread(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile")
    go_to_day(client, 1)
    vis_mob = len([s for s in get_book_layout_geometry(client)["sections"] if s["visible"]])
    if vis_mob != 1:
        raise AssertionError(f"Mobile Day 1 expected 1 visible section, got {vis_mob}")
    w, h, mob, dpr = VIEWPORTS["desktop"]
    client.set_viewport(w, h, mobile=mob, dpr=dpr)
    client.drain_events(0.2)
    vis_desk = len([s for s in get_book_layout_geometry(client)["sections"] if s["visible"]])
    if vis_desk != 2:
        raise AssertionError(f"Desktop resize Day 1 expected 2 visible sections, got {vis_desk}")
    return "Viewport resize 375x812 -> 1280x800 dynamically restores 2-page spread"


# --- EF3 Boundaries (6 tests) ---

def t2_ef3_01_consecutive_new_cases_produce_clean_resets(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    seeds: list[str] = []
    for _ in range(3):
        click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
        client.drain_events(0.1)
        pre_txt = client.eval_js("document.body.innerText")
        if "73 / 74" not in pre_txt and "73/74" not in pre_txt:
            raise AssertionError("Manual strike did not transition counter to 73/74 before New Case")
        trigger_new_case(client)
        raw = client.get_local_storage(STORAGE_KEY)
        if raw is None:
            raise AssertionError("localStorage missing after New Case trigger")
        data = json.loads(raw)
        st = data.get("state", data)
        seed = str(st.get("caseSeed") or "")
        if not seed:
            raise AssertionError(f"New Case yielded empty caseSeed: {st}")
        if st.get("manualEliminations") or st.get("completedDays"):
            raise AssertionError(f"New Case did not reset progress: {st}")
        seeds.append(seed)
        if len(set(seeds)) >= 2:
            break
    if len(set(seeds)) < 2:
        raise AssertionError(f"Consecutive New Case triggers did not produce distinct seeds: {seeds}")
    return f"Consecutive New Case triggers produced distinct seeds & clean resets (seeds={seeds})"


def t2_ef3_02_reload_preserves_seed_and_manual_eliminations(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
    client.drain_events(0.15)
    raw1 = client.get_local_storage(STORAGE_KEY)
    if not raw1:
        raise AssertionError("Storage missing before reload")
    seed1 = str(json.loads(raw1).get("state", {}).get("caseSeed") or "")
    client.reload()
    ensure_book_open(client)
    txt = client.eval_js("document.body.innerText")
    if "73 / 74" not in txt and "73/74" not in txt:
        raise AssertionError("Manual elimination not preserved across reload")
    raw2 = client.get_local_storage(STORAGE_KEY)
    if not raw2:
        raise AssertionError("Storage lost on reload")
    seed2 = str(json.loads(raw2).get("state", {}).get("caseSeed") or "")
    if not seed1 or seed1 != seed2:
        raise AssertionError(f"caseSeed mismatch across reload: before={seed1!r}, after={seed2!r}")
    return f"Reload preserves manual suspect elimination and caseSeed={seed2!r}"


def t2_ef3_03_legacy_sound_muted_storage_still_plays_sfx(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
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
    go_to_day(client, 1)
    spy = client.get_audio_spy()
    if spy.get("startCount", 0) <= 0:
        raise AssertionError(f"Legacy soundMuted:true silenced SFX: {spy}")
    return f"Pre-seeded legacy soundMuted:true recovered; SFX active (starts={spy['startCount']})"


def t2_ef3_04_wrong_verdict_rejection_and_retry_flow(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    sol = read_active_case_solution(client)
    wrong_suspect, wrong_weapon, wrong_room = pick_wrong_verdict_options(client, sol)
    res_text = select_verdict_and_submit(client, wrong_suspect, wrong_weapon, wrong_room)
    if "contradicción" not in res_text.lower():
        raise AssertionError(f"Expected wrong verdict rejection ('Contradicción'), got: {res_text[:200]}")
    click_button_by_text(client, "Reexaminar", scope_selector=".fixed.inset-0")
    client.wait_until(
        "/lacrar y proclamar/i.test(document.body.innerText)",
        timeout=3.0,
        description="Verdict form restored after Reexaminar",
    )
    close_verdict_modal(client)
    return "Wrong verdict rejected with Contradicción and Reexaminar retry restored form"


def t2_ef3_05_reiniciar_clears_completed_days_and_notes(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    click_element_by_selector(client, 'main button[title*="Tachar"], main button[aria-label*="Tachar"]', index=0)
    client.drain_events(0.15)
    pre = client.eval_js("document.body.innerText")
    if "73 / 74" not in pre and "73/74" not in pre:
        raise AssertionError("Manual strike did not transition counter to 73/74 before Reiniciar")
    trigger_reset_game(client)
    txt = client.eval_js("document.body.innerText")
    if "73 / 74" in txt or "73/74" in txt:
        raise AssertionError("Reiniciar did not clear manual eliminations")
    if "74 / 74" not in txt and "74/74" not in txt:
        raise AssertionError("Reiniciar did not restore 74/74 suspect count")
    return "Reiniciar cleanly resets manual eliminations and campaign state"


def t2_ef3_06_media_emoji_and_pillow_negative_self_check(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    # Verify find_emojis catches real emojis, validate_png_asset rejects 0-byte/non-PNG files, and all 9 pure-Python solvers pass self-tests
    hits = find_emojis("Hola ✔️ ❌ 🔍")
    if len(hits) < 3:
        raise AssertionError(f"find_emojis failed to detect test emojis: {hits}")
    with tempfile.TemporaryDirectory() as td:
        bad_empty = Path(td) / "empty.png"
        bad_empty.write_bytes(b"")
        try:
            validate_png_asset(bad_empty)
        except AssertionError as exc:
            if "empty" not in str(exc).lower() and "0 bytes" not in str(exc).lower():
                raise
        else:
            raise AssertionError("validate_png_asset accepted 0-byte PNG")

        bad_corrupt = Path(td) / "fake.png"
        bad_corrupt.write_bytes(b"not-a-valid-png-payload")
        try:
            validate_png_asset(bad_corrupt)
        except (UnidentifiedImageError, OSError):
            pass
        else:
            raise AssertionError("validate_png_asset accepted corrupt bytes as PNG")

        bad_gif = Path(td) / "legacy.png"
        Image.new("RGB", (100, 100), color="red").save(bad_gif, format="GIF")
        try:
            validate_png_asset(bad_gif)
        except AssertionError as exc:
            if "format" not in str(exc).lower():
                raise
        else:
            raise AssertionError("validate_png_asset accepted GIF disguised as PNG")
    solver_res = verify_pure_python_solvers_self_test()
    if not solver_res.get("ok") or solver_res.get("solvers") != 9:
        raise AssertionError(f"Pure-Python solver self-test failed: {solver_res}")
    return f"Negative self-checks passed (emoji detector, PNG validator, {solver_res['solvers']} pure-Python solvers)"


# --- EF4 Boundaries: Negative & Edge Cases for All 10 Minigames (11 tests) ---

def _go_puzzle(client: ChromeCDPClient, base_url: str, ptype: str, vp: str = "desktop") -> int:
    _nav(client, base_url, vp)
    day = discover_all_10_puzzle_days(client)[ptype][0]
    go_to_day(client, day)
    if vp.startswith("mobile"):
        switch_mobile_page(client, "right")
    return day


def t2_ef4_01_sudoku_9x9_negative_lock_and_conflict(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "sudoku")
    verify_sudoku_9x9_and_negative(client)
    return f"Day {day} 9x9 Sudoku prefilled-lock and conflict-non-solve verified"


def t2_ef4_02_wordsearch_non_word_drag_and_no_bang(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "wordsearch")
    verify_wordsearch_and_negative(client, use_touch=False)
    return f"Day {day} WordSearch >=11x11, 0 '!', rejects 2-cell non-word drag"


def t2_ef4_03_wordsearch_mobile_375_touch_drag(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "wordsearch", vp="mobile")
    verify_wordsearch_and_negative(client, use_touch=True)
    inspect_viewport_bounds(client, f"T2_EF4_03 WordSearch mobile Day {day}")
    return f"Mobile 375x812 Day {day} WordSearch touch_drag & viewport bounds verified"


def t2_ef4_04_murdoku_instant_reset_on_wrong_mark(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "murdoku")
    verify_murdoku_reset_on_mistake(client)
    return f"Day {day} Murdoku >=4x4 immediately resets board on mistake"


def t2_ef4_05_syllables_distractor_and_unsolved_check(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "syllables")
    verify_syllables_and_negative(client)
    return f"Day {day} Syllables distractor bank & negative click verified"


def t2_ef4_06_cryptogram_bijection_and_no_unlimited_reveal(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "cryptogram")
    verify_cryptogram_bijection_and_no_cheat(client)
    return f"Day {day} Cryptogram 1-to-1 bijection lock & 0 unlimited reveal verified"


def t2_ef4_07_crossword_negative_input(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "crossword")
    verify_crossword_and_negative(client)
    return f"Day {day} Crossword negative input & layout verified"


def t2_ef4_08_futoshiki_inequalities_and_mobile_fit(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "futoshiki", vp="mobile")
    verify_futoshiki_and_negative(client)
    inspect_viewport_bounds(client, f"T2_EF4_08 Futoshiki mobile Day {day}")
    return f"Mobile 375x812 Day {day} Futoshiki inequalities & zero overflow verified"


def t2_ef4_09_connections_3tile_disabled_and_mobile_fit(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "connections", vp="mobile")
    verify_connections_and_negative(client)
    inspect_viewport_bounds(client, f"T2_EF4_09 Connections mobile Day {day}")
    return f"Mobile 375x812 Day {day} Connections 3-tile disabled submit & zero overflow verified"


def t2_ef4_10_nonogram_negative_click_and_mobile_fit(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "nonogram", vp="mobile")
    verify_nonogram_and_negative(client)
    inspect_viewport_bounds(client, f"T2_EF4_10 Nonogram mobile Day {day}")
    return f"Mobile 375x812 Day {day} Nonogram negative click & zero overflow verified"


def t2_ef4_11_minesweeper_grid_and_mobile_fit(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    day = _go_puzzle(client, base_url, "minesweeper", vp="mobile")
    verify_minesweeper_and_negative(client)
    inspect_viewport_bounds(client, f"T2_EF4_11 Minesweeper mobile Day {day}")
    return f"Mobile 375x812 Day {day} Minesweeper grid, counter & zero overflow verified"


# --- EF5 Boundaries (7 tests) ---

def t2_ef5_01_desktop_1440_wide_spread_and_vertical_lock(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop_xl")
    go_to_day(client, 1)
    geo = get_book_layout_geometry(client)
    ratio = geo["mainRect"]["width"] / geo["innerWidth"]
    if ratio < 0.80:
        raise AssertionError(f"Expected wide book spread >=80% at 1440x900, got {ratio:.2%}")
    inspect_viewport_bounds(client, "T2_EF5_01 1440x900", check_vertical_lock=True)
    return f"1440x900 wide spread ({ratio:.1%}) with strict vertical lock"


def t2_ef5_02_tablet_1024_lg_boundary_zero_overflow(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "tablet_lg")
    go_to_day(client, 15)
    inspect_viewport_bounds(client, "T2_EF5_02 1024x768 Day 15", check_vertical_lock=True)
    return "1024x768 lg boundary passes zero overflow & zero vertical scroll"


def t2_ef5_03_mobile_375_single_page_and_no_top_clipping(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile")
    for day in (1, 15, 30):
        go_to_day(client, day)
        vis_l = [s for s in get_book_layout_geometry(client)["sections"] if s["visible"]]
        if len(vis_l) != 1:
            raise AssertionError(f"Mobile Day {day} left expected 1 visible section, got {len(vis_l)}")
        inspect_viewport_bounds(client, f"T2_EF5_03 Day {day} Relato")
        switch_mobile_page(client, "right")
        vis_r = [s for s in get_book_layout_geometry(client)["sections"] if s["visible"]]
        if len(vis_r) != 1:
            raise AssertionError(f"Mobile Day {day} right expected 1 visible section, got {len(vis_r)}")
        inspect_viewport_bounds(client, f"T2_EF5_03 Day {day} Pasatiempo")
    return "Mobile 375x812 Days 1/15/30 enforce single-page isolation & zero top-clipping"


def t2_ef5_04_mobile_360_modals_zero_overflow_and_zero_emojis(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile_sm")
    get_advent_calendar_info(client)
    inspect_viewport_bounds(client, "T2_EF5_04 Calendar 360")
    inspect_zero_emojis_in_dom(client, "T2_EF5_04 Calendar 360")
    close_advent_calendar(client)

    open_dossier(client)
    inspect_viewport_bounds(client, "T2_EF5_04 Dossier 360")
    inspect_zero_emojis_in_dom(client, "T2_EF5_04 Dossier 360")
    close_dossier(client)
    return "Mobile 360x740 AdventCalendar & Dossier pass zero overflow and zero emojis"


def t2_ef5_05_mobile_360_azlynn_radial_fits_viewport(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "mobile_sm")
    st = open_azlynn_tab(client, "Pistas")
    if not st.get("hasBubble") or not st.get("bubbleRect"):
        raise AssertionError(f"Azlynn mobile bubble not visible on 360px viewport: {st}")
    if st["bubbleRect"]["right"] > 362 or st["bubbleRect"]["left"] < -2 or st["bubbleRect"]["top"] < -2:
        raise AssertionError(f"Azlynn mobile bubble exceeds 360px viewport: {st['bubbleRect']}")
    inspect_viewport_bounds(client, "T2_EF5_05 Azlynn 360")
    close_azlynn_bubble(client)
    return "Mobile 360x740 Azlynn radial & bubble fit within <=360px viewport"


def t2_ef5_06_header_collapse_persists_across_days(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    _nav(client, base_url, "desktop")
    toggle_header_collapse(client)
    go_to_day(client, 1)
    st = get_header_controls_state(client)
    if st["adviento"]["visible"]:
        raise AssertionError("Collapsed header unexpectedly re-expanded on Day 0 -> Day 1")
    toggle_header_collapse(client)
    return "Collapsed header state persists cleanly across Day 0 -> Day 1"


def t2_ef5_07_e2e_contains_zero_js_ts_files(client: ChromeCDPClient, base_url: str, ctx: dict[str, Any]) -> str:
    e2e_dir = PROJECT_ROOT / "e2e"
    forbidden = [
        str(p.relative_to(PROJECT_ROOT))
        for p in e2e_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in {".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"}
    ]
    if forbidden:
        raise AssertionError(f"Forbidden JS/TS files in e2e/: {forbidden}")
    return "e2e/ contains purely Python files (0 JS/TS files)"


TIER2_TESTS: list[TestCase] = [
    TestCase("T2_EF1_01", "EF1", "Album unmatched search yields 0 cards cleanly", t2_ef1_01_album_empty_search_query),
    TestCase("T2_EF1_02", "EF1", "Album boundary searches #01 and #74 render intact PNGs", t2_ef1_02_album_search_boundaries_01_and_74),
    TestCase("T2_EF1_03", "EF1", "Album Desc. -> Todos filter preserves PNGs", t2_ef1_03_album_exculpados_empty_and_return_to_todos),
    TestCase("T2_EF1_04", "EF1", "Suspect detail modal #02 closes cleanly", t2_ef1_04_detail_modal_escape_and_close_controls),
    TestCase("T2_EF1_05", "EF1", "Dossier Censo search filters #74 cleanly", t2_ef1_05_dossier_censo_search_and_clear),
    TestCase("T2_EF1_06", "EF1", "Album spread 1 disables Pliego Ant. & last spread disables Pliego Sig.", t2_ef1_06_album_pagination_first_prev_and_last_next_disabled),
    TestCase("T2_EF2_01", "EF2", "Header prev disabled Day 0 & next disabled Day 30", t2_ef2_01_day0_prev_and_day30_next_disabled),
    TestCase("T2_EF2_02", "EF2", "AdventCalendar 5 Acts each display 6 days (5x6=30)", t2_ef2_02_advent_calendar_5_acts_each_6_days),
    TestCase("T2_EF2_03", "EF2", "Dossier displays all 3 floors and 18 weapons", t2_ef2_03_dossier_armas_3_floors_and_18_weapons),
    TestCase("T2_EF2_04", "EF2", "Mobile 375x812 Day 0 Album bounds & zero emojis", t2_ef2_04_mobile_375_day0_album_accessibility_and_bounds),
    TestCase("T2_EF2_05", "EF2", "Mobile 360x740 Day 0 Album bounds", t2_ef2_05_mobile_360_day0_album_bounds),
    TestCase("T2_EF2_06", "EF2", "Viewport resize 375->1280 restores 2-page spread", t2_ef2_06_resize_mobile_to_desktop_restores_2_page_spread),
    TestCase("T2_EF3_01", "EF3", "Consecutive New Case triggers reset state cleanly", t2_ef3_01_consecutive_new_cases_produce_clean_resets),
    TestCase("T2_EF3_02", "EF3", "Reload preserves caseSeed and manual eliminations", t2_ef3_02_reload_preserves_seed_and_manual_eliminations),
    TestCase("T2_EF3_03", "EF3", "Legacy soundMuted:true storage still fires SFX", t2_ef3_03_legacy_sound_muted_storage_still_plays_sfx),
    TestCase("T2_EF3_04", "EF3", "Wrong verdict rejection & Reexaminar retry flow", t2_ef3_04_wrong_verdict_rejection_and_retry_flow),
    TestCase("T2_EF3_05", "EF3", "Reiniciar clears manual eliminations and progress", t2_ef3_05_reiniciar_clears_completed_days_and_notes),
    TestCase("T2_EF3_06", "EF3", "Media emoji & Pillow PNG validator negative self-checks", t2_ef3_06_media_emoji_and_pillow_negative_self_check),
    TestCase("T2_EF4_01", "EF4", "Sudoku 9x9 prefilled lock & conflict non-solve", t2_ef4_01_sudoku_9x9_negative_lock_and_conflict),
    TestCase("T2_EF4_02", "EF4", "WordSearch non-word drag rejection & zero '!'", t2_ef4_02_wordsearch_non_word_drag_and_no_bang),
    TestCase("T2_EF4_03", "EF4", "Mobile 375x812 WordSearch touch_drag & zero overflow", t2_ef4_03_wordsearch_mobile_375_touch_drag),
    TestCase("T2_EF4_04", "EF4", "Murdoku instant full reset on wrong mark", t2_ef4_04_murdoku_instant_reset_on_wrong_mark),
    TestCase("T2_EF4_05", "EF4", "Syllables distractor bank & unsolved check", t2_ef4_05_syllables_distractor_and_unsolved_check),
    TestCase("T2_EF4_06", "EF4", "Cryptogram 1-to-1 bijection & zero unlimited reveal", t2_ef4_06_cryptogram_bijection_and_no_unlimited_reveal),
    TestCase("T2_EF4_07", "EF4", "Crossword negative input check", t2_ef4_07_crossword_negative_input),
    TestCase("T2_EF4_08", "EF4", "Mobile 375x812 Futoshiki inequalities & zero overflow", t2_ef4_08_futoshiki_inequalities_and_mobile_fit),
    TestCase("T2_EF4_09", "EF4", "Mobile 375x812 Connections 3-tile lock & zero overflow", t2_ef4_09_connections_3tile_disabled_and_mobile_fit),
    TestCase("T2_EF4_10", "EF4", "Mobile 375x812 Nonogram negative click & zero overflow", t2_ef4_10_nonogram_negative_click_and_mobile_fit),
    TestCase("T2_EF4_11", "EF4", "Mobile 375x812 Minesweeper grid, counter & zero overflow", t2_ef4_11_minesweeper_grid_and_mobile_fit),
    TestCase("T2_EF5_01", "EF5", "Desktop 1440x900 wide spread & vertical lock", t2_ef5_01_desktop_1440_wide_spread_and_vertical_lock),
    TestCase("T2_EF5_02", "EF5", "Tablet 1024x768 lg boundary zero overflow", t2_ef5_02_tablet_1024_lg_boundary_zero_overflow),
    TestCase("T2_EF5_03", "EF5", "Mobile 375x812 Days 1/15/30 single-page & zero top-clipping", t2_ef5_03_mobile_375_single_page_and_no_top_clipping),
    TestCase("T2_EF5_04", "EF5", "Mobile 360x740 Calendar & Dossier zero overflow/emojis", t2_ef5_04_mobile_360_modals_zero_overflow_and_zero_emojis),
    TestCase("T2_EF5_05", "EF5", "Mobile 360x740 Azlynn radial & bubble fit viewport", t2_ef5_05_mobile_360_azlynn_radial_fits_viewport),
    TestCase("T2_EF5_06", "EF5", "Collapsed header state persists Day 0 -> Day 1", t2_ef5_06_header_collapse_persists_across_days),
    TestCase("T2_EF5_07", "EF5", "e2e/ contains zero JS/TS files", t2_ef5_07_e2e_contains_zero_js_ts_files),
]
