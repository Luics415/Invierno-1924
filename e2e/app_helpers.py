"""Opaque-box DOM selectors, R5 geometry/emoji inspectors, and 30-day R1–R5 helpers."""

from __future__ import annotations

import json
import re
import time
from typing import Any

from .cdp_client import ChromeCDPClient
from .server import PROJECT_ROOT
from .types import STORAGE_KEY, TOTAL_DAYS, VIEWPORTS


def _is_visible_js() -> str:
    return """
    function isVis(el) {
      if (!el) return false;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0.5 && r.height > 0.5;
    }
    """


def ensure_book_open(client: ChromeCDPClient) -> None:
    """If the app starts on or is currently on a closed book cover, open the notebook."""
    is_open = client.eval_js(
        "!!document.querySelector('header') && !!document.querySelector('main')"
    )
    if is_open:
        return
    opened = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVis);
          const target = btns.find(b => {{
            const meta = [
              b.getAttribute('aria-label') || '',
              b.getAttribute('title') || '',
              b.innerText || ''
            ].join(' ').toLowerCase();
            return /abrir libreta/.test(meta);
          }});
          if (!target) return null;
          const r = target.getBoundingClientRect();
          return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
        }})()
        """
    )
    if opened:
        client.click_at(opened["x"], opened["y"])
        client.wait_until(
            "!!document.querySelector('header') && !!document.querySelector('main')",
            timeout=5.0,
            description="Book opened",
        )
        client.drain_events(0.15)


def click_element_by_selector(client: ChromeCDPClient, selector: str, index: int = 0) -> dict[str, Any]:
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const els = Array.from(document.querySelectorAll({json.dumps(selector)})).filter(isVis);
          const el = els[{index}];
          if (!el) return null;
          el.scrollIntoView({{ block: 'center', inline: 'center' }});
          const r = el.getBoundingClientRect();
          return {{
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            disabled: !!el.disabled,
            text: (el.innerText || '').trim(),
            title: el.getAttribute('title') || '',
            ariaLabel: el.getAttribute('aria-label') || ''
          }};
        }})()
        """
    )
    if not info:
        raise AssertionError(f"Visible element not found for selector: {selector} (index={index})")
    if info["disabled"]:
        raise AssertionError(f"Element is disabled: {selector} ({info})")
    client.click_at(info["x"], info["y"])
    return info


def click_button_by_text(
    client: ChromeCDPClient,
    substring: str,
    scope_selector: str = "body",
    exact: bool = False,
) -> dict[str, Any]:
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const scopes = Array.from(document.querySelectorAll({json.dumps(scope_selector)}))
            .map((el, domIdx) => {{
              const z = parseFloat(getComputedStyle(el).zIndex);
              return {{ el, domIdx, z: Number.isFinite(z) ? z : 0 }};
            }})
            .filter(item => isVis(item.el))
            .sort((a, b) => (b.z - a.z) || (b.domIdx - a.domIdx));
          if (!scopes.length) return null;
          const needle = {json.dumps(substring)}.toLowerCase();
          const exact = {json.dumps(exact)};
          let match = null;
          for (const {{ el: scope }} of scopes) {{
            const btns = Array.from(scope.querySelectorAll('button, [role="button"]')).filter(isVis);
            match = btns.find(b => {{
              const txt = (b.innerText || b.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
              const title = (b.getAttribute('title') || '').trim().toLowerCase();
              if (exact) {{
                return txt === needle || aria === needle;
              }}
              return txt.includes(needle) || aria.includes(needle) || title.includes(needle);
            }});
            if (match) break;
          }}
          if (!match) return null;
          match.scrollIntoView({{ block: 'center', inline: 'center' }});
          const r = match.getBoundingClientRect();
          return {{
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            disabled: !!match.disabled,
            text: (match.innerText || '').trim()
          }};
        }})()
        """
    )
    if not info:
        raise AssertionError(f"Visible button containing {substring!r} not found inside {scope_selector}")
    if info["disabled"]:
        raise AssertionError(f"Button containing {substring!r} is disabled")
    client.click_at(info["x"], info["y"])
    return info


def get_header_controls_state(client: ChromeCDPClient) -> dict[str, Any]:
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const header = document.querySelector('header');
          const headerRect = header ? header.getBoundingClientRect() : null;
          const findBtn = (titleSub, textSub) => {{
            const btns = Array.from(document.querySelectorAll('header button, header [role="button"]'));
            const el = btns.find(b => {{
              const t = (b.getAttribute('title') || '').toLowerCase();
              const a = (b.getAttribute('aria-label') || '').toLowerCase();
              const txt = (b.innerText || '').toLowerCase();
              return (titleSub && (t.includes(titleSub) || a.includes(titleSub))) || (textSub && txt.includes(textSub));
            }});
            if (!el) return {{ exists: false, visible: false, disabled: true }};
            const r = el.getBoundingClientRect();
            return {{
              exists: true,
              visible: isVis(el),
              disabled: !!el.disabled,
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
              width: r.width,
              height: r.height,
              text: (el.innerText || '').trim(),
              title: el.getAttribute('title') || '',
              ariaLabel: el.getAttribute('aria-label') || ''
            }};
          }};
          return {{
            hasHeader: !!header,
            headerVisible: isVis(header),
            headerText: header ? (header.innerText || '').trim() : '',
            headerRect: headerRect ? {{
              top: headerRect.top,
              left: headerRect.left,
              right: headerRect.right,
              bottom: headerRect.bottom,
              width: headerRect.width,
              height: headerRect.height
            }} : null,
            prevDay: findBtn('anterior', null),
            nextDay: findBtn('siguiente', null),
            embudo: findBtn('embudo', 'embudo'),
            adviento: findBtn('calendario', 'adviento'),
            cuaderno: findBtn('cuaderno', 'cuaderno'),
            veredicto: findBtn('veredicto', 'veredicto'),
            nuevoCaso: findBtn('nuevo caso', 'nuevo'),
            coverToggle: findBtn('cerrar la libreta', 'cerrar'),
            muteButtons: Array.from(document.querySelectorAll('header button')).filter(b => {{
              const t = (b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '');
              return /silenciar|activar efectos de sonido|audio|mute|sonido/i.test(t) && isVis(b);
            }}).map(b => ({{
              title: b.getAttribute('title') || '',
              ariaLabel: b.getAttribute('aria-label') || '',
              text: (b.innerText || '').trim()
            }}))
          }};
        }})()
        """
    )


