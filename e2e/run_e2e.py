"""CLI runner for the Un Asesinato en Navidad (30-Day R1–R5 Edition) E2E suite (Tiers 1–4)."""

from __future__ import annotations

import os
import sys

# Ensure `e2e/` directory is removed from sys.path BEFORE importing `pathlib` (which imports stdlib `types`),
# and ensure PROJECT_ROOT is present even under `python -I` or arbitrary CWD.
if __package__ in (None, ""):
    _e2e_dir = os.path.normcase(os.path.dirname(os.path.abspath(__file__)))
    _project_root = os.path.dirname(_e2e_dir)
    sys.path[:] = [
        p for p in sys.path
        if os.path.normcase(os.path.abspath(p or ".")) != _e2e_dir
    ]
    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)

import argparse
import json
import time
from pathlib import Path
from typing import Any

from e2e.cdp_client import ChromeCDPClient
from e2e.server import (
    PROJECT_ROOT,
    VitePreviewServer,
    run_build,
    run_lint,
    run_tsc_app,
    run_vitest,
)
from e2e.test_tier1 import TIER1_TESTS
from e2e.test_tier2 import TIER2_TESTS
from e2e.test_tier3 import TIER3_TESTS
from e2e.test_tier4 import TIER4_TESTS
from e2e.types import TestCase

TIER_MAP: dict[int, list[TestCase]] = {
    1: TIER1_TESTS,
    2: TIER2_TESTS,
    3: TIER3_TESTS,
    4: TIER4_TESTS,
}


def list_tests(tiers: list[int], test_ids: set[str] | None = None) -> int:
    total = 0
    for tier in tiers:
        cases = [tc for tc in TIER_MAP[tier] if not test_ids or tc.test_id in test_ids]
        print(f"Tier {tier} ({len(cases)} tests):")
        for tc in cases:
            print(f"  - [{tc.test_id}] [{tc.feature}] {tc.description}")
        total += len(cases)
    print(f"Total selected: {total} tests")
    return 0 if total > 0 else 2


