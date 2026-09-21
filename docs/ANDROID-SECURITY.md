# Android security posture

## Scope and threat model

Tap Survivor is an offline Capacitor shell (`com.tap.survivor`) serving the shared
`www/` runtime from a WebView. It has no ads, analytics, login, cloud save,
Firebase, billing, or backend service in this repository. The native boundary is
therefore limited to the launcher, WebView runtime, local save integration, and
the Capacitor plugins declared in `android/app/capacitor.build.gradle`.

The main manifest explicitly disables cleartext traffic. Capacitor uses the
`https` Android scheme and has no `server.url` or `allowNavigation` setting, so
the checked-in configuration does not permit arbitrary remote origins.

The only exported component is `MainActivity`, which is the required launcher.
The AndroidX `FileProvider` is non-exported. The only declared permission is
`android.permission.INTERNET`; it is retained pending an Android device or
emulator test because Capacitor WebView and development compatibility paths may
need it. It is a normal (non-dangerous) permission and does not itself add a
network destination.

`android:allowBackup="true"` is deliberately retained. The game save is not
known to contain credentials or PII, and changing backup or data-extraction
behaviour without device evidence could harm player recovery. No backup-policy
change is authorized by this hardening slice.

## Static regression check

Run the checked-in guard from the repository root:

```sh
node scripts/check-android-security.mjs
node scripts/smoke-android-security.mjs
```

It checks the checked-in manifest/configuration for the launcher export,
non-exported FileProvider, explicit cleartext denial, retained backup policy,
only the reviewed `INTERNET` permission, HTTPS Capacitor scheme, no remote
navigation configuration, no checked-in debug flag, reviewed Gradle wrapper
version and integrity, reviewed plugins, and sensitive tracked file names. Safe
`.env.example` templates remain allowed but their contents are still scanned by
Gitleaks. Mutation controls prove the guard rejects unsafe configuration changes.
It is intentionally static: merged
dependency manifests and APK contents require a debug build.

## Build prerequisites and residual verification

Source currently requires Node 22 for this task's locked tooling, JDK 21
(`android/app/capacitor.build.gradle`), Android SDK platform 35
(`android/variables.gradle`), Android Gradle Plugin 8.13.0
(`android/build.gradle` and Capacitor Android 8.4.0), and the repository Gradle
8.14.3 wrapper. The distribution checksum is pinned to the official
`https://services.gradle.org/distributions/gradle-8.14.3-all.zip.sha256` value;
the checked-in wrapper JAR matches
`https://services.gradle.org/distributions/gradle-8.14.3-wrapper.jar.sha256`.

Root integration should run the non-signing debug build with those prerequisites,
then inspect the merged manifest/APK and test on an Android device or emulator:

1. packaged runtime boots with `INTERNET` retained;
2. no cleartext or remote navigation path is introduced by dependencies;
3. save/load and backup behaviour remain compatible; and
4. declared Capacitor plugins (`@capacitor/app`, `@capacitor/preferences`) have
   only their required merged permissions/components.

No signing configuration, key material, release pipeline, network service, or
runtime/gameplay behaviour is changed by this slice.
