# Save Lifecycle

Tap Survivor uses one shared save API and one shared save schema across GitHub.io and Android. Platform-specific code may choose a different storage backend, but gameplay and progression must not fork by platform.

## Save Keys

- Current save key: `tap-survivor-mvp-save-v2`
- Legacy save key: `tap-survivor-mvp-save-v1`
- Corrupt-save backup key: `tap-survivor-mvp-save-v2-corrupt-backup`

## Schema Version

- Current save schema version: `3`
- Save objects use `saveVersion`.
- Version 2 migration ensures `shopPurchases`.
- Version 3 migration ensures `seenBanners`.

## Storage Backend Decision

All save reads, writes, resets, corrupt-save backups, and lifecycle flushes use the source-owned
`src/modules/storage-adapter.js` provider and `src/save.js`. `src/storage-adapter.js` is a generated global-free
artifact with retired `TapSurvivorStorage` provenance; native and generated dependency bags receive their own
source-created provider directly.

- GitHub.io/web backend: `localStorage`
- Android/Capacitor preferred backend: `Capacitor.Plugins.Preferences`
- Android native storage implementation: Capacitor Preferences, backed by platform SharedPreferences on Android
- Fallback path: `localStorage` if Capacitor Preferences is unavailable or throws

The save schema and save API stay the same on every platform.

## Save File Ownership

- `src/save.js` remains the public save API entry point.
- `src/save-defaults.js` owns default save object construction and schema version defaults.
- `src/save-migrations.js` owns save version migration behavior.
- `src/save-normalize.js` owns partial-save repair, coercion, clamping, and unknown field preservation.
- `src/save-corruption.js` owns corrupt JSON fallback and load-warning state.
- `src/modules/storage-adapter.js` owns browser and Capacitor storage backend access through explicit platform
  capability resolvers.
- `src/storage-adapter.js` is generated from that source module, records retired-global provenance, and publishes no
  storage namespace; do not edit it directly.

## Load And Migration

The canonical load path is:

1. Read raw save data from the storage adapter.
2. Parse JSON.
3. Migrate old save versions to version `3`.
4. Normalize the save object.
5. Return a valid save.

Missing save data returns a valid default save.

Partial or malformed save objects are normalized. Invalid arrays and objects are replaced with safe defaults. Numeric fields are clamped where the save system already clamps them.

Future or unknown top-level fields do not crash loading. Unknown fields are preserved while `saveVersion` normalizes back to the current schema version.

## Corrupt Save Handling

If JSON parsing fails:

- Startup does not crash.
- The bad raw value is copied to `tap-survivor-mvp-save-v2-corrupt-backup` where storage permits.
- A clean default save is returned.
- `saveSystem.getLastLoadWarning()` reports `corrupt-save`.

If storage itself throws during read:

- Startup does not crash.
- A clean default save is returned.
- `saveSystem.getLastLoadWarning()` reports `storage-read-failed`.

## Save Writes

Save writes are centralised through `persist()` in `src/game.js`, which calls `saveSystem.persist(save)`.

Current meaningful save triggers include:

- quest completion
- weapon unlock quest point spend
- meta upgrade quest point spend
- shop purchase
- run completion or exit
- boss clear / tower floor progression / relic reward completion
- relic equip and unequip
- tutorial/banner flag changes
- reset save
- lifecycle flush

The runtime does not write the save every animation frame.

## Lifecycle Flush Points

Browser-compatible lifecycle events:

- `visibilitychange` when the document becomes hidden
- `pagehide`
- `beforeunload`

Capacitor App lifecycle event:

- `appStateChange` when `isActive === false`

The Capacitor App bridge is optional at runtime. Browser and test runtimes without the plugin safely no-op.

## Manual Android Save Test

Use a local debug APK built from the shared `www/` runtime:

```bash
npm run android:debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Manual steps:

1. Launch the app.
2. Start a run.
3. Complete at least one progression-affecting action.
4. Exit the app fully.
5. Reopen the app and confirm progress remains.
6. Background the app for at least 30 seconds.
7. Reopen the app and confirm progress remains.
8. Force close the app.
9. Reopen the app and confirm progress remains.
10. Test reset save if the UI supports it.

## Known Limitations

- Saves are local only.
- No cloud saves.
- No login or account sync.
- No backend recovery.
- Corrupt save backup is best-effort and depends on storage availability.
- Manual Android persistence still needs a real-device test after the debug APK is installed.