def find_header_collapse_button(client: ChromeCDPClient) -> dict[str, Any] | None:
    """Locate the header collapse/expand toggle via data-testid or semantic ARIA attributes."""
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const explicit = document.querySelector('[data-testid="header-collapse-toggle"]');
          if (explicit && isVis(explicit)) {{
            const r = explicit.getBoundingClientRect();
            return {{
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
              width: r.width,
              height: r.height,
              ariaExpanded: explicit.getAttribute('aria-expanded'),
              ariaPressed: explicit.getAttribute('aria-pressed'),
              title: explicit.getAttribute('title') || '',
              ariaLabel: explicit.getAttribute('aria-label') || '',
              text: (explicit.innerText || '').trim()
            }};
          }}
          const main = document.querySelector('main');
          const mainTop = main ? main.getBoundingClientRect().top : 9999;
          const candidates = Array.from(document.querySelectorAll('header button, body > div button')).filter(el => {{
            if (!isVis(el)) return false;
            if (main && main.contains(el)) return false;
            const r = el.getBoundingClientRect();
            if (r.top > mainTop + 20) return false;
            const meta = [
              el.getAttribute('title') || '',
              el.getAttribute('aria-label') || '',
              el.getAttribute('data-testid') || '',
              el.innerText || ''
            ].join(' ').toLowerCase();
            if (/anterior|siguiente|embudo|adviento|cuaderno|veredicto|detective|pista|pliego|nuevo/.test(meta)) return false;
            return el.hasAttribute('aria-expanded') || /desfijar|fijar|contraer|colapsar|expandir|barra/.test(meta);
          }});
          if (!candidates.length) return null;
          const el = candidates[0];
          const r = el.getBoundingClientRect();
          return {{
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            width: r.width,
            height: r.height,
            ariaExpanded: el.getAttribute('aria-expanded'),
            ariaPressed: el.getAttribute('aria-pressed'),
            title: el.getAttribute('title') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            text: (el.innerText || '').trim()
          }};
        }})()
        """
    )


def toggle_header_collapse(client: ChromeCDPClient) -> dict[str, Any]:
    btn = find_header_collapse_button(client)
    if not btn:
        raise AssertionError("Header collapse/expand toggle button not found")
    client.click_at(btn["x"], btn["y"])
    out_y = client.eval_js(
        "(() => { const h = document.querySelector('header'); "
        "const b = h ? (h.parentElement || h).getBoundingClientRect().bottom : 160; "
        "return Math.min(window.innerHeight - 10, Math.max(300, b + 60)); })()"
    )
    client.move_mouse(5, float(out_y or 300))
    client.drain_events(0.38)
    return btn


def toggle_book_cover(client: ChromeCDPClient, mode: str = "front") -> None:
    """Close the open book to front/back cover, or reopen it."""
    if mode == "open":
        ensure_book_open(client)
        return
    ensure_book_open(client)
    st = get_header_controls_state(client)
    if st["coverToggle"]["visible"]:
        client.click_at(st["coverToggle"]["x"], st["coverToggle"]["y"])
    else:
        click_button_by_text(client, "Cerrar", scope_selector="header")
    client.wait_until(
        "!!document.querySelector('button[aria-label*=\"Contraportada\"], button[aria-label*=\"Abrir Libreta\"]')",
        timeout=5.0,
        description="Book front cover visible",
    )
    if mode == "back":
        click_element_by_selector(client, 'button[aria-label*="Contraportada"]')
        client.wait_until(
            "/ver portada/i.test(document.body.innerText)",
            timeout=5.0,
            description="Book back cover visible",
        )
    client.drain_events(0.15)


def get_background_and_snow_state(client: ChromeCDPClient) -> dict[str, Any]:
    return client.eval_js(
        """
        (() => {
          const bgEls = Array.from(document.querySelectorAll('div')).filter(el => {
            const bg = getComputedStyle(el).backgroundImage || '';
            return bg && bg !== 'none' && /url\\(/i.test(bg);
          });
          const bgEl = bgEls.find(el => /background-[1-4]\\.png/i.test(getComputedStyle(el).backgroundImage || '')) || bgEls[0] || null;
          const bgStyle = bgEl ? getComputedStyle(bgEl) : null;
          const snow = Array.from(document.querySelectorAll('.snow-particle')).map(el => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return {
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              animationName: st.animationName,
              position: st.position
            };
          });
          const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.getAttribute('src') || '',
            currentSrc: img.currentSrc || '',
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          }));
          const allBgUrls = Array.from(document.querySelectorAll('*'))
            .map(el => getComputedStyle(el).backgroundImage)
            .filter(v => v && v !== 'none');
          return {
            hasBgEl: !!bgEl,
            bgImage: bgStyle ? bgStyle.backgroundImage : '',
            bgPosition: bgStyle ? bgStyle.position : '',
            bgSize: bgStyle ? bgStyle.backgroundSize : '',
            snowCount: snow.length,
            snowSamples: snow,
            imgs,
            allBgUrls
          };
        })()
        """
    )


def get_book_layout_geometry(client: ChromeCDPClient) -> dict[str, Any]:
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const rootWrapper = document.querySelector('#root > div');
          const rootStyle = rootWrapper ? getComputedStyle(rootWrapper) : null;
          const main = document.querySelector('main');
          const header = document.querySelector('header');
          const footer = document.querySelector('footer');
          const sections = main ? Array.from(main.querySelectorAll('section')).map(s => {{
            const r = s.getBoundingClientRect();
            return {{
              className: s.className || '',
              visible: isVis(s),
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
              textSnippet: (s.innerText || '').slice(0, 240)
            }};
          }}) : [];
          const mainRect = main ? main.getBoundingClientRect() : null;
          const headerRect = header ? header.getBoundingClientRect() : null;
          const footerRect = footer ? footer.getBoundingClientRect() : null;
          const snowParticles = Array.from(document.querySelectorAll('.snow-particle')).map(el => {{
            const r = el.getBoundingClientRect();
            return {{ left: r.left, right: r.right, top: r.top }};
          }});
          return {{
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            docScrollWidth: document.documentElement.scrollWidth,
            docScrollHeight: document.documentElement.scrollHeight,
            bodyScrollWidth: document.body.scrollWidth,
            bodyScrollHeight: document.body.scrollHeight,
            rootOverflowY: rootStyle ? rootStyle.overflowY : null,
            rootOverflowX: rootStyle ? rootStyle.overflowX : null,
            rootHeight: rootWrapper ? rootWrapper.getBoundingClientRect().height : 0,
            mainRect: mainRect ? {{
              left: mainRect.left,
              right: mainRect.right,
              top: mainRect.top,
              bottom: mainRect.bottom,
              width: mainRect.width,
              height: mainRect.height
            }} : null,
            headerRect: headerRect ? {{
              top: headerRect.top,
              bottom: headerRect.bottom,
              height: headerRect.height,
              width: headerRect.width
            }} : null,
            footerRect: footerRect ? {{
              top: footerRect.top,
              bottom: footerRect.bottom,
              left: footerRect.left,
              right: footerRect.right,
              width: footerRect.width
            }} : null,
            sections,
            snowParticles
          }};
        }})()
        """
    )


