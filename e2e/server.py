"""Vite preview server and build/lint/test command helpers for E2E tests."""

from __future__ import annotations

import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def find_free_port() -> int:
    """Bind an ephemeral port on 127.0.0.1 and return it."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def kill_process_tree(pid: int) -> None:
    """Terminate a Windows process tree cleanly."""
    if pid <= 0:
        return
    try:
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception:
        pass


def _resolve_npm_cmd() -> str:
    return shutil.which("npm.cmd") or "npm.cmd"


def _resolve_npx_cmd() -> str:
    return shutil.which("npx.cmd") or "npx.cmd"


def run_lint(project_root: Path = PROJECT_ROOT, timeout: int = 60) -> dict[str, Any]:
    """Run `npm run lint` (`oxlint`) and return structured execution details."""
    proc = subprocess.run(
        [_resolve_npm_cmd(), "run", "lint"],
        cwd=str(project_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "output": f"{proc.stdout}\n{proc.stderr}".strip(),
    }


def run_tsc_app(project_root: Path = PROJECT_ROOT, timeout: int = 60) -> dict[str, Any]:
    """Run `npx tsc -p tsconfig.app.json --noEmit` and return structured details."""
    proc = subprocess.run(
        [_resolve_npx_cmd(), "tsc", "-p", "tsconfig.app.json", "--noEmit"],
        cwd=str(project_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "output": f"{proc.stdout}\n{proc.stderr}".strip(),
    }


def run_build(project_root: Path = PROJECT_ROOT, timeout: int = 120) -> dict[str, Any]:
    """Run `npm run build` (`tsc -b && vite build`) and return structured details."""
    proc = subprocess.run(
        [_resolve_npm_cmd(), "run", "build"],
        cwd=str(project_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "output": f"{proc.stdout}\n{proc.stderr}".strip(),
    }


def run_vitest(project_root: Path = PROJECT_ROOT, timeout: int = 120) -> dict[str, Any]:
    """Run `npm test -- --run` (Vitest) cleanly and return structured details."""
    proc = subprocess.run(
        [_resolve_npm_cmd(), "test", "--", "--run"],
        cwd=str(project_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return {
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "output": f"{proc.stdout}\n{proc.stderr}".strip(),
    }


class VitePreviewServer:
    """Context manager running `vite preview` via node directly on an isolated port."""

    def __init__(
        self,
        project_root: Path = PROJECT_ROOT,
        port: int | None = None,
        startup_timeout: float = 15.0,
    ) -> None:
        self.project_root = Path(project_root)
        self.port = port or find_free_port()
        self.startup_timeout = startup_timeout
        self.proc: subprocess.Popen[str] | None = None
        self.base_url = f"http://127.0.0.1:{self.port}"

    def __enter__(self) -> VitePreviewServer:
        dist_index = self.project_root / "dist" / "index.html"
        if not dist_index.exists():
            raise RuntimeError(
                f"Expected built app at {dist_index}; run `npm run build` before starting VitePreviewServer."
            )
        vite_js = self.project_root / "node_modules" / "vite" / "bin" / "vite.js"
        if not vite_js.exists():
            raise RuntimeError(f"Vite CLI entrypoint not found at {vite_js}")

        cmd = [
            "node",
            str(vite_js),
            "preview",
            "--port",
            str(self.port),
            "--strictPort",
            "--host",
            "127.0.0.1",
        ]
        self.proc = subprocess.Popen(
            cmd,
            cwd=str(self.project_root),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )

        deadline = time.monotonic() + self.startup_timeout
        last_err: str | None = None
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                stdout, stderr = self.proc.communicate(timeout=2)
                raise RuntimeError(
                    f"vite preview exited prematurely (rc={self.proc.returncode}): {stderr or stdout}"
                )
            try:
                with urllib.request.urlopen(f"{self.base_url}/", timeout=1.0) as resp:
                    if resp.status == 200:
                        return self
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_err = str(exc)
            time.sleep(0.05)

        self.close()
        raise TimeoutError(
            f"vite preview did not become HTTP 200 ready on {self.base_url}/ within {self.startup_timeout}s ({last_err})"
        )

    def close(self) -> None:
        proc = self.proc
        if proc is None:
            return
        self.proc = None
        try:
            kill_process_tree(proc.pid)
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        finally:
            for stream in (proc.stdout, proc.stderr):
                if stream is not None:
                    try:
                        stream.close()
                    except Exception:
                        pass

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()
