# Security hardening and release boundary

## Threat model and application boundaries

The browser game and Capacitor wrapper are offline-first, with no account, analytics, advertising,
cloud-save, or application backend. The main risks are compromised dependencies or Actions obtaining
deployment/repository authority, accidental credential publication, executable DOM content,
malformed local saves, and unintended WebView navigation.

Pages build/test execution has `contents: read`, non-persistent checkout credentials, and no
deployment authority. Only the downstream artifact-only job receives `pages: write` and
`id-token: write`; it requires successful build completion on `main` and never checks out source,
installs dependencies, executes package scripts, or pushes a branch. Failure cannot be converted
into deployment through `always()` or a force-pushed `gh-pages` branch.

The [browser policy](BROWSER-SECURITY.md) permits same-origin resources, forbids dynamic/remote
executable code, and uses DOM/textContent for UI data. Its narrow inline-style allowance preserves
existing runtime CSS custom properties; script execution receives no inline allowance. Meta CSP on
GitHub Pages cannot provide all response-header-only protections. Application code has no reviewed
external runtime network destinations.

The [Android policy](ANDROID-SECURITY.md) preserves backup/save compatibility and the existing
INTERNET permission, disables cleartext navigation, and verifies Gradle integrity. The
[save lifecycle](SAVE_LIFECYCLE.md) retains the public schema and storage keys, with bounded
hostile-data and completed-bootstrap regression coverage. Neither local storage nor the save file is
a credential vault.

Dependency changes must retain the lockfile and deterministic installation, pass
vulnerability/dependency review, and justify any new runtime dependency. Never apply
`npm audit fix --force` automatically; assess reachability and compatibility before upgrading.

## Enforced GitHub workflows

`CI` is the canonical pull-request and default-branch validation gate. It installs the locked
dependency graph, runs the existing validation suite including mandatory
`npm run agent:check -- --full`, builds the shared browser runtime, checks Android/browser parity,
runs the strict built-browser smoke, and builds an unsigned Android debug APK with Node 22 and
JDK 21. `Agent Check` remains a manual diagnostic workflow; it is not the sole required gate.

Linux validation jobs use `npm ci --ignore-scripts`. The implementation verification record covers a
lifecycle-free install followed by separate successful `agent:check --full`, `build:web`,
runtime-parity, and unsigned Android-debug commands. The lockfile's only install lifecycle entry is
optional `fsevents`, which applies only to Darwin; no Linux-required lifecycle script is bypassed.
Each CI command remains an individual workflow step so its exit status is independently enforced.

`Security` runs on pull requests, the default branch, and weekly. It performs both current-tree and
complete-history Gitleaks scans with output redaction. It downloads Gitleaks 8.30.1 and OSV-Scanner
2.6.0 directly from their release URLs, verifies the supplied SHA-256 before execution, and never
pipes a network response into a shell. The OSV GitHub Action is intentionally not used because its
Docker subaction can resolve a mutable image tag.

`CodeQL` analyzes JavaScript/TypeScript with the `security-extended` query suite on pull requests,
default-branch pushes, and weekly. It receives only `contents: read` and the required
`security-events: write`; it has no repository-content write permission.

`OpenSSF Scorecard` is reporting-only: it has no score threshold, publishes no artifacts, and
uploads its SARIF report using only `security-events: write`.

Workflow action references are full commit SHAs; adjacent version comments identify their reviewed
releases. Update the commit and version together only after checking the upstream reference.

## Local verification

Run each command separately so its actual exit status is enforced:

```sh
npm ci --ignore-scripts
npm run agent:check -- --full
npm test
npm run build:web
npm run check:runtime-parity
npm run android:debug
```

The canonical gate includes the browser/Android/build security guards and their negative controls,
save resilience, and metadata/wrapper regression checks. With the reviewed audit tools available,
also run `npm audit --audit-level=high`, the current-tree and full-history redacted Gitleaks scans,
OSV against `package-lock.json`, actionlint, and offline zizmor using the exact commands and
versions in `.github/workflows/security.yml`. Real Chromium QA must cover built-site startup,
save/load, assets/audio, and unexpected console/CSP/network diagnostics; static checks alone do not
prove those outcomes.

## Sensitive material and build output

Git ignores `.env`, `.env.*`, `*.env`, `*.key`, private-key and keystore formats, key properties,
and common service-account files. The web build independently rejects environment, key, secret,
credential, service-account, and keystore-looking file names, so ignored sensitive material cannot
silently enter `www/`.

## Release metadata without signing

`scripts/release-metadata.mjs` creates a local CycloneDX SBOM using
`npm sbom --sbom-format cyclonedx --package-lock-only`, plus a SHA-256 checksum manifest for
explicitly selected existing artifacts. This is an npm/package-lock-only inventory: it excludes
native Android components and build attestations. It records the exact local commit and rejects
artifact or output paths that resolve outside the repository, including external symlinks.
`scripts/smoke-release-metadata.mjs` exercises checksum bytes, scoped package PURLs, the dependency
graph, and outside-repository path rejection using temporary synthetic fixtures.

The helper does not sign, publish, upload, attest, or create a release. Those operations require a
future protected-release boundary with a reviewed tag policy, least-privilege environment, isolated
signing credentials, provenance/attestation policy, and explicit release authorization. Automatic
signing is deferred because this repository has no signing key or protected release authority in
scope.

## Verification limits

Repository settings remain a separate owner-controlled step after the new checks exist and pass.
Pages must use GitHub Actions and the `github-pages` environment must admit the intended `main`
deployment. Require pull requests and the verified CI/security check contexts, block force pushes
and branch deletion, and preserve single-maintainer recovery with zero required external approvals.
`CODEOWNERS` alone is not an enforced security boundary; do not require unavailable reviewers or
self-approval.

Local workflow linting and helper tests establish source validity only. Remote activation (scheduled
triggers, GitHub permissions, CodeQL/Scorecard uploads, and hosted Android/browser runners) remains
unverified until GitHub executes the workflows.