def inspect_viewport_bounds(
    client: ChromeCDPClient,
    label: str = "",
    check_vertical_lock: bool = True,
) -> dict[str, Any]:
    """Verify R5 strict h-screen overflow-hidden lock, zero horizontal overflow, and zero vertical top-clipping."""
    report = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const docOverflowX = document.documentElement.scrollWidth > vw + 1;
          const bodyOverflowX = document.body.scrollWidth > vw + 1;
          const docOverflowY = document.documentElement.scrollHeight > vh + 1;
          const bodyOverflowY = document.body.scrollHeight > vh + 1;

          const rootWrapper = document.querySelector('#root > div');
          const rootStyle = rootWrapper ? getComputedStyle(rootWrapper) : null;
          const rootOverflowY = rootStyle ? rootStyle.overflowY : '';
          const rootHeight = rootWrapper ? rootWrapper.getBoundingClientRect().height : 0;

          const main = document.querySelector('main');
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).find(el => {{
            const st = getComputedStyle(el);
            return isVis(el) && parseFloat(st.zIndex || '0') >= 40;
          }});
          const activeScope = modal || main;
          const scopeRect = activeScope ? activeScope.getBoundingClientRect() : {{ left: 0, right: vw, width: vw, top: 0, bottom: vh }};

          const containerOverflows = [];
          const leafOverflows = [];
          const topClippings = [];
          const roots = modal ? [modal] : [document.querySelector('header'), main, document.querySelector('footer')].filter(Boolean);

          const hasAncestorOverflowX = (el, stopAt, modes) => {{
            let cur = el.parentElement;
            while (cur && cur !== stopAt && cur !== document.body) {{
              const cst = getComputedStyle(cur);
              if (modes.includes(cst.overflowX)) return true;
              cur = cur.parentElement;
            }}
            return false;
          }};

          const hasAncestorOverflowY = (el, stopAt, modes) => {{
            let cur = el.parentElement;
            while (cur && cur !== stopAt && cur !== document.body) {{
              const cst = getComputedStyle(cur);
              if (modes.includes(cst.overflowY)) return true;
              cur = cur.parentElement;
            }}
            return false;
          }};

          for (const root of roots) {{
            const rRoot = root.getBoundingClientRect();
            if (rRoot.top < -2) {{
              topClippings.push({{
                tag: root.tagName.toLowerCase(),
                top: Math.round(rRoot.top),
                text: (root.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60)
              }});
            }}
            const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
            for (const el of nodes) {{
              if (!isVis(el)) continue;
              if (el.classList.contains('snow-particle')) continue;
              const st = getComputedStyle(el);
              const isEllipsis = st.textOverflow === 'ellipsis' && st.whiteSpace === 'nowrap';
              const isIntentionalScroll = st.overflowX === 'auto' || st.overflowX === 'scroll';
              const isClippedContainer = st.overflowX === 'hidden' || st.overflowX === 'clip';
              const insideIntentionalScroll = hasAncestorOverflowX(el, root, ['auto', 'scroll']);
              const insideScrollY = hasAncestorOverflowY(el, root, ['auto', 'scroll']);
              const isDecorativeClipped = st.pointerEvents === 'none' && hasAncestorOverflowX(el, root, ['hidden', 'clip']);

              if (!isEllipsis && !isIntentionalScroll && !insideIntentionalScroll && !isDecorativeClipped && el.clientWidth > 0) {{
                if ((isClippedContainer && el.scrollWidth > el.clientWidth + 3) || el.scrollWidth > scopeRect.width + 3) {{
                  containerOverflows.push({{
                    tag: el.tagName.toLowerCase(),
                    scrollWidth: el.scrollWidth,
                    clientWidth: el.clientWidth,
                    overflowX: st.overflowX,
                    text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60)
                  }});
                }}
              }}

              if (!insideScrollY && !isDecorativeClipped && st.pointerEvents !== 'none' && el.getAttribute('aria-hidden') !== 'true') {{
                const tag = el.tagName;
                const isSvgChild = el.namespaceURI === 'http://www.w3.org/2000/svg' && tag !== 'svg';
                if (!isSvgChild) {{
                  const r = el.getBoundingClientRect();
                  if (r.top < -2) {{
                    const isSemanticBlock = /^(SECTION|HEADER|FOOTER|MAIN|NAV|FORM|TABLE|H[1-6]|BUTTON|A|INPUT|SELECT|TEXTAREA|IMG|LABEL|P|LI|UL|OL)$/.test(tag);
                    const hasText = (el.innerText || '').trim().length > 0;
                    if (isSemanticBlock || (hasText && r.height > 2)) {{
                      topClippings.push({{
                        tag: tag.toLowerCase(),
                        top: Math.round(r.top),
                        text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60)
                      }});
                    }}
                  }}
                }}
              }}

              if (insideIntentionalScroll || isDecorativeClipped) continue;

              const r = el.getBoundingClientRect();
              if (r.right > vw + 2 || r.left < -2) {{
                leafOverflows.push({{
                  tag: el.tagName.toLowerCase(),
                  left: Math.round(r.left),
                  right: Math.round(r.right),
                  vw,
                  text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60)
                }});
              }} else if (activeScope && activeScope.contains(el) && !isIntentionalScroll) {{
                if (r.right > scopeRect.right + 3 || r.left < scopeRect.left - 3) {{
                  leafOverflows.push({{
                    tag: el.tagName.toLowerCase(),
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                    scopeRight: Math.round(scopeRect.right),
                    scopeLeft: Math.round(scopeRect.left),
                    text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60)
                  }});
                }}
              }}
            }}
          }}

          // Check Azlynn bubble/radial if mounted in portal
          const azlynnEls = Array.from(document.querySelectorAll('[data-testid="detective-hint-bubble"], [data-testid="detective-radial-menu"]')).filter(isVis);
          for (const az of azlynnEls) {{
            const r = az.getBoundingClientRect();
            if (r.right > vw + 2 || r.left < -2 || r.top < -2) {{
              leafOverflows.push({{
                tag: 'azlynn',
                left: Math.round(r.left),
                right: Math.round(r.right),
                top: Math.round(r.top),
                vw,
                text: (az.innerText || '').slice(0, 50)
              }});
            }}
          }}

          return {{
            innerWidth: vw,
            innerHeight: vh,
            docScrollWidth: document.documentElement.scrollWidth,
            docScrollHeight: document.documentElement.scrollHeight,
            bodyScrollWidth: document.body.scrollWidth,
            bodyScrollHeight: document.body.scrollHeight,
            rootOverflowY,
            rootHeight,
            docOverflowX,
            bodyOverflowX,
            docOverflowY,
            bodyOverflowY,
            containerOverflows: containerOverflows.slice(0, 8),
            leafOverflows: leafOverflows.slice(0, 8),
            topClippings: topClippings.slice(0, 8)
          }};
        }})()
        """
    )
    prefix = f"[{label}] " if label else ""
    if (
        report["docOverflowX"]
        or report["bodyOverflowX"]
        or report["containerOverflows"]
        or report["leafOverflows"]
        or report["topClippings"]
    ):
        raise AssertionError(f"{prefix}Viewport horizontal overflow or top-clipping detected: {report}")
    if check_vertical_lock:
        if report["docOverflowY"] or report["bodyOverflowY"]:
            raise AssertionError(f"{prefix}Global vertical scroll detected (R5 violation): {report}")
        if report["rootOverflowY"] != "hidden":
            raise AssertionError(f"{prefix}Root wrapper overflowY is {report['rootOverflowY']!r}, expected 'hidden': {report}")
    return report


def inspect_horizontal_overflow(client: ChromeCDPClient, label: str = "") -> dict[str, Any]:
    return inspect_viewport_bounds(client, label=label, check_vertical_lock=True)


def inspect_zero_emojis_in_dom(client: ChromeCDPClient, label: str = "") -> dict[str, Any]:
    """Walk visible text nodes + aria-label/title/alt/placeholder in the DOM to enforce R5 zero-emoji compliance."""
    hits = client.eval_js(
        """
        (() => {
          const emojiRe = /[\\u{1F000}-\\u{1F0FF}\\u{1F100}-\\u{1F2FF}\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2300}-\\u{23FF}\\u{2B00}-\\u{2BFF}\\u{3297}\\u{3299}\\u{20E3}\\u{FE0F}\\u{200D}]/u;
          const found = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            if (!parent) continue;
            const st = getComputedStyle(parent);
            if (st.display === 'none' || st.visibility === 'hidden') continue;
            const txt = node.nodeValue || '';
            if (emojiRe.test(txt)) {
              found.push({ kind: 'text', tag: parent.tagName.toLowerCase(), value: txt.trim().slice(0, 80) });
            }
          }
          for (const el of document.querySelectorAll('[aria-label], [title], [alt], [placeholder]')) {
            for (const attr of ['aria-label', 'title', 'alt', 'placeholder']) {
              const val = el.getAttribute(attr) || '';
              if (emojiRe.test(val)) {
                found.push({ kind: attr, tag: el.tagName.toLowerCase(), value: val.slice(0, 80) });
              }
            }
          }
          return { count: found.length, samples: found.slice(0, 12) };
        })()
        """
    )
    if hits and hits["count"] > 0:
        prefix = f"[{label}] " if label else ""
        raise AssertionError(f"{prefix}Forbidden emojis detected in rendered DOM: {hits}")
    return hits or {"count": 0, "samples": []}


def open_advent_calendar(client: ChromeCDPClient) -> None:
    ensure_book_open(client)
    is_open = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          return Array.from(document.querySelectorAll('.fixed.inset-0')).some(
            el => isVis(el) && /calendario de adviento criminal/i.test(el.innerText || '')
          );
        }})()
        """
    )
    if is_open:
        return
    try:
        click_element_by_selector(
            client,
            'header button[title*="Calendario" i], header button[aria-label*="Calendario" i], '
            'header button[title*="Adviento" i], header button[aria-label*="Adviento" i]',
        )
    except AssertionError:
        click_button_by_text(client, "Adviento", scope_selector="header")
    client.wait_until(
        "/calendario de adviento criminal/i.test(document.body.innerText)",
        timeout=5.0,
        description="AdventCalendar modal open",
    )


