# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A static bilingual (English / Simplified Chinese) wiki for Chinese FRC (FIRST Robotics Competition) teams, published from this repo (GitHub remote: `Webstie/China_FRC_Association`, likely served as GitHub Pages). It is intentionally a flat set of hand-authored HTML files — no build system, no package manager, no framework, no tests, no CI.

## Running / previewing

There is nothing to build. Open any `*.html` directly in a browser, or serve the directory statically (e.g. `python3 -m http.server` from the repo root) if you need same-origin behavior for `localStorage`. The repo root *is* the site root — relative links like `href="code.html"` assume that.

## Site structure (mental model)

Three "page families" share `styles.css` but use different class namespaces. **Pick the right family when adding a page — do not mix.**

1. **Generic family** — default styling. Body has no special class (or just sits on default `styles.css`).
   - Pages: `index.html`, `shopping.html`, `design.html`, `calendar.html`, `registration.html`, and the five supplier sub-pages (`andymark.html`, `rev.html`, `wcp.html`, `vexpro.html`, `ctre.html`).
   - Key classes: `.page-header`, `.hero`, `.card-grid` + `.card`, `.resource-list`, `.process-grid` + `.process-step` + `.step-number`, `.checklist`, `.callout`, `.callout.todo`.

2. **Code family** — `<body class="code-page">`. Used for `code.html` (the programming hub).
   - Key classes: `.code-hero` + `.code-console`, `.intro-panel` + `.quick-facts`, `.language-grid` + `.language-card` (with `.featured` modifier), `.tool-list` + `.tool-item`, `.code-sample-section` + `.code-window`, `.timeline-list`, `.advanced-panel` + `.topic-tags`, `.eyebrow`, `.section-heading`.
   - The current branch `Command_Base_Robot_Intro` suggests an in-progress sub-page off `code.html` — match this family's look if extending it.

3. **Software family** — `<body class="software-page">`. Used for the four installer guide sub-pages: `software-wpilib.html`, `software-frc-game-tools.html`, `software-rev-hardware-client.html`, `software-phoenix-tuner-x.html`. These are linked from the "Required Software" section of `code.html` (`#software` anchor).
   - Key classes: `.software-hero` + `.software-summary` (Mac-style traffic-light strip is drawn via `::before` — no extra markup needed), `.back-link`, `.software-article` (each `<section>` inside renders as a white card), `.check-grid`, `.article-steps` (auto-numbered via CSS `counter()`), `.download-panel` + `.download-actions` (alternating red/blue buttons via `:nth-child(even)`).

4. **One outlier — `info.html`** uses `<body class="info-dark">` with a dark "tech" theme defined in an **inline `<style>` block inside `<head>`**, not in `styles.css`. Classes like `.tech-card`, `.category-section`, `.featured-block`, `.stats-row`, `.hero-eyebrow` only exist there. If you touch this page, edit the inline styles; don't try to extract them unless asked.

CSS theme variables (in `:root` of `styles.css`): `--frc-blue` `#0066B3`, `--frc-red` `#ED1C24`, `--frc-dark` `#1a1a2e`, `--frc-light`, `--frc-gray`, `--frc-border`, `--frc-accent`. Use these instead of hex literals when adding rules.

## Bilingual content — two patterns that must not be mixed within one page

The site is in the middle of a migration. Both patterns work, but each page commits to exactly one.

### Pattern A — Inline bilingual (older, still dominant)

Both languages are written into the markup together and always visible. There is no script, no toggle button.

Typical shapes:
- Headings: `<h1>Shopping &amp; Suppliers</h1>` with a sibling `<p class="chinese">购物与供应商 — 零件采购指南</p>`.
- Section headings: `<h2>International Vendors 国际供应商</h2>` (English first, then Chinese, separated by a space).
- Card titles: English `<h3>`, then `<div class="chinese">中文名</div>`, then a description that may itself be bilingual.

Used by all generic-family pages and the info page. The `<html>` tag stays at `lang="zh-CN"`.

### Pattern B — Toggle-based (newer; code + software families)

Chinese is the visible default; English lives in `data-en` attributes. `language-toggle.js` swaps `textContent` on click and persists the choice in `localStorage` under key `frc-wiki-language` (`"zh"` or `"en"`, default `"zh"`).

To make a new element toggleable: write the Chinese text as the element's content and add `data-en="English text"`. The script captures the original Chinese into `data-zh` on first run, so you don't need to write `data-zh` yourself.

Required wiring on these pages:
- `<script src="language-toggle.js"></script>` just before `</body>`.
- A toggle button inside `<ul class="nav-links">`: `<li><button class="language-toggle" type="button" data-language-toggle data-en="中文">EN</button></li>`.
- For a toggleable `<title>`, set `data-title-en` and `data-title-zh` on `<body>` (the script reads from `body.dataset` — see `language-toggle.js:32-34`).

Used by `code.html` and the four `software-*.html` pages. When extending the code section (e.g. the in-progress Command-Based intro page), use Pattern B.

## Navigation is duplicated, not templated

Every HTML file has its own copy of `<nav class="navbar">...</nav>`. There is no include / partial mechanism.

**Consequence:** when you add, rename, or reorder a top-level nav link, you must update the `<ul class="nav-links">` in every HTML file. The current set of seven main links is: 主页 (`index.html`), 信息 (`info.html`), 购物 (`shopping.html`), 代码 (`code.html`), 设计 (`design.html`), 日历 (`calendar.html`), 注册 (`registration.html`). The active page gets `class="active"` on its own `<a>`.

Sub-pages (supplier and software pages) keep the same seven-link nav and mark the *parent* section as active (e.g. supplier pages mark 购物 active, software pages mark 代码 active).

Pattern-B pages must also include the language-toggle `<li>` inside `<ul class="nav-links">`; Pattern-A pages must not.

## Sub-page link conventions

- Supplier pages are linked from `shopping.html` via `<ul class="resource-list">` entries and footer back-links to `shopping.html`.
- Software pages are linked from `code.html`'s `#software` section via `.tool-item` anchors. Their back-links and footer go to `code.html#software` (with the anchor).
- Footer pattern: `<footer><p>FRC Wiki CN · <a href="...">Back to ...</a></p></footer>`. Toggle-aware pages additionally use `data-en` on the back link text.

## Placeholders are intentional

`Lorem ipsum`, `to be implemented`, `TBD`, `<em>To be linked.</em>`, dead `href="#"` anchors, and `<div class="callout todo">…</div>` blocks are *deliberate* markers of content awaiting community contribution. Do not remove or "fix" them unless the task is to fill them in with real content. `.callout.todo` (red left border) is the conventional flag for "this section needs work."

## Editorial / content notes

- Page language attribute on `<html>` stays `zh-CN` even when English is shown — the toggle script flips `document.documentElement.lang` at runtime for Pattern B pages.
- Use the existing CSS variables, the established class names, and the established Chinese punctuation conventions ("、", " — " between English and Chinese in section headings) rather than inventing new ones.
- Body font stack already covers Chinese (`PingFang SC`, `Microsoft YaHei`) — no extra `@font-face` needed.
- The site is responsive; a single `@media (max-width: 768px)` block at the end of `styles.css` handles mobile. New grid layouts should collapse to single-column there.

## What's *not* in this repo

No `package.json`, no `node_modules`, no Tailwind/PostCSS config, no `.github/workflows`, no Cursor/Copilot rules, no test files. The README is currently a stub. Do not invent build scripts or tooling unless explicitly asked.
