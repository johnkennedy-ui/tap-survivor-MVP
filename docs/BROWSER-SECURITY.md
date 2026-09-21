# Browser security controls

`index.html` uses a restrictive meta CSP because GitHub Pages does not expose
repository-controlled response headers. The policy permits only same-origin
scripts, images, media, fonts, and connections. It deliberately excludes remote
origins, wildcards, `data:`, `blob:`, and `unsafe-eval`.

`style-src 'unsafe-inline'` remains required for existing runtime CSS custom
properties used by relic presentation. It must not be broadened without a
demonstrated runtime need. A meta CSP cannot provide response-header-only
protections; the page also sets `no-referrer` directly.

Runtime UI content is constructed with DOM nodes and `textContent`; content,
save, and runtime strings must never be interpolated into HTML execution sinks.
Sprite and icon assignments accept only normalized relative paths; schemes,
absolute/protocol-relative paths, and traversal are rejected.

Run the focused checks with:

```sh
node scripts/check-browser-security.mjs
node scripts/smoke-browser-security.mjs
```
