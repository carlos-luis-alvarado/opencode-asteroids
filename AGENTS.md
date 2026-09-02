# AGENTS.md

Vanilla JS + HTML5 Canvas Asteroids clone. No dependencies, no bundler, no `package.json`, no build step — do not introduce any.

## Running / verification

- Open `index.html` directly in a browser, or `npx serve .` → `http://localhost:3000`.
- There are no tests, linter, or typecheck. Verify changes manually in the browser (rotate/thrust/shoot, lose a life, restart with Space).
- `game.js` touches `document` at top level, so it cannot be smoke-tested with Node — browser context only.

## Architecture

- The entire game lives in `game.js`, loaded via a plain `<script>` tag in `index.html` (not ES modules). Single-file is intentional per README; don't split into modules.
- `W`/`H` constants in `game.js` (800×600) must stay in sync with the canvas `width`/`height` attributes in `index.html`.
- Loop: `requestAnimationFrame` → `update(dt)` → `draw()`; `dt` is clamped to 0.05 s. Space is toroidal — positions wrap via `wrap()`.

## Conventions & gotchas

- Comments, HUD/UI strings, and README are in Spanish — keep new ones in Spanish.
- Input: `pressed(code)` consumes the `justPressed` flag, so each key press can be read exactly once per frame. Reading it twice silently drops the event.