def get_advent_calendar_info(client: ChromeCDPClient) -> dict[str, Any]:
    """Open AdventCalendar (if closed) and inspect all 30 days, acts, and puzzle type labels."""
    open_advent_calendar(client)
    info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && /calendario de adviento criminal/i.test(el.innerText || '')
          );
          if (!modal) return null;
          const actButtons = Array.from(modal.querySelectorAll('button')).filter(b =>
            /acto\\s*\\d/i.test(b.innerText || '')
          ).map(b => (b.innerText || '').replace(/\\s+/g, ' ').trim());
          const cards = Array.from(modal.querySelectorAll('.grid > div, .grid > button')).filter(isVis).map(c => {{
            const txt = (c.innerText || '').replace(/\\s+/g, ' ').trim();
            const m = txt.match(/\\b(0?[1-9]|[12]\\d|30)\\b/);
            const num = m ? parseInt(m[1], 10) : null;
            return {{
              day: num,
              text: txt,
              lines: (c.innerText || '').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean)
            }};
          }}).filter(x => x.day !== null);
          return {{
            modalText: (modal.innerText || '').trim(),
            actButtons,
            cardCount: cards.length,
            cards
          }};
        }})()
        """
    )
    if not info:
        raise AssertionError("Could not read AdventCalendar modal")
    return info


def close_advent_calendar(client: ChromeCDPClient) -> None:
    is_open = client.eval_js("/calendario de adviento criminal/i.test(document.body.innerText)")
    if not is_open:
        return
    click_button_by_text(client, "Volver al Libro", scope_selector=".fixed.inset-0")
    client.wait_until(
        "!/calendario de adviento criminal/i.test(document.body.innerText)",
        timeout=5.0,
        description="AdventCalendar closed",
    )


def _rewind_album_to_first_spread(client: ChromeCDPClient) -> None:
    for _ in range(12):
        prev_pos = client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const btns = Array.from(document.querySelectorAll('main button')).filter(isVis);
              const prevBtn = btns.find(b => /pliego ant/i.test(b.innerText || ''));
              if (!prevBtn || prevBtn.disabled) return null;
              const r = prevBtn.getBoundingClientRect();
              return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
            """
        )
        if not prev_pos:
            break
        client.click_at(prev_pos["x"], prev_pos["y"])
        client.drain_events(0.1)


def go_to_day(client: ChromeCDPClient, day: int) -> None:
    """Navigate cleanly to Day 0 (Album, spread 1) or Day 1..30 via opaque-box UI controls."""
    ensure_book_open(client)
    if day == 0:
        in_album = client.eval_js(
            """
            (() => {
              const headerTxt = (document.querySelector('header')?.innerText || '').trim();
              const mainTxt = (document.querySelector('main')?.innerText || '').trim();
              if (/\\bdía\\s+\\d+/i.test(headerTxt)) return false;
              return /álbum de sospechosos|censo oficial de los 74|registro nominal y coartadas|abrir día 01/i.test(mainTxt)
                || /censo\\s*\\(74\\)|álbum de los 74/i.test(headerTxt);
            })()
            """
        )
        if in_album:
            _rewind_album_to_first_spread(client)
            return
        st = get_header_controls_state(client)
        if st["embudo"]["visible"]:
            client.click_at(st["embudo"]["x"], st["embudo"]["y"])
            client.drain_events(0.15)
            # If Embudo modal opened, click Explorar Álbum
            if client.eval_js("/embudo de deducción/i.test(document.body.innerText)"):
                click_button_by_text(client, "Explorar Álbum", scope_selector=".fixed.inset-0")
                client.wait_until(
                    "/álbum de sospechosos|abrir día 01|pliego/i.test(document.querySelector('main')?.innerText || '')",
                    timeout=5.0,
                    description="Day 0 Album from Embudo",
                )
                _rewind_album_to_first_spread(client)
                return
        # Fallback: open AdventCalendar -> Álbum: 74 Sospechosos
        open_advent_calendar(client)
        click_button_by_text(client, "Álbum", scope_selector=".fixed.inset-0")
        client.wait_until(
            "!/calendario de adviento criminal/i.test(document.body.innerText)",
            timeout=5.0,
            description="Day 0 Album from Calendar",
        )
        _rewind_album_to_first_spread(client)
        return

    if not (1 <= day <= TOTAL_DAYS):
        raise ValueError(f"Invalid day {day}; expected 0..{TOTAL_DAYS}")

    padded = f"{day:02d}"
    if day == 1 and client.eval_js("/abrir día 01/i.test(document.body.innerText)"):
        click_button_by_text(client, "Abrir Día 01")
        client.wait_until(
            f"/día {padded}|capítulo {padded}/i.test(document.body.innerText)",
            timeout=5.0,
            description="Day 1",
        )
        client.drain_events(0.15)
        return

    # Open Advent Calendar and select target day card
    open_advent_calendar(client)
    # Ensure "Todos" tab is active inside AdventCalendar modal so all 30 days are visible
    try:
        click_button_by_text(client, "Todos", scope_selector=".fixed.inset-0")
        client.drain_events(0.1)
    except AssertionError:
        pass

    card_pos = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && /calendario de adviento criminal/i.test(el.innerText || '')
          );
          if (!modal) return null;
          const cards = Array.from(modal.querySelectorAll('.grid > div, .grid > button')).filter(isVis);
          const match = cards.find(c => {{
            const spans = Array.from(c.querySelectorAll('span, div'));
            const numMatch = spans.some(s => s.textContent.trim() === {json.dumps(padded)} || s.textContent.trim() === {json.dumps(str(day))});
            if (numMatch) return true;
            const firstLine = (c.innerText || '').trim().split(/\\s+/)[0];
            return firstLine === {json.dumps(padded)} || firstLine === {json.dumps(str(day))};
          }});
          if (!match) return null;
          match.scrollIntoView({{ block: 'center' }});
          const r = match.getBoundingClientRect();
          return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
        }})()
        """
    )
    if not card_pos:
        raise AssertionError(f"Day {padded} card not found inside AdventCalendar modal")
    client.click_at(card_pos["x"], card_pos["y"])
    client.wait_until(
        f"!/calendario de adviento criminal/i.test(document.body.innerText) && "
        f"/día {padded}|capítulo {padded}|expediente n\\.º {padded}/i.test(document.body.innerText)",
        timeout=5.0,
        description=f"Day {padded} mounted",
    )
    client.drain_events(0.15)


def switch_mobile_page(client: ChromeCDPClient, side: str) -> None:
    """Switch mobile spread between 'left' (Relato / Álbum p1) and 'right' (Pasatiempo / Álbum p2)."""
    if side == "left":
        try:
            click_button_by_text(client, "Relato")
        except AssertionError:
            click_button_by_text(client, "Pliego Izq")
    else:
        try:
            click_button_by_text(client, "Pasatiempo")
        except AssertionError:
            click_button_by_text(client, "Pliego Der")
    client.drain_events(0.15)


def get_suspect_card_info(client: ChromeCDPClient, padded_num: str) -> dict[str, Any] | None:
    """Locate a suspect card in SuspectsAlbum by '#01', '#02', etc."""
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const main = document.querySelector('main');
          if (!main) return null;
          const cards = Array.from(main.querySelectorAll('.grid > div')).filter(isVis);
          const card = cards.find(c => (c.innerText || '').includes('#' + {json.dumps(padded_num)}));
          if (!card) return null;
          card.scrollIntoView({{ block: 'center' }});
          const r = card.getBoundingClientRect();
          const img = card.querySelector('img');
          const imgRect = img ? img.getBoundingClientRect() : null;
          const imgStyle = img ? getComputedStyle(img) : null;
          return {{
            cardRect: {{ x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height }},
            text: (card.innerText || '').trim(),
            hasImg: !!img,
            imgSrc: img ? img.getAttribute('src') : null,
            imgComplete: img ? img.complete : false,
            imgNaturalWidth: img ? img.naturalWidth : 0,
            imgNaturalHeight: img ? img.naturalHeight : 0,
            imgTransform: imgStyle ? imgStyle.transform : null,
            imgWidth: imgRect ? imgRect.width : 0,
            imgHeight: imgRect ? imgRect.height : 0
          }};
        }})()
        """
    )


