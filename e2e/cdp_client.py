"""Headless Google Chrome CDP client using Python 3.12 + websockets 17.2."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import websockets

from .server import kill_process_tree

DEFAULT_CHROME_PATH = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def _resolve_chrome_path() -> Path:
    """Locate Chrome binary from CHROME_PATH env, standard Windows install dirs, or PATH."""
    candidates: list[Path] = []
    env_path = os.environ.get("CHROME_PATH", "").strip()
    if env_path:
        candidates.append(Path(env_path))
    candidates.extend([
        DEFAULT_CHROME_PATH,
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    ])
    local_app_data = os.environ.get("LOCALAPPDATA", "").strip()
    if local_app_data:
        candidates.append(Path(local_app_data) / "Google" / "Chrome" / "Application" / "chrome.exe")
    for name in ("chrome", "google-chrome", "chromium"):
        which_path = shutil.which(name)
        if which_path:
            candidates.append(Path(which_path))
    for cand in candidates:
        if cand.exists() and cand.is_file():
            return cand
    return DEFAULT_CHROME_PATH

# Only optional Web Audio fallback probes in soundEffects.ts are allowlisted if they 404.
# /audio/glass-shatter.mp3 and all portraits/JS/CSS/HTML MUST NEVER 404.
OPTIONAL_AUDIO_FALLBACK_RE = re.compile(
    r"^https?://[^/]+/audio/(breathing|whisper-[123])\.mp3(?:\?|$)",
    re.IGNORECASE,
)

AUDIO_SPY_INIT_SCRIPT = r"""
(() => {
  if (window.__audioSpyInstalled) return;
  window.__audioSpyInstalled = true;
  const spy = {
    ctxCount: 0,
    resumeCount: 0,
    bufferSourceCount: 0,
    oscillatorCount: 0,
    gainCount: 0,
    startCount: 0,
    events: []
  };
  window.__audioSpy = spy;

  function wrapCtx(OrigCtx) {
    if (!OrigCtx) return OrigCtx;
    return function WrappedAudioContext(...args) {
      const ctx = new OrigCtx(...args);
      spy.ctxCount += 1;
      spy.events.push('new:' + ctx.state);

      if (typeof ctx.resume === 'function') {
        const origResume = ctx.resume.bind(ctx);
        ctx.resume = function(...rArgs) {
          spy.resumeCount += 1;
          spy.events.push('resume');
          return origResume(...rArgs);
        };
      }
      if (typeof ctx.createBufferSource === 'function') {
        const origCreateBS = ctx.createBufferSource.bind(ctx);
        ctx.createBufferSource = function(...bArgs) {
          spy.bufferSourceCount += 1;
          spy.events.push('createBufferSource');
          const node = origCreateBS(...bArgs);
          if (node && typeof node.start === 'function') {
            const origStart = node.start.bind(node);
            node.start = function(...sArgs) {
              spy.startCount += 1;
              spy.events.push('start:bufferSource');
              return origStart(...sArgs);
            };
          }
          return node;
        };
      }
      if (typeof ctx.createOscillator === 'function') {
        const origCreateOsc = ctx.createOscillator.bind(ctx);
        ctx.createOscillator = function(...oArgs) {
          spy.oscillatorCount += 1;
          spy.events.push('createOscillator');
          const node = origCreateOsc(...oArgs);
          if (node && typeof node.start === 'function') {
            const origStart = node.start.bind(node);
            node.start = function(...sArgs) {
              spy.startCount += 1;
              spy.events.push('start:oscillator');
              return origStart(...sArgs);
            };
          }
          return node;
        };
      }
      if (typeof ctx.createGain === 'function') {
        const origCreateGain = ctx.createGain.bind(ctx);
        ctx.createGain = function(...gArgs) {
          spy.gainCount += 1;
          spy.events.push('createGain');
          return origCreateGain(...gArgs);
        };
      }
      return ctx;
    };
  }

  if (window.AudioContext) {
    window.AudioContext = wrapCtx(window.AudioContext);
  }
  if (window.webkitAudioContext) {
    window.webkitAudioContext = wrapCtx(window.webkitAudioContext);
  }
})();
"""


class CDPError(RuntimeError):
    """Raised on CDP protocol or JavaScript evaluation failures."""


class ChromeCDPClient:
    """Manages a single headless Chrome instance and CDP WebSocket page session."""

    def __init__(
        self,
        chrome_path: Path | None = None,
        startup_timeout: float = 15.0,
        command_timeout: float = 20.0,
    ) -> None:
        self.chrome_path = Path(chrome_path) if chrome_path is not None else _resolve_chrome_path()
        self.startup_timeout = startup_timeout
        self.command_timeout = command_timeout
        self.proc: subprocess.Popen[str] | None = None
        self.user_data_dir: Path | None = None
        self._runner: asyncio.Runner | None = None
        self._ws: Any = None
        self._recv_task: asyncio.Task[Any] | None = None
        self._cmd_id = 0
        self._pending: dict[int, asyncio.Future[dict[str, Any]]] = {}

        # Tracked events (cleared per fresh navigation)
        self.console_errors: list[dict[str, Any]] = []
        self.page_exceptions: list[dict[str, Any]] = []
        self.network_failures: list[dict[str, Any]] = []
        self.http_errors: list[dict[str, Any]] = []
        self.optional_audio_404s: list[dict[str, Any]] = []
        self.responses: list[dict[str, Any]] = []
        self.requests: list[dict[str, Any]] = []

    def __enter__(self) -> ChromeCDPClient:
        self.start()
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()

    def start(self) -> None:
        if not self.chrome_path.exists():
            raise FileNotFoundError(f"Chrome executable not found at {self.chrome_path}")

        self.user_data_dir = Path(tempfile.mkdtemp(prefix="villa_acebo_chrome_"))
        cmd = [
            str(self.chrome_path),
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--remote-debugging-port=0",
            f"--user-data-dir={self.user_data_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--window-size=1280,800",
            "about:blank",
        ]
        self.proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )

        active_port_file = self.user_data_dir / "DevToolsActivePort"
        deadline = time.monotonic() + self.startup_timeout
        cdp_port: int | None = None
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                stdout, stderr = self.proc.communicate(timeout=2)
                self.close()
                raise RuntimeError(
                    f"Chrome exited early (rc={self.proc.returncode}): {stderr or stdout}"
                )
            if active_port_file.exists():
                lines = active_port_file.read_text(encoding="utf-8", errors="replace").splitlines()
                if lines and lines[0].strip().isdigit():
                    cdp_port = int(lines[0].strip())
                    break
            time.sleep(0.05)

        if cdp_port is None:
            self.close()
            raise TimeoutError("Timed out waiting for Chrome DevToolsActivePort")

        ws_url: str | None = None
        deadline = time.monotonic() + self.startup_timeout
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{cdp_port}/json/list", timeout=1.5) as resp:
                    targets = json.loads(resp.read().decode("utf-8"))
                page_targets = [
                    t
                    for t in targets
                    if t.get("type") == "page"
                    and not str(t.get("url", "")).startswith("chrome://")
                    and t.get("webSocketDebuggerUrl")
                ]
                if page_targets:
                    ws_url = page_targets[0]["webSocketDebuggerUrl"]
                    break
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
                pass
            time.sleep(0.05)

        if not ws_url:
            self.close()
            raise TimeoutError(f"No page WebSocket target found on DevTools port {cdp_port}")

        self._runner = asyncio.Runner()
        self._runner.run(self._async_connect(ws_url))

    async def _async_connect(self, ws_url: str) -> None:
        self._ws = await websockets.connect(ws_url, max_size=None, proxy=None)
        self._recv_task = asyncio.create_task(self._recv_loop())
        await self._send("Page.enable")
        await self._send("Runtime.enable")
        await self._send("DOM.enable")
        await self._send("Network.enable")
        await self._send(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": AUDIO_SPY_INIT_SCRIPT},
        )

    async def _recv_loop(self) -> None:
        try:
            async for raw in self._ws:
                msg = json.loads(raw)
                if "id" in msg:
                    fut = self._pending.pop(msg["id"], None)
                    if fut and not fut.done():
                        fut.set_result(msg)
                elif "method" in msg:
                    self._handle_event(msg["method"], msg.get("params", {}))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            for fut in self._pending.values():
                if not fut.done():
                    fut.set_exception(CDPError(f"CDP recv loop closed: {exc}"))
            self._pending.clear()

    def _handle_event(self, method: str, params: dict[str, Any]) -> None:
        if method == "Runtime.exceptionThrown":
            details = params.get("exceptionDetails", {})
            self.page_exceptions.append(
                {
                    "text": details.get("text"),
                    "exception": details.get("exception", {}).get("description")
                    or details.get("exception", {}).get("value"),
                    "url": details.get("url"),
                    "line": details.get("lineNumber"),
                }
            )
        elif method == "Runtime.consoleAPICalled":
            if params.get("type") == "error":
                args = [
                    a.get("value", a.get("description", ""))
                    for a in params.get("args", [])
                ]
                self.console_errors.append({"args": args})
        elif method == "Network.requestWillBeSent":
            req = params.get("request", {})
            self.requests.append(
                {
                    "requestId": params.get("requestId"),
                    "url": req.get("url"),
                    "method": req.get("method"),
                    "type": params.get("type"),
                }
            )
        elif method == "Network.responseReceived":
            resp = params.get("response", {})
            status = int(resp.get("status", 0))
            url = str(resp.get("url", ""))
            entry = {
                "requestId": params.get("requestId"),
                "url": url,
                "status": status,
                "mimeType": resp.get("mimeType", ""),
                "type": params.get("type"),
            }
            self.responses.append(entry)
            if status >= 400 and not url.startswith("data:"):
                if status == 404 and OPTIONAL_AUDIO_FALLBACK_RE.search(url):
                    self.optional_audio_404s.append(entry)
                else:
                    self.http_errors.append(entry)
        elif method == "Network.loadingFailed":
            if not params.get("canceled", False):
                self.network_failures.append(
                    {
                        "requestId": params.get("requestId"),
                        "errorText": params.get("errorText"),
                        "type": params.get("type"),
                    }
                )

    async def _send(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if self._ws is None:
            raise CDPError("CDP WebSocket is not connected")
        self._cmd_id += 1
        cid = self._cmd_id
        loop = asyncio.get_running_loop()
        fut: asyncio.Future[dict[str, Any]] = loop.create_future()
        self._pending[cid] = fut
        payload = {"id": cid, "method": method, "params": params or {}}
        await self._ws.send(json.dumps(payload))
        msg = await asyncio.wait_for(fut, timeout=self.command_timeout)
        if "error" in msg:
            raise CDPError(f"CDP error on {method}: {msg['error']}")
        return msg.get("result", {})

    def send(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if self._runner is None:
            raise CDPError("CDP client not started")
        return self._runner.run(self._send(method, params))

    def sleep(self, seconds: float) -> None:
        if self._runner is None:
            time.sleep(seconds)
            return
        self._runner.run(asyncio.sleep(seconds))

    def drain_events(self, seconds: float = 0.05) -> None:
        self.sleep(seconds)

    def reset_event_logs(self) -> None:
        self.console_errors.clear()
        self.page_exceptions.clear()
        self.network_failures.clear()
        self.http_errors.clear()
        self.optional_audio_404s.clear()
        self.responses.clear()
        self.requests.clear()

    def set_viewport(
        self,
        width: int,
        height: int,
        mobile: bool = False,
        dpr: float = 1.0,
    ) -> None:
        self.send(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": int(width),
                "height": int(height),
                "deviceScaleFactor": float(dpr),
                "mobile": bool(mobile),
            },
        )
        self.drain_events(0.05)

    def eval_js(self, expression: str, await_promise: bool = True) -> Any:
        result = self.send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "awaitPromise": await_promise,
                "returnByValue": True,
            },
        )
        if "exceptionDetails" in result:
            details = result["exceptionDetails"]
            desc = (
                details.get("exception", {}).get("description")
                or details.get("text")
                or str(details)
            )
            raise CDPError(f"JS exception in Runtime.evaluate: {desc}")
        res_obj = result.get("result", {})
        return res_obj.get("value")

    def wait_until(
        self,
        predicate_js: str,
        timeout: float = 10.0,
        poll_interval: float = 0.08,
        description: str = "condition",
    ) -> Any:
        deadline = time.monotonic() + timeout
        last_val = None
        while time.monotonic() < deadline:
            last_val = self.eval_js(predicate_js)
            if last_val:
                return last_val
            self.sleep(poll_interval)
        raise TimeoutError(f"Timed out after {timeout}s waiting for {description} (last={last_val!r})")

    def get_local_storage(self, key: str) -> str | None:
        val = self.eval_js(f"window.localStorage.getItem({json.dumps(key)})")
        return str(val) if val is not None else None

    def set_local_storage(self, key: str, val: str) -> None:
        self.eval_js(f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(val)}); true;")

    def navigate_fresh(
        self,
        url: str,
        width: int = 1280,
        height: int = 800,
        mobile: bool = False,
        dpr: float = 1.0,
        seed_storage: dict[str, str] | None = None,
        clear_storage: bool = True,
    ) -> None:
        """Reset storage/viewport/events and load `url` cleanly from scratch."""
        self.set_viewport(width=width, height=height, mobile=mobile, dpr=dpr)

        if clear_storage:
            origin = self.eval_js("window.location ? window.location.origin : 'null'")
            if origin and origin != "null":
                self.eval_js("localStorage.clear(); sessionStorage.clear();")

        # Navigate to about:blank first so React/Zustand memory is guaranteed fresh
        self.send("Page.navigate", {"url": "about:blank"})
        self.wait_until(
            "window.location.href === 'about:blank' && document.readyState === 'complete'",
            timeout=5.0,
            description="about:blank",
        )
        self.reset_event_logs()

        seed_script_id: str | None = None
        if seed_storage:
            pairs_json = json.dumps(seed_storage)
            seed_source = (
                "(() => {"
                "  if (window.location && window.location.origin && window.location.origin !== 'null') {"
                f"    const entries = {pairs_json};"
                "    for (const [k, v] of Object.entries(entries)) { localStorage.setItem(k, v); }"
                "  }"
                "})();"
            )
            res = self.send("Page.addScriptToEvaluateOnNewDocument", {"source": seed_source})
            seed_script_id = res.get("identifier")

        try:
            self.send("Page.navigate", {"url": url})
            self.wait_until(
                "window.location.href.startsWith('http') && document.readyState === 'complete' && "
                "!!document.querySelector('#root') && document.querySelector('#root').children.length > 0",
                timeout=15.0,
                description=f"app mount at {url}",
            )
            self.drain_events(0.25)
        finally:
            if seed_script_id:
                try:
                    self.send("Page.removeScriptToEvaluateOnNewDocument", {"identifier": seed_script_id})
                except Exception:
                    pass

    def reload(self, ignore_cache: bool = False) -> None:
        self.send("Page.reload", {"ignoreCache": ignore_cache})
        self.wait_until(
            "document.readyState === 'complete' && !!document.querySelector('#root') && document.querySelector('#root').children.length > 0",
            timeout=10.0,
            description="app reload mount",
        )
        self.drain_events(0.25)

    def move_mouse(self, x: float, y: float) -> None:
        self.send(
            "Input.dispatchMouseEvent",
            {"type": "mouseMoved", "x": float(x), "y": float(y), "buttons": 0},
        )

    def click_at(self, x: float, y: float) -> None:
        fx, fy = float(x), float(y)
        self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": fx, "y": fy, "buttons": 0})
        self.send(
            "Input.dispatchMouseEvent",
            {"type": "mousePressed", "x": fx, "y": fy, "button": "left", "clickCount": 1, "buttons": 1},
        )
        self.send(
            "Input.dispatchMouseEvent",
            {"type": "mouseReleased", "x": fx, "y": fy, "button": "left", "clickCount": 1, "buttons": 0},
        )
        self.drain_events(0.12)

    def drag_mouse(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        steps: int = 12,
    ) -> None:
        """Dispatch a real mouse drag gesture from (x1, y1) to (x2, y2)."""
        sx, sy, ex, ey = float(x1), float(y1), float(x2), float(y2)
        n = max(2, int(steps))
        self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": sx, "y": sy, "buttons": 0})
        self.send(
            "Input.dispatchMouseEvent",
            {"type": "mousePressed", "x": sx, "y": sy, "button": "left", "clickCount": 1, "buttons": 1},
        )
        for i in range(1, n + 1):
            t = i / n
            cx = sx + (ex - sx) * t
            cy = sy + (ey - sy) * t
            self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": cx, "y": cy, "buttons": 1})
        self.send(
            "Input.dispatchMouseEvent",
            {"type": "mouseReleased", "x": ex, "y": ey, "button": "left", "clickCount": 1, "buttons": 0},
        )
        self.drain_events(0.15)

    def touch_drag(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        steps: int = 12,
    ) -> None:
        """Dispatch a real touch drag gesture (touchStart -> touchMove -> touchEnd)."""
        sx, sy, ex, ey = float(x1), float(y1), float(x2), float(y2)
        n = max(2, int(steps))
        self.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [{"x": sx, "y": sy, "radiusX": 4, "radiusY": 4, "force": 1, "id": 1}],
            },
        )
        for i in range(1, n + 1):
            t = i / n
            cx = sx + (ex - sx) * t
            cy = sy + (ey - sy) * t
            self.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [{"x": cx, "y": cy, "radiusX": 4, "radiusY": 4, "force": 1, "id": 1}],
                },
            )
        self.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        self.drain_events(0.15)

    def insert_text(self, text: str) -> None:
        self.send("Input.insertText", {"text": text})
        self.drain_events(0.08)

    def press_key(self, key: str, code: str, key_code: int) -> None:
        self.send(
            "Input.dispatchKeyEvent",
            {
                "type": "keyDown",
                "key": key,
                "code": code,
                "windowsVirtualKeyCode": key_code,
                "nativeVirtualKeyCode": key_code,
            },
        )
        self.send(
            "Input.dispatchKeyEvent",
            {
                "type": "keyUp",
                "key": key,
                "code": code,
                "windowsVirtualKeyCode": key_code,
                "nativeVirtualKeyCode": key_code,
            },
        )
        self.drain_events(0.1)

    def press_escape(self) -> None:
        self.press_key("Escape", "Escape", 27)

    def press_backspace(self) -> None:
        self.press_key("Backspace", "Backspace", 8)

    def capture_screenshot(self) -> bytes:
        res = self.send("Page.captureScreenshot", {"format": "png", "fromSurface": True})
        return base64.b64decode(res["data"])

    def get_audio_spy(self) -> dict[str, Any]:
        return self.eval_js("window.__audioSpy || null") or {}

    def assert_no_runtime_errors(self, context: str = "") -> None:
        prefix = f"[{context}] " if context else ""
        if self.page_exceptions:
            raise AssertionError(f"{prefix}Uncaught page exceptions: {self.page_exceptions}")

        if self.console_errors:
            raise AssertionError(f"{prefix}Console errors: {self.console_errors}")
        if self.network_failures:
            raise AssertionError(f"{prefix}Network loading failures: {self.network_failures}")
        if self.http_errors:
            raise AssertionError(f"{prefix}HTTP >= 400 responses: {self.http_errors}")

    def close(self) -> None:
        if self._runner is not None:
            try:
                async def _shutdown() -> None:
                    if self._recv_task is not None:
                        self._recv_task.cancel()
                        try:
                            await self._recv_task
                        except (asyncio.CancelledError, Exception):
                            pass
                    if self._ws is not None:
                        try:
                            await self._ws.close()
                        except Exception:
                            pass

                self._runner.run(_shutdown())
            except Exception:
                pass
            try:
                self._runner.close()
            except Exception:
                pass
            self._runner = None
            self._ws = None
            self._recv_task = None

        if self.proc is not None:
            proc = self.proc
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

        if self.user_data_dir is not None and self.user_data_dir.exists():
            udir = self.user_data_dir
            self.user_data_dir = None
            for _ in range(10):
                try:
                    shutil.rmtree(udir)
                    break
                except OSError:
                    time.sleep(0.1)
