# Runtime Parity

`www/` is the single generated runtime artefact for Tap Survivor.

GitHub Pages deploys `www/`. Capacitor Android syncs `www/`. GitHub.io and Android must have runtime parity: the same source change must produce the same playable runtime for both targets.

Save/runtime parity requires the same save schema and save API on GitHub.io and Android. The storage backend may differ by platform.

Runtime changes must be made in source files, then rebuilt into `www/`.

Never hand-edit `www/`. Never manually copy Android-only runtime files. Never create GitHub.io-only gameplay fixes. Never create Android-only gameplay fixes.

Use this standard update flow:

```bash
npm run build:web
npm run check:runtime-parity
npm run android:sync
```

`npm run build:web` generates `www/`.

`npm run check:runtime-parity` validates the shared runtime.

`www/build-info.json` and `www/runtime-manifest.json` provide build evidence for the generated runtime.

If Android and GitHub.io behave differently, fix the shared source or WebView compatibility layer; do not fork the game.