def run_suite(
    tiers: list[int],
    skip_build: bool = False,
    skip_vitest: bool = False,
    test_ids: set[str] | None = None,
    screenshots_dir: Path | None = None,
    command_timeout: float = 20.0,
) -> dict[str, Any]:
    # Run lint + tsc + vitest + optional build BEFORE VitePreviewServer so dist/ is never mutated mid-preview
    lint_res = run_lint(PROJECT_ROOT)
    tsc_res = run_tsc_app(PROJECT_ROOT)

    if skip_vitest:
        vitest_res = None
    else:
        pkg_json = PROJECT_ROOT / "package.json"
        has_test_script = pkg_json.exists() and '"test"' in pkg_json.read_text(encoding="utf-8", errors="replace")
        if has_test_script:
            vitest_res = run_vitest(PROJECT_ROOT)
        else:
            vitest_res = {
                "returncode": 1,
                "stdout": "",
                "stderr": "package.json missing 'test' script for Vitest",
                "output": "package.json missing 'test' script for Vitest",
            }

    if skip_build:
        dist_ok = (PROJECT_ROOT / "dist" / "index.html").exists()
        build_res = {
            "returncode": 0 if dist_ok else 1,
            "stdout": "",
            "stderr": "" if dist_ok else "dist/index.html missing (--skip-build)",
            "output": "skipped (--skip-build; dist/index.html present)" if dist_ok else "dist/index.html missing",
        }
    else:
        build_res = run_build(PROJECT_ROOT)

    ctx: dict[str, Any] = {
        "lint": lint_res,
        "tsc": tsc_res,
        "vitest": vitest_res,
        "build": build_res,
    }

    if screenshots_dir is not None:
        screenshots_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []
    tier_summaries: dict[str, dict[str, int]] = {}

    dist_index = PROJECT_ROOT / "dist" / "index.html"
    if not dist_index.exists():
        err_detail = f"RuntimeError: Built dist/index.html missing at {dist_index} ({build_res.get('output', '')})"
        for tier in tiers:
            cases = [tc for tc in TIER_MAP[tier] if not test_ids or tc.test_id in test_ids]
            if not cases:
                continue
            for tc in cases:
                results.append(
                    {
                        "tier": tier,
                        "id": tc.test_id,
                        "feature": tc.feature,
                        "description": tc.description,
                        "status": "FAIL",
                        "duration_s": 0.0,
                        "detail": err_detail,
                    }
                )
            tier_summaries[f"tier_{tier}"] = {
                "total": len(cases),
                "passed": 0,
                "failed": len(cases),
            }
        total_tests = sum(v["total"] for v in tier_summaries.values())
        print(f"\n=== E2E Aborted: {err_detail} ===", flush=True)
        return {
            "total": total_tests,
            "passed": 0,
            "failed": total_tests,
            "tiers": tier_summaries,
            "results": results,
        }

    with VitePreviewServer(PROJECT_ROOT) as server, ChromeCDPClient(command_timeout=command_timeout) as client:
        for tier in tiers:
            cases = [tc for tc in TIER_MAP[tier] if not test_ids or tc.test_id in test_ids]
            if not cases:
                continue
            passed = 0
            failed = 0
            print(f"\n=== Running Tier {tier} ({len(cases)} tests) on {server.base_url} ===", flush=True)
            for tc in cases:
                t_start = time.monotonic()
                status = "PASS"
                detail = ""
                screenshot_path: str | None = None
                try:
                    detail = tc.fn(client, server.base_url, ctx)
                    passed += 1
                except Exception as exc:
                    status = "FAIL"
                    detail = f"{type(exc).__name__}: {exc}"
                    failed += 1
                    if screenshots_dir is not None:
                        try:
                            png_bytes = client.capture_screenshot()
                            shot_file = screenshots_dir / f"{tc.test_id}_fail.png"
                            shot_file.write_bytes(png_bytes)
                            screenshot_path = str(shot_file)
                        except Exception:
                            pass
                elapsed = time.monotonic() - t_start
                print(
                    f"[{status}] [Tier {tier}][{tc.test_id}][{tc.feature}] {tc.description} ({elapsed:.2f}s) -> {detail}",
                    flush=True,
                )
                entry: dict[str, Any] = {
                    "tier": tier,
                    "id": tc.test_id,
                    "feature": tc.feature,
                    "description": tc.description,
                    "status": status,
                    "duration_s": round(elapsed, 3),
                    "detail": detail,
                }
                if screenshot_path:
                    entry["screenshot"] = screenshot_path
                results.append(entry)
            tier_summaries[f"tier_{tier}"] = {
                "total": len(cases),
                "passed": passed,
                "failed": failed,
            }

    total_passed = sum(v["passed"] for v in tier_summaries.values())
    total_failed = sum(v["failed"] for v in tier_summaries.values())
    total_tests = sum(v["total"] for v in tier_summaries.values())

    print("\n=== E2E Summary ===", flush=True)
    for k, v in tier_summaries.items():
        print(f"  {k}: {v['passed']}/{v['total']} PASS, {v['failed']} FAIL", flush=True)
    print(f"  TOTAL: {total_passed}/{total_tests} PASS, {total_failed} FAIL", flush=True)

    return {
        "total": total_tests,
        "passed": total_passed,
        "failed": total_failed,
        "tiers": tier_summaries,
        "results": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Un Asesinato en Navidad (30-Day R1-R5) E2E Suite")
    parser.add_argument(
        "--tier",
        type=int,
        action="append",
        choices=[1, 2, 3, 4],
        help="Tier(s) to execute (1, 2, 3, or 4). Repeatable.",
    )
    parser.add_argument("--all", action="store_true", help="Run all Tiers 1-4")
    parser.add_argument("--skip-build", action="store_true", help="Reuse existing dist/ without running npm run build")
    parser.add_argument("--skip-vitest", action="store_true", help="Skip running npm test -- --run")
    parser.add_argument("--list", action="store_true", help="List selected tests without launching browser")
    parser.add_argument("--test-id", nargs="+", default=None, help="Run only specific test IDs")
    parser.add_argument("--screenshots-dir", type=Path, default=None, help="Directory to save failure PNG screenshots")
    parser.add_argument("--json-out", type=Path, default=None, help="Optional JSON report output path")
    parser.add_argument("--timeout", type=float, default=20.0, help="Per-CDP command timeout in seconds")
    args = parser.parse_args(argv)

    if args.all or not args.tier:
        tiers = [1, 2, 3, 4]
    else:
        tiers = list(dict.fromkeys(args.tier))

    test_ids = set(args.test_id) if args.test_id else None
    if test_ids is not None:
        all_known_ids = {tc.test_id for cases in TIER_MAP.values() for tc in cases}
        unknown = sorted(test_ids - all_known_ids)
        if unknown:
            print(f"Error: Unknown --test-id(s): {unknown}", file=sys.stderr)
            return 2
        matched = sum(
            1 for tier in tiers for tc in TIER_MAP[tier] if tc.test_id in test_ids
        )
        if matched == 0:
            print(
                f"Error: --test-id {sorted(test_ids)} matched 0 tests in tiers {tiers}",
                file=sys.stderr,
            )
            return 2

    if args.list:
        return list_tests(tiers, test_ids)

    summary = run_suite(
        tiers=tiers,
        skip_build=args.skip_build,
        skip_vitest=args.skip_vitest,
        test_ids=test_ids,
        screenshots_dir=args.screenshots_dir,
        command_timeout=args.timeout,
    )
    if args.json_out is not None:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote JSON report to {args.json_out}", flush=True)

    return 0 if summary["total"] > 0 and summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