def get_suspect_modal_info(client: ChromeCDPClient) -> dict[str, Any] | None:
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && (/cerrar ficha|cerrar expediente|kodak velox|exp\\. n\\.º/i.test(el.innerText || ''))
          );
          if (!modal) return null;
          const img = modal.querySelector('img');
          return {{
            text: (modal.innerText || '').trim(),
            hasImg: !!img,
            imgSrc: img ? img.getAttribute('src') : null,
            imgComplete: img ? img.complete : false,
            imgNaturalWidth: img ? img.naturalWidth : 0,
            imgNaturalHeight: img ? img.naturalHeight : 0
          }};
        }})()
        """
    )


def close_suspect_modal(client: ChromeCDPClient) -> None:
    try:
        click_button_by_text(client, "Cerrar Ficha", scope_selector=".fixed.inset-0")
    except AssertionError:
        click_element_by_selector(client, '.fixed.inset-0 button[aria-label*="Cerrar expediente"]')
    client.drain_events(0.15)


def collect_all_74_album_cards(client: ChromeCDPClient) -> list[dict[str, Any]]:
    """Paginate through all Day 0 Album spreads and inspect every suspect card + portrait img."""
    go_to_day(client, 0)
    seen: dict[str, dict[str, Any]] = {}
    for _ in range(12):
        cards = client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const main = document.querySelector('main');
              if (!main) return [];
              return Array.from(main.querySelectorAll('.grid > div')).filter(isVis).map(c => {{
                const txt = (c.innerText || '').trim();
                const m = txt.match(/#(\\d{{2}})/);
                const img = c.querySelector('img');
                const h4 = c.querySelector('h4');
                const roleEl = c.querySelector('p');
                return {{
                  num: m ? m[1] : null,
                  name: h4 ? (h4.innerText || '').trim() : '',
                  role: roleEl ? (roleEl.innerText || '').trim() : '',
                  text: txt,
                  hasImg: !!img,
                  imgSrc: img ? img.getAttribute('src') : null,
                  imgComplete: img ? img.complete : false,
                  imgNaturalWidth: img ? img.naturalWidth : 0,
                  imgNaturalHeight: img ? img.naturalHeight : 0
                }};
              }}).filter(x => x.num !== null);
            }})()
            """
        ) or []
        for card in cards:
            seen[card["num"]] = card

        if len(seen) >= 74:
            break
        # Click next spread ("Pliego Sig.") if enabled
        can_next = client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const btns = Array.from(document.querySelectorAll('main button')).filter(isVis);
              const nextBtn = btns.find(b => /pliego sig/i.test(b.innerText || ''));
              if (!nextBtn || nextBtn.disabled) return null;
              const r = nextBtn.getBoundingClientRect();
              return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
            """
        )
        if not can_next:
            break
        client.click_at(can_next["x"], can_next["y"])
        client.drain_events(0.15)
    _rewind_album_to_first_spread(client)
    return [seen[k] for k in sorted(seen.keys())]


def open_dossier(client: ChromeCDPClient) -> None:
    ensure_book_open(client)
    if client.eval_js("/cuaderno del detective/i.test(document.body.innerText)"):
        return
    click_button_by_text(client, "Cuaderno", scope_selector="header")
    client.wait_until(
        "/cuaderno del detective/i.test(document.body.innerText)",
        timeout=5.0,
        description="DetectiveDossier open",
    )


def close_dossier(client: ChromeCDPClient) -> None:
    if not client.eval_js("/cuaderno del detective/i.test(document.body.innerText)"):
        return
    click_button_by_text(client, "Cerrar Cuaderno", scope_selector=".fixed.inset-0")
    client.wait_until(
        "!/cuaderno del detective/i.test(document.body.innerText)",
        timeout=5.0,
        description="DetectiveDossier closed",
    )


def get_dossier_counts(client: ChromeCDPClient) -> dict[str, Any]:
    """Open DetectiveDossier and count suspects (74), weapons (18), and rooms (9) across tabs."""
    open_dossier(client)
    # Tab 1: Matriz Murdoku
    click_button_by_text(client, "Matriz", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    matrix_text = client.eval_js("document.body.innerText")

    # Tab 2: Censo de 74 Sospechosos
    click_button_by_text(client, "Censo", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    censo_info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && /cuaderno del detective/i.test(el.innerText || '')
          );
          if (!modal) return null;
          const txt = modal.innerText || '';
          const suspectNums = Array.from(new Set((txt.match(/#\\d{{2}}/g) || [])));
          const imgs = Array.from(modal.querySelectorAll('img')).map(i => ({{
            src: i.getAttribute('src') || '',
            complete: i.complete,
            naturalWidth: i.naturalWidth
          }}));
          return {{ suspectCount: suspectNums.length, suspectNums, imgCount: imgs.length, brokenImgs: imgs.filter(i => !i.complete || i.naturalWidth <= 0) }};
        }})()
        """
    )

    # Tab 3: Armas y Habitaciones
    click_button_by_text(client, "Armas", scope_selector=".fixed.inset-0")
    client.drain_events(0.15)
    armas_info = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modal = Array.from(document.querySelectorAll('.fixed.inset-0')).find(el =>
            isVis(el) && /cuaderno del detective/i.test(el.innerText || '')
          );
          if (!modal) return null;
          const txt = modal.innerText || '';
          const grids = Array.from(modal.querySelectorAll('.grid')).filter(isVis);
          const gridSizes = grids.map(g => g.children.length);
          const headings = Array.from(modal.querySelectorAll('h3, h4')).filter(isVis);
          const countSection = (re) => {{
            const h = headings.find(el => re.test(el.innerText || ''));
            const list = h && h.parentElement ? h.parentElement.querySelector('.grid, .space-y-2, .space-y-2\\\\.5, ul') : null;
            return list ? Array.from(list.children).filter(isVis).length : 0;
          }};
          const weaponItems = countSection(/armas/i);
          const roomItems = countSection(/habitaciones|ubicaciones|estancias/i);
          return {{
            text: txt,
            gridSizes,
            weaponItems,
            roomItems,
            has18Weapons: gridSizes.includes(18) || weaponItems === 18,
            has9Rooms: gridSizes.includes(9) || roomItems === 9,
          }};
        }})()
        """
    )

    return {
        "matrixText": matrix_text,
        "censo": censo_info,
        "armas": armas_info,
    }


def open_verdict_modal(client: ChromeCDPClient) -> None:
    ensure_book_open(client)
    if client.eval_js("/audiencia formal de acusación/i.test(document.body.innerText)"):
        return
    click_button_by_text(client, "Veredicto", scope_selector="header")
    client.wait_until(
        "/audiencia formal de acusación/i.test(document.body.innerText)",
        timeout=5.0,
        description="FinalVerdictModal open",
    )


def close_verdict_modal(client: ChromeCDPClient) -> None:
    if not client.eval_js("/audiencia formal de acusación/i.test(document.body.innerText)"):
        return
    click_element_by_selector(client, 'button[title*="Cerrar audiencia"], button[aria-label*="Cerrar audiencia"]')
    client.wait_until(
        "!/audiencia formal de acusación/i.test(document.body.innerText)",
        timeout=5.0,
        description="FinalVerdictModal closed",
    )


def _verdict_modal_sections_js() -> str:
    return f"""
    {_is_visible_js()}
    function findVerdictModalAndSections() {{
      const modal = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).find(el =>
        isVis(el) && /audiencia formal de acusación/i.test(el.innerText || '')
      );
      if (!modal) return null;
      const form = modal.querySelector('form') || modal;

      const labelPatterns = {{
        suspect: /1\\.\\s*¿quién|quién asesinó|sospechoso|culpable/i,
        weapon: /2\\.\\s*¿qué instrumento|arma|instrumento/i,
        room: /3\\.\\s*¿en qué estancia|estancia|habitación|ubicación/i,
      }};

      const findSection = (key, testId) => {{
        const byId = form.querySelector('[data-testid="' + testId + '"]');
        if (byId && isVis(byId)) return byId;
        const lbls = Array.from(form.querySelectorAll('label, h3, h4, legend, p, span')).filter(el => {{
          if (!isVis(el)) return false;
          const t = (el.innerText || '').replace(/\\s+/g, ' ').trim();
          return t.length <= 140 && labelPatterns[key].test(t);
        }});
        if (!lbls.length) return null;
        const lbl = lbls[0];
        let cur = lbl.parentElement;
        const otherKeys = Object.keys(labelPatterns).filter(k => k !== key);
        while (cur && cur !== form && cur !== modal) {{
          const txt = cur.innerText || '';
          const hitsOther = otherKeys.some(ok => labelPatterns[ok].test(txt));
          if (hitsOther) break;
          const hasControls = !!cur.querySelector('select') ||
            Array.from(cur.querySelectorAll('button')).filter(b => isVis(b)).length >= 2 ||
            !!cur.querySelector('.grid');
          if (hasControls) return cur;
          cur = cur.parentElement;
        }}
        return lbl.parentElement;
      }};

      const extractOptionLabel = (btn) => {{
        const serif = btn.querySelector('.font-serif');
        if (serif && (serif.innerText || '').trim()) {{
          return (serif.innerText || '').replace(/\\s+/g, ' ').trim();
        }}
        const lines = (btn.innerText || '').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
        return lines[0] || (btn.innerText || '').replace(/\\s+/g, ' ').trim();
      }};

      const extractSectionOptions = (sec) => {{
        if (!sec) return [];
        const sel = sec.querySelector('select');
        if (sel) {{
          return Array.from(sel.options)
            .filter(o => (o.value || '').trim() !== '' && !/^selecciona/i.test((o.textContent || '').trim()))
            .map(o => (o.textContent || '').replace(/\\s+/g, ' ').trim());
        }}
        return Array.from(sec.querySelectorAll('button')).filter(b => {{
          if (!isVis(b)) return false;
          const meta = ((b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).toLowerCase();
          if (/cerrar|limpiar|lacrar|proclamar/.test(meta)) return false;
          return (b.innerText || '').trim().length > 0;
        }}).map(extractOptionLabel).filter(Boolean);
      }};

      const suspectSec = findSection('suspect', 'verdict-suspect-section');
      const weaponSec = findSection('weapon', 'verdict-weapon-section');
      const roomSec = findSection('room', 'verdict-room-section');

      return {{
        modal,
        form,
        sections: {{ suspect: suspectSec, weapon: weaponSec, room: roomSec }},
        extractOptionLabel,
        extractSectionOptions,
      }};
    }}
    """


def get_verdict_options(client: ChromeCDPClient) -> dict[str, Any]:
    """Inspect all selectable suspects, weapons, and rooms inside FinalVerdictModal."""
    open_verdict_modal(client)
    return client.eval_js(
        f"""
        (() => {{
          {_verdict_modal_sections_js()}
          const ctx = findVerdictModalAndSections();
          if (!ctx) return null;
          const {{ modal, sections, extractSectionOptions }} = ctx;
          const txt = modal.innerText || '';
          const selectOpts = Array.from(modal.querySelectorAll('select option'))
            .filter(o => (o.value || '').trim() !== '')
            .map(o => (o.textContent || '').trim()).filter(Boolean);
          const buttons = Array.from(modal.querySelectorAll('button')).filter(isVis).map(b => (b.innerText || '').replace(/\\s+/g, ' ').trim());
          const searchInputs = Array.from(modal.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')).filter(isVis).length;
          const suspects = extractSectionOptions(sections.suspect);
          const weapons = extractSectionOptions(sections.weapon);
          const rooms = extractSectionOptions(sections.room);
          return {{
            text: txt,
            selectOptionCount: selectOpts.length,
            buttons,
            searchInputs,
            suspects,
            weapons,
            rooms,
            suspectCount: suspects.length,
            weaponCount: weapons.length,
            roomCount: rooms.length,
          }};
        }})()
        """
    )


def pick_wrong_verdict_options(
    client: ChromeCDPClient,
    solution: dict[str, str] | None = None,
) -> tuple[str, str, str]:
    """Pick guaranteed-real, valid wrong verdict options directly from FinalVerdictModal."""
    sol = solution or read_active_case_solution(client)
    opts = get_verdict_options(client)
    if not opts:
        raise AssertionError("FinalVerdictModal not found when picking wrong verdict options")
    suspects = opts.get("suspects") or []
    weapons = opts.get("weapons") or []
    rooms = opts.get("rooms") or []
    if not suspects or not weapons or not rooms:
        raise AssertionError(
            f"FinalVerdictModal missing selectable options: suspects={len(suspects)}, weapons={len(weapons)}, rooms={len(rooms)}"
        )
    culprit_low = sol["culpritName"].strip().lower()
    weapon_low = sol["weaponName"].strip().lower()
    room_low = sol["roomName"].strip().lower()

    wrong_suspect = next(
        (s for s in suspects if culprit_low not in s.lower() and s.lower() not in culprit_low),
        None,
    )
    if not wrong_suspect:
        raise AssertionError(f"Could not pick a wrong suspect distinct from {sol['culpritName']!r} in {suspects[:5]}")
    wrong_weapon = next((w for w in weapons if weapon_low not in w.lower()), weapons[0])
    wrong_room = next((r for r in rooms if room_low not in r.lower()), rooms[0])
    return wrong_suspect, wrong_weapon, wrong_room


def select_verdict_and_submit(
    client: ChromeCDPClient,
    suspect_name: str,
    weapon_name: str,
    room_name: str,
) -> str:
    """Select suspect (using search filter if present), weapon, room inside FinalVerdictModal sections and submit."""
    open_verdict_modal(client)
    # Scope search input query strictly inside suspect section (or modal)
    has_search = client.eval_js(
        f"""
        (() => {{
          {_verdict_modal_sections_js()}
          const ctx = findVerdictModalAndSections();
          if (!ctx) return null;
          const scope = ctx.sections.suspect || ctx.modal;
          const inp = Array.from(scope.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')).find(isVis);
          if (!inp) return null;
          inp.focus();
          const r = inp.getBoundingClientRect();
          return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
        }})()
        """
    )
    if has_search:
        client.click_at(has_search["x"], has_search["y"])
        client.eval_js(
            """
            (() => {
              const el = document.activeElement;
              if (el && 'value' in el) {
                const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                proto.set.call(el, '');
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            })()
            """
        )
        client.insert_text(suspect_name)
        client.drain_events(0.15)

    for sec_key, target in (("suspect", suspect_name), ("weapon", weapon_name), ("room", room_name)):
        res = client.eval_js(
            f"""
            (() => {{
              {_verdict_modal_sections_js()}
              const ctx = findVerdictModalAndSections();
              if (!ctx) return {{ ok: false, reason: 'modal_missing' }};
              const sec = ctx.sections[{json.dumps(sec_key)}];
              if (!sec) return {{ ok: false, reason: 'section_missing' }};
              const needle = {json.dumps(target)}.replace(/\\s+/g, ' ').trim().toLowerCase();

              const sel = sec.querySelector('select');
              if (sel) {{
                const opts = Array.from(sel.options).filter(o => (o.value || '').trim() !== '');
                const opt = opts.find(o => (o.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase() === needle)
                  || opts.find(o => (o.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase().includes(needle));
                if (!opt) return {{ ok: false, reason: 'select_option_not_found' }};
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', {{ bubbles: true }}));
                return {{ ok: true, mode: 'select' }};
              }}

              const btns = Array.from(sec.querySelectorAll('button')).filter(b => {{
                if (!isVis(b)) return false;
                const meta = ((b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase();
                return !/cerrar|limpiar/.test(meta);
              }});
              const match = btns.find(b => {{
                const lbl = ctx.extractOptionLabel(b).toLowerCase();
                const full = (b.innerText || '').replace(/\\s+/g, ' ').trim().toLowerCase();
                return lbl === needle || full === needle;
              }}) || btns.find(b => {{
                const lbl = ctx.extractOptionLabel(b).toLowerCase();
                const full = (b.innerText || '').replace(/\\s+/g, ' ').trim().toLowerCase();
                return lbl.includes(needle) || full.includes(needle);
              }});
              if (!match) return {{ ok: false, reason: 'button_not_found', avail: btns.slice(0, 6).map(ctx.extractOptionLabel) }};
              if (match.disabled) return {{ ok: false, reason: 'button_disabled' }};
              match.scrollIntoView({{ block: 'center', inline: 'center' }});
              const r = match.getBoundingClientRect();
              return {{ ok: true, mode: 'button', x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
            """
        )
        if not res or not res.get("ok"):
            raise AssertionError(
                f"Option {target!r} not found/clickable in FinalVerdictModal {sec_key} section: {res}"
            )
        if res.get("mode") == "button":
            client.click_at(res["x"], res["y"])
        client.drain_events(0.1)

    submit_pos = client.eval_js(
        f"""
        (() => {{
          {_verdict_modal_sections_js()}
          const ctx = findVerdictModalAndSections();
          if (!ctx) return null;
          const btn = ctx.modal.querySelector('button[type="submit"]') ||
            Array.from(ctx.modal.querySelectorAll('button')).find(b =>
              isVis(b) && /lacrar y proclamar/i.test(b.innerText || '')
            );
          if (!btn || !isVis(btn)) return null;
          btn.scrollIntoView({{ block: 'center', inline: 'center' }});
          const r = btn.getBoundingClientRect();
          return {{ disabled: !!btn.disabled, x: r.left + r.width / 2, y: r.top + r.height / 2 }};
        }})()
        """
    )
    if not submit_pos:
        raise AssertionError("Submit button 'Lacrar y Proclamar' not found inside FinalVerdictModal")
    if submit_pos["disabled"]:
        raise AssertionError("Submit button 'Lacrar y Proclamar' remained disabled after selecting 3 charges")
    client.click_at(submit_pos["x"], submit_pos["y"])
    client.wait_until(
        "/contradicción en las pruebas|caso resuelto/i.test(document.body.innerText)",
        timeout=5.0,
        description="Verdict result screen",
    )
    return str(
        client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const modal = Array.from(document.querySelectorAll('.fixed.inset-0, [role="dialog"]')).find(el =>
                isVis(el) && /contradicción en las pruebas|caso resuelto|audiencia formal/i.test(el.innerText || '')
              );
              return modal ? modal.innerText : document.body.innerText;
            }})()
            """
        )
    )


def _load_universe_id_name_map() -> dict[str, str]:
    """Read id -> Spanish display name mappings from src/data/*.ts for activeCase.config resolution."""
    id_map: dict[str, str] = {}
    obj_re = re.compile(
        r"\{\s*id:\s*['\"]([^'\"]+)['\"][^{}]*?\bname:\s*['\"]([^'\"]+)['\"]",
        re.DOTALL,
    )
    for rel in (
        "src/data/suspectsDirectory.ts",
        "src/data/narrativeBible.ts",
        "src/data/crimeUniverse.ts",
    ):
        fpath = PROJECT_ROOT / rel
        if not fpath.exists():
            continue
        text = fpath.read_text(encoding="utf-8", errors="replace")
        for m in obj_re.finditer(text):
            id_map[m.group(1)] = m.group(2)
    return id_map


def read_active_case_solution(client: ChromeCDPClient) -> dict[str, str]:
    """Read generated activeCase culprit/weapon/room ONLY for Tier 4 dynamic victory / wrong-verdict contrast."""
    raw = client.get_local_storage(STORAGE_KEY)
    if not raw:
        raise AssertionError(f"localStorage[{STORAGE_KEY!r}] is empty")
    data = json.loads(raw)
    state = data.get("state") or data
    active_case = state.get("activeCase") or {}
    cfg = active_case.get("config") or {}
    culprit_obj = active_case.get("culprit") or {}
    weapon_obj = active_case.get("weapon") or {}
    location_obj = active_case.get("location") or active_case.get("room") or {}

    id_map = _load_universe_id_name_map()

    culprit_raw = (
        active_case.get("culpritName")
        or culprit_obj.get("name")
        or active_case.get("culpritId")
        or cfg.get("culpritId")
        or state.get("culpritId")
    )
    weapon_raw = (
        active_case.get("weaponName")
        or weapon_obj.get("name")
        or active_case.get("weaponId")
        or cfg.get("weaponId")
        or state.get("weaponId")
    )
    room_raw = (
        active_case.get("locationName")
        or active_case.get("roomName")
        or location_obj.get("name")
        or active_case.get("locationId")
        or active_case.get("roomId")
        or cfg.get("locationId")
        or cfg.get("roomId")
        or state.get("locationId")
    )
    if not (culprit_raw and weapon_raw and room_raw):
        raise AssertionError(f"Could not extract dynamic activeCase solution from storage keys: {list(active_case.keys())}")

    culprit = id_map.get(str(culprit_raw), str(culprit_raw))
    weapon = id_map.get(str(weapon_raw), str(weapon_raw))
    room = id_map.get(str(room_raw), str(room_raw))
    return {
        "caseSeed": str(state.get("caseSeed") or active_case.get("seed") or cfg.get("seed") or ""),
        "culpritName": str(culprit),
        "weaponName": str(weapon),
        "roomName": str(room),
    }


def find_detective_state(client: ChromeCDPClient) -> dict[str, Any]:
    """Locate Azlynn trigger, portal radial menu, and speech/hint bubble without #root collisions."""
    return client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const trigger = document.querySelector('[data-testid="detective-hint-button"]');
          const bubble = document.querySelector('[data-testid="detective-hint-bubble"]');
          const tr = trigger && isVis(trigger) ? trigger.getBoundingClientRect() : null;
          const br = bubble && isVis(bubble) ? bubble.getBoundingClientRect() : null;
          const radialContainer = document.querySelector('[data-testid="detective-radial-menu"]');
          const candidateBtns = radialContainer
            ? Array.from(radialContainer.querySelectorAll('button'))
            : Array.from(document.querySelectorAll('body > div:not(#root) button')).filter(
                b => !b.closest('[data-testid="detective-hint-bubble"]')
              );
          const radialActionLabels = new Set(['pistas', 'diálogo', 'caso', 'reiniciar']);
          const radialBtns = candidateBtns.filter(b => {{
            if (!isVis(b)) return false;
            const norm = (b.innerText || '').replace(/\\s+/g, ' ').trim().toLowerCase();
            return radialActionLabels.has(norm);
          }}).map(b => {{
            const r = b.getBoundingClientRect();
            return {{
              text: (b.innerText || '').replace(/\\s+/g, ' ').trim(),
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom
            }};
          }});
          const imgs = Array.from(document.querySelectorAll('img')).filter(i =>
            /detective-/i.test(i.getAttribute('src') || '') && isVis(i)
          ).map(i => ({{
            src: i.getAttribute('src') || '',
            complete: i.complete,
            naturalWidth: i.naturalWidth
          }}));
          return {{
            hasTrigger: !!tr,
            trigger: tr ? {{ x: tr.left + tr.width / 2, y: tr.top + tr.height / 2, width: tr.width, height: tr.height }} : null,
            radialOpen: radialBtns.length >= 4,
            radialBtns,
            hasBubble: !!br,
            bubbleText: bubble && isVis(bubble) ? (bubble.innerText || '').replace(/\\s+/g, ' ').trim() : '',
            bubbleRect: br ? {{ left: br.left, top: br.top, right: br.right, bottom: br.bottom }} : null,
            azlynnImgs: imgs
          }};
        }})()
        """
    )


def _dismiss_azlynn_bubble_if_open(client: ChromeCDPClient, st: dict[str, Any]) -> dict[str, Any]:
    if st["hasBubble"] and not st["radialOpen"]:
        close_azlynn_bubble(client)
        st = find_detective_state(client)
        if st["hasBubble"] and not st["radialOpen"] and st["hasTrigger"]:
            client.click_at(st["trigger"]["x"], st["trigger"]["y"])
            client.wait_until(
                "!document.querySelector('[data-testid=\"detective-hint-bubble\"]')",
                timeout=2.0,
                description="Azlynn bubble dismissed via trigger",
            )
            st = find_detective_state(client)
    return st


def open_azlynn_tab(client: ChromeCDPClient, tab_name: str = "Pistas") -> dict[str, Any]:
    """Open Azlynn's radial menu and select 'Pistas', 'Diálogo', or 'Caso' via portal coordinates."""
    st = find_detective_state(client)
    if not st["hasTrigger"]:
        raise AssertionError("Azlynn trigger [data-testid='detective-hint-button'] not found")
    st = _dismiss_azlynn_bubble_if_open(client, st)
    if not st["radialOpen"]:
        client.click_at(st["trigger"]["x"], st["trigger"]["y"])
        client.wait_until(
            "Array.from(document.querySelectorAll('body > div:not(#root) button')).some("
            "b => !b.closest('[data-testid=\"detective-hint-bubble\"]') && "
            "/^(pistas|diálogo|caso|reiniciar)$/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))",
            timeout=3.0,
            description="Azlynn radial menu open",
        )
        st = find_detective_state(client)

    target = next(
        (b for b in st["radialBtns"] if b["text"].strip().lower() == tab_name.strip().lower()),
        None,
    )
    if not target:
        raise AssertionError(f"Azlynn radial button {tab_name!r} not found in {st['radialBtns']}")
    client.click_at(target["x"], target["y"])
    client.wait_until(
        "(() => { const b = document.querySelector('[data-testid=\"detective-hint-bubble\"]'); "
        "if (!b) return false; const st = getComputedStyle(b); const r = b.getBoundingClientRect(); "
        "return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0 && r.width > 0.5 && r.height > 0.5; })()",
        timeout=3.0,
        description=f"Azlynn bubble ({tab_name})",
    )
    client.drain_events(0.15)
    return find_detective_state(client)


def close_azlynn_bubble(client: ChromeCDPClient) -> None:
    if client.eval_js("!!document.querySelector('[data-testid=\"detective-hint-close\"]')"):
        click_element_by_selector(client, '[data-testid="detective-hint-close"]')
        client.wait_until(
            "!document.querySelector('[data-testid=\"detective-hint-bubble\"]')",
            timeout=2.0,
            description="Azlynn bubble closed",
        )
        client.drain_events(0.1)


def trigger_reset_game(client: ChromeCDPClient) -> None:
    """Reset current case progress via Azlynn radial 'Reiniciar' (portal coordinates)."""
    ensure_book_open(client)
    st = find_detective_state(client)
    if not st["hasTrigger"]:
        raise AssertionError("Azlynn trigger [data-testid='detective-hint-button'] not found for Reiniciar")
    st = _dismiss_azlynn_bubble_if_open(client, st)
    if not st["radialOpen"]:
        client.click_at(st["trigger"]["x"], st["trigger"]["y"])
        client.wait_until(
            "Array.from(document.querySelectorAll('body > div:not(#root) button')).some("
            "b => !b.closest('[data-testid=\"detective-hint-bubble\"]') && "
            "/^reiniciar$/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()))",
            timeout=3.0,
            description="Azlynn radial menu open for Reiniciar",
        )
        st = find_detective_state(client)
    reset_btn = next((b for b in st["radialBtns"] if b["text"].strip().lower() == "reiniciar"), None)
    if not reset_btn:
        raise AssertionError(f"Azlynn radial 'Reiniciar' button not found in {st['radialBtns']}")
    client.click_at(reset_btn["x"], reset_btn["y"])
    client.drain_events(0.25)


def trigger_new_case(client: ChromeCDPClient) -> None:
    """Trigger a fresh seeded case ('Nuevo Caso' / 'Nueva Partida') via scoped UI & strict confirmation."""
    ensure_book_open(client)
    clicked = False
    for needle in ("Nuevo Caso", "Nueva Partida", "Nuevo Misterio"):
        try:
            click_button_by_text(client, needle, scope_selector="header")
            clicked = True
            break
        except AssertionError:
            pass

    if not clicked:
        st = find_detective_state(client)
        st = _dismiss_azlynn_bubble_if_open(client, st)
        if st["hasTrigger"] and not st["radialOpen"]:
            client.click_at(st["trigger"]["x"], st["trigger"]["y"])
            client.drain_events(0.15)
        pos = client.eval_js(
            f"""
            (() => {{
              {_is_visible_js()}
              const btns = Array.from(document.querySelectorAll('body > div:not(#root) button, .fixed.inset-0 button')).filter(isVis);
              const match = btns.find(b => /nuevo caso|nueva partida|nuevo misterio/i.test((b.innerText || b.getAttribute('title') || b.getAttribute('aria-label') || '')));
              if (!match || match.disabled) return null;
              const r = match.getBoundingClientRect();
              return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
            }})()
            """
        )
        if pos:
            client.click_at(pos["x"], pos["y"])
            clicked = True

    if not clicked:
        raise AssertionError("Could not find 'Nuevo Caso' / 'Nueva Partida' UI button")

    client.drain_events(0.2)
    # Confirm ONLY if an explicit confirmation modal appears (exact ^sí$ match, never 'Sílabas')
    confirm_pos = client.eval_js(
        f"""
        (() => {{
          {_is_visible_js()}
          const modals = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], .fixed.inset-0')).filter(el => {{
            if (!isVis(el)) return false;
            const z = parseFloat(getComputedStyle(el).zIndex || '0');
            if (z < 40) return false;
            const txt = el.innerText || '';
            if (/cuaderno del detective|audiencia formal de acusación|calendario de adviento criminal/i.test(txt)) return false;
            return /nuevo caso|nueva partida|confirmar|seguro|perderá|reiniciar/i.test(txt);
          }});
          if (!modals.length) return null;
          const modal = modals[modals.length - 1];
          const btns = Array.from(modal.querySelectorAll('button')).filter(isVis);
          const match = btns.find(b => /^(confirmar|iniciar nuevo caso|generar nuevo caso|aceptar|continuar|sí|si)$/i.test((b.innerText || '').replace(/\\s+/g, ' ').trim()));
          if (!match || match.disabled) return null;
          const r = match.getBoundingClientRect();
          return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
        }})()
        """
    )
    if confirm_pos:
        client.click_at(confirm_pos["x"], confirm_pos["y"])
        client.drain_events(0.25)


def wait_for_detective_bubble(client: ChromeCDPClient, timeout: float = 20.0) -> str:
    """Wait for an automatic/passive Azlynn bubble without clicking."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        st = find_detective_state(client)
        if st["hasBubble"] and len(st["bubbleText"]) >= 12:
            return str(st["bubbleText"])
        client.sleep(0.4)
    raise TimeoutError(f"Automatic detective bubble did not appear within {timeout}s")
