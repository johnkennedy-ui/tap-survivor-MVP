export const PERFORMANCE_TRACE_QUERY = "perfTrace=1";

const EMPTY_RENDER_STRESS = Object.freeze({
  enemies: Object.freeze([]),
  profile: "off",
  projectiles: Object.freeze([]),
  syntheticEnemies: 0,
  syntheticProjectiles: 0,
});

const RENDER_STRESS_PROFILES = Object.freeze([
  Object.freeze({
    enemies: 0,
    id: "off",
    label: "Off",
    projectiles: 0,
  }),
  Object.freeze({
    enemies: 0,
    id: "projectiles",
    label: "Projectiles x750",
    projectiles: 750,
  }),
  Object.freeze({
    enemies: 500,
    id: "sprites",
    label: "Sprites x500",
    projectiles: 0,
  }),
  Object.freeze({
    enemies: 500,
    id: "both",
    label: "Both x1250",
    projectiles: 750,
  }),
]);

const STRESS_ENEMY_TYPES = Object.freeze(["skitter", "drifter", "bulwark", "hexer"]);
const STRESS_PROJECTILE_COLORS = Object.freeze(["#ffd166", "#8de7ff", "#ff74c8", "#78e08f"]);

const DEFAULT_LIMITS = Object.freeze({
  eventLimit: 40,
  frameLimit: 180,
  longTaskLimit: 40,
  worstFrameLimit: 16,
});

const CANVAS_COMMAND_LABEL =
  "Submitted Canvas 2D command counts from the instrumented renderer; these are not GPU time.";

/**
 * Returns true only for the explicit, opt-in diagnostic query flag.
 *
 * @param {any} [options]
 */
export function isPerformanceTraceEnabled(options = {}) {
  const search = options.globalRef?.location?.search;
  if (typeof search !== "string") return false;
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query.split("&").some((entry) => entry === PERFORMANCE_TRACE_QUERY);
}

/**
 * Creates an entirely local, manual-export diagnostic trace when `?perfTrace=1`
 * is present on the injected browser capability. The disabled path intentionally
 * returns before creating DOM, observers, listeners, or sample buffers.
 *
 * @param {any} [options]
 */
export function createBrowserPerformanceTrace(options = {}) {
  const { canvas, documentRef, globalRef } = options;
  if (!isPerformanceTraceEnabled({ globalRef })) return null;

  const limits = normalizeLimits(options.limits);
  const now = createClock(globalRef);
  const startedAtMs = now();
  const state = {
    activeFrame: null,
    canvasTotals: Object.create(null),
    frameGaps: [],
    frames: [],
    longTasks: [],
    pageErrors: [],
    visibilityChanges: [],
    lastFrameTimestamp: null,
    overlay: null,
    observer: null,
    removers: [],
    stressFixture: EMPTY_RENDER_STRESS,
    stressProfileIndex: 0,
  };

  const api = {
    beginFrame,
    dispose,
    endFrame,
    exportData,
    getRenderStress,
    measureRenderPass,
    measureStage,
    now,
    recordCanvasCommand,
  };

  state.overlay = createOverlay({
    documentRef,
    onCopy: copyExport,
    onDownload: downloadExport,
    onStressToggle: cycleRenderStress,
  });
  observePageSignals();
  updateOverlay();

  return api;

  function beginFrame(timestamp) {
    const atMs = finiteNumber(timestamp, now());
    const previousTimestamp = state.lastFrameTimestamp;
    const gapMs =
      previousTimestamp === null ? null : Math.max(0, atMs - previousTimestamp);
    state.lastFrameTimestamp = atMs;
    if (gapMs !== null) pushBounded(state.frameGaps, gapMs, limits.frameLimit);
    const frame = {
      atMs,
      canvasCommands: Object.create(null),
      gapMs,
      renderPassesMs: Object.create(null),
      stagesMs: {
        hud: 0,
        render: 0,
        update: 0,
      },
      startedAtMs: now(),
    };
    state.activeFrame = frame;
    return frame;
  }

  function measureStage(frame, name, work) {
    const startedAt = now();
    try {
      return work();
    } finally {
      frame.stagesMs[name] = elapsedMs(startedAt);
    }
  }

  function measureRenderPass(frame, name, work) {
    const startedAt = now();
    try {
      return work();
    } finally {
      frame.renderPassesMs[name] = elapsedMs(startedAt);
    }
  }

  function recordCanvasCommand(name) {
    const frame = state.activeFrame;
    if (!frame) return;
    const command = typeof name === "string" && name ? name : "unknown";
    frame.canvasCommands[command] = (frame.canvasCommands[command] || 0) + 1;
    state.canvasTotals[command] = (state.canvasTotals[command] || 0) + 1;
  }

  function endFrame(frame, { pressure = {} } = {}) {
    if (!frame || typeof frame !== "object") return null;
    const durationMs = elapsedMs(frame.startedAtMs);
    const snapshot = {
      atMs: frame.atMs,
      canvasSubmissionCommands: {
        methods: { ...frame.canvasCommands },
        total: sumCounts(frame.canvasCommands),
      },
      durationMs,
      gapMs: frame.gapMs,
      pressure: normalizePressure(pressure),
      renderPassesMs: { ...frame.renderPassesMs },
      stagesMs: { ...frame.stagesMs },
    };
    pushBounded(state.frames, snapshot, limits.frameLimit);
    if (state.activeFrame === frame) state.activeFrame = null;
    updateOverlay();
    return snapshot;
  }

  function exportData() {
    const frames = state.frames.map((frame) => ({ ...frame }));
    const gaps = state.frameGaps.slice();
    const worstFrames = frames
      .slice()
      .sort((left, right) => frameSeverity(right) - frameSeverity(left))
      .slice(0, limits.worstFrameLimit);
    return {
      canvas: {
        label: CANVAS_COMMAND_LABEL,
        totals: { ...state.canvasTotals },
      },
      exportedOnlyByManualAction: true,
      framePacing: {
        frameGapMs: distribution(gaps),
        recentFrames: frames,
        worstFrames,
      },
      limits: { ...limits },
      localOnly: true,
      longTasks: state.longTasks.map((entry) => ({ ...entry })),
      metadata: {
        canvas: {
          height: finiteNumber(canvas?.height, null),
          width: finiteNumber(canvas?.width, null),
        },
        diagnostic: "Tap Survivor device performance trace",
        enabledBy: PERFORMANCE_TRACE_QUERY,
        runtime: browserMetadata(globalRef),
        startedAtMs,
      },
      pageErrors: state.pageErrors.map((entry) => ({ ...entry })),
      schemaVersion: 1,
      stress: summarizeRenderStress(),
      visibilityChanges: state.visibilityChanges.map((entry) => ({ ...entry })),
    };
  }

  function getRenderStress() {
    return state.stressFixture;
  }

  function cycleRenderStress() {
    state.stressProfileIndex =
      (state.stressProfileIndex + 1) % RENDER_STRESS_PROFILES.length;
    state.stressFixture = createRenderStressFixture(selectedRenderStressProfile(), canvas);
    updateOverlay();
    return summarizeRenderStress();
  }

  function selectedRenderStressProfile() {
    return RENDER_STRESS_PROFILES[state.stressProfileIndex] || RENDER_STRESS_PROFILES[0];
  }

  function summarizeRenderStress() {
    const profile = selectedRenderStressProfile();
    const fixture = state.stressFixture;
    return {
      label: profile.label,
      profile: profile.id,
      synthetic: {
        enemies: fixture.syntheticEnemies,
        projectiles: fixture.syntheticProjectiles,
      },
    };
  }

  async function copyExport() {
    const payload = JSON.stringify(exportData(), null, 2);
    const writeText = globalRef?.navigator?.clipboard?.writeText;
    if (typeof writeText !== "function") {
      state.overlay?.setStatus("Copy is unavailable in this browser.");
      return false;
    }
    try {
      await writeText.call(globalRef.navigator.clipboard, payload);
      state.overlay?.setStatus("Trace copied locally.");
      return true;
    } catch {
      state.overlay?.setStatus("Copy was blocked by this browser.");
      return false;
    }
  }

  function downloadExport() {
    const BlobCtor = globalRef?.Blob;
    const urlApi = globalRef?.URL;
    const body = documentRef?.body || documentRef?.documentElement;
    if (
      typeof BlobCtor !== "function" ||
      typeof urlApi?.createObjectURL !== "function" ||
      !body?.appendChild ||
      typeof documentRef?.createElement !== "function"
    ) {
      state.overlay?.setStatus("Download is unavailable in this browser.");
      return false;
    }
    try {
      const blob = new BlobCtor([JSON.stringify(exportData(), null, 2)], {
        type: "application/json",
      });
      const objectUrl = urlApi.createObjectURL(blob);
      const anchor = documentRef.createElement("a");
      anchor.download = "tap-survivor-perf-trace.json";
      anchor.href = objectUrl;
      anchor.style?.setProperty?.("display", "none");
      body.appendChild(anchor);
      anchor.click?.();
      removeElement(anchor);
      urlApi.revokeObjectURL?.(objectUrl);
      state.overlay?.setStatus("Trace download created locally.");
      return true;
    } catch {
      state.overlay?.setStatus("Download could not be created.");
      return false;
    }
  }

  function observePageSignals() {
    addListener(globalRef, "error", (event) => {
      pushBounded(
        state.pageErrors,
        {
          atMs: now(),
          column: finiteNumber(event?.colno, null),
          line: finiteNumber(event?.lineno, null),
          message: boundedText(event?.message || event?.error?.message || "Page error"),
          source: boundedText(event?.filename || ""),
        },
        limits.eventLimit
      );
    });
    addListener(globalRef, "unhandledrejection", (event) => {
      pushBounded(
        state.pageErrors,
        {
          atMs: now(),
          message: boundedText(event?.reason?.message || event?.reason || "Unhandled rejection"),
          type: "unhandledrejection",
        },
        limits.eventLimit
      );
    });
    addListener(documentRef, "visibilitychange", () => {
      pushBounded(
        state.visibilityChanges,
        {
          atMs: now(),
          state: boundedText(documentRef?.visibilityState || "unknown", 32),
        },
        limits.eventLimit
      );
    });

    const PerformanceObserverCtor = globalRef?.PerformanceObserver;
    if (typeof PerformanceObserverCtor !== "function") return;
    try {
      state.observer = new PerformanceObserverCtor((entryList) => {
        const entries = entryList?.getEntries?.() || [];
        entries.forEach((entry) => {
          pushBounded(
            state.longTasks,
            {
              atMs: finiteNumber(entry?.startTime, now()),
              durationMs: Math.max(0, finiteNumber(entry?.duration, 0)),
              name: boundedText(entry?.name || "longtask", 64),
            },
            limits.longTaskLimit
          );
        });
      });
      try {
        state.observer.observe({ entryTypes: ["longtask"] });
      } catch {
        state.observer.observe({ buffered: true, type: "longtask" });
      }
    } catch {
      state.observer?.disconnect?.();
      state.observer = null;
    }
  }

  function addListener(target, name, listener) {
    if (typeof target?.addEventListener !== "function") return;
    target.addEventListener(name, listener);
    state.removers.push(() => target.removeEventListener?.(name, listener));
  }

  function updateOverlay() {
    const stress = summarizeRenderStress();
    state.overlay?.setStressProfile(stress);
    const latest = state.frames[state.frames.length - 1];
    if (!latest) {
      state.overlay?.setSummary("Waiting for animation frames…");
      return;
    }
    const gap = latest.gapMs === null ? "first frame" : `${latest.gapMs.toFixed(1)} ms gap`;
    const summary = [
      `${gap} • update ${latest.stagesMs.update.toFixed(1)} ms`,
      `render ${latest.stagesMs.render.toFixed(1)} ms`,
      `HUD ${latest.stagesMs.hud.toFixed(1)} ms`,
      stress.label,
      `bolts ${latest.pressure.projectiles} + ${latest.pressure.syntheticProjectiles}`,
      `sprites ${latest.pressure.enemies} + ${latest.pressure.syntheticEnemies}`,
    ].join(" • ");
    state.overlay?.setSummary(
      summary
    );
  }

  function dispose() {
    state.removers.splice(0).forEach((remove) => remove());
    state.observer?.disconnect?.();
    state.observer = null;
    state.overlay?.dispose?.();
    state.overlay = null;
  }

  function elapsedMs(startedAt) {
    return Math.max(0, now() - finiteNumber(startedAt, now()));
  }
}

function createClock(globalRef) {
  return () => Math.max(0, finiteNumber(globalRef?.performance?.now?.(), 0));
}

function createOverlay({ documentRef, onCopy, onDownload, onStressToggle }) {
  const host = documentRef?.body || documentRef?.documentElement;
  if (!host?.appendChild || typeof documentRef?.createElement !== "function") return null;
  const root = documentRef.createElement("section");
  const title = documentRef.createElement("strong");
  const detail = documentRef.createElement("div");
  const summary = documentRef.createElement("div");
  const actions = documentRef.createElement("div");
  const copy = documentRef.createElement("button");
  const download = documentRef.createElement("button");
  const stress = documentRef.createElement("button");
  const status = documentRef.createElement("div");

  root.setAttribute?.("aria-label", "Tap Survivor performance trace");
  root.setAttribute?.("data-perf-trace", "1");
  applyStyles(root, {
    background: "rgba(8, 15, 27, 0.94)",
    border: "1px solid rgba(126, 231, 255, 0.72)",
    borderRadius: "10px",
    bottom: "8px",
    boxShadow: "0 5px 24px rgba(0, 0, 0, 0.42)",
    color: "#effaff",
    font: "12px/1.35 system-ui, sans-serif",
    left: "8px",
    maxWidth: "min(360px, calc(100vw - 16px))",
    padding: "10px",
    position: "fixed",
    touchAction: "manipulation",
    zIndex: "2147483647",
  });
  title.textContent = "Performance trace — diagnostic only";
  detail.textContent =
    "Local, bounded capture. Synthetic render pressure is not gameplay; Canvas values are not GPU time.";
  summary.textContent = "Waiting for animation frames…";
  copy.dataset ||= {};
  download.dataset ||= {};
  stress.dataset ||= {};
  copy.dataset.perfTraceAction = "copy";
  download.dataset.perfTraceAction = "download";
  stress.dataset.perfTraceAction = "stress";
  copy.textContent = "Copy JSON";
  download.textContent = "Download JSON";
  stress.textContent = "Render stress: Off";
  stress.setAttribute?.("aria-label", "Cycle synthetic render stress. Current profile: Off.");
  stress.setAttribute?.("aria-pressed", "false");
  status.setAttribute?.("aria-live", "polite");
  applyStyles(detail, { color: "#bdd7e8", marginTop: "4px" });
  applyStyles(summary, { color: "#8ef0c0", marginTop: "6px" });
  applyStyles(actions, { display: "flex", gap: "8px", marginTop: "8px" });
  [copy, download, stress].forEach((button) => {
    button.type = "button";
    applyStyles(button, {
      background: "#1f5f86",
      border: "1px solid #93dbff",
      borderRadius: "6px",
      color: "#ffffff",
      font: "600 13px system-ui, sans-serif",
      minHeight: "36px",
      padding: "6px 10px",
    });
  });
  applyStyles(stress, { marginTop: "8px", width: "100%" });
  applyStyles(status, { color: "#cbd8e5", marginTop: "6px", minHeight: "16px" });
  copy.addEventListener?.("click", () => {
    void onCopy();
  });
  download.addEventListener?.("click", () => {
    onDownload();
  });
  stress.addEventListener?.("click", () => {
    onStressToggle();
  });
  actions.appendChild(copy);
  actions.appendChild(download);
  root.appendChild(title);
  root.appendChild(detail);
  root.appendChild(summary);
  root.appendChild(stress);
  root.appendChild(actions);
  root.appendChild(status);
  host.appendChild(root);

  return {
    dispose: () => removeElement(root),
    setStatus: (message) => {
      status.textContent = message;
    },
    setStressProfile: (profile) => {
      const synthetic = profile?.synthetic || {};
      const projectiles = Math.max(0, finiteNumber(synthetic.projectiles, 0));
      const enemies = Math.max(0, finiteNumber(synthetic.enemies, 0));
      const label = boundedText(profile?.label || "Off", 64);
      stress.textContent = `Render stress: ${label}`;
      stress.setAttribute?.(
        "aria-label",
        `Cycle synthetic render stress. Current profile: ${label}; ${projectiles} projectiles and ${enemies} enemy sprites.`
      );
      stress.setAttribute?.("aria-pressed", profile?.profile === "off" ? "false" : "true");
    },
    setSummary: (message) => {
      summary.textContent = message;
    },
  };
}

function applyStyles(element, values) {
  if (!element?.style) return;
  Object.entries(values).forEach(([name, value]) => {
    if (typeof element.style.setProperty === "function") {
      element.style.setProperty(cssPropertyName(name), value);
      return;
    }
    element.style[name] = value;
  });
}

function cssPropertyName(name) {
  return String(name).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function removeElement(element) {
  if (typeof element?.remove === "function") {
    element.remove();
    return;
  }
  element?.parentElement?.removeChild?.(element);
}

function normalizeLimits(limits = {}) {
  return {
    eventLimit: positiveInteger(limits.eventLimit, DEFAULT_LIMITS.eventLimit),
    frameLimit: positiveInteger(limits.frameLimit, DEFAULT_LIMITS.frameLimit),
    longTaskLimit: positiveInteger(limits.longTaskLimit, DEFAULT_LIMITS.longTaskLimit),
    worstFrameLimit: positiveInteger(limits.worstFrameLimit, DEFAULT_LIMITS.worstFrameLimit),
  };
}

function normalizePressure(pressure) {
  const enemies = Math.max(0, finiteNumber(pressure.enemies, 0));
  const projectiles = Math.max(0, finiteNumber(pressure.projectiles, 0));
  const syntheticEnemies = Math.max(0, finiteNumber(pressure.syntheticEnemies, 0));
  const syntheticProjectiles = Math.max(0, finiteNumber(pressure.syntheticProjectiles, 0));
  return {
    effects: Math.max(0, finiteNumber(pressure.effects, 0)),
    enemies,
    pickups: Math.max(0, finiteNumber(pressure.pickups, 0)),
    projectiles,
    syntheticEnemies,
    syntheticProjectiles,
    totalEnemies: enemies + syntheticEnemies,
    totalProjectiles: projectiles + syntheticProjectiles,
  };
}

function createRenderStressFixture(profile, canvas) {
  if (!profile || profile.id === "off") return EMPTY_RENDER_STRESS;
  const width = Math.max(1, finiteNumber(canvas?.width, 320));
  const height = Math.max(1, finiteNumber(canvas?.height, 180));
  const projectiles = createStressProjectiles(profile.projectiles, width, height);
  const enemies = createStressEnemies(profile.enemies, width, height);
  return Object.freeze({
    enemies,
    profile: profile.id,
    projectiles,
    syntheticEnemies: enemies.length,
    syntheticProjectiles: projectiles.length,
  });
}

function createStressProjectiles(count, width, height) {
  const total = Math.max(0, Math.floor(finiteNumber(count, 0)));
  if (!total) return EMPTY_RENDER_STRESS.projectiles;
  const columns = Math.max(1, Math.ceil(Math.sqrt((total * width) / height)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const projectiles = [];
  for (let index = 0; index < total; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const angle = ((index % 16) / 16) * Math.PI * 2;
    projectiles.push(
      Object.freeze({
        color: STRESS_PROJECTILE_COLORS[index % STRESS_PROJECTILE_COLORS.length],
        radius: 3 + (index % 3),
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        weaponId: "spark_bolt",
        x: ((column + 0.5) / columns) * width,
        y: ((row + 0.5) / rows) * height,
      })
    );
  }
  return Object.freeze(projectiles);
}

function createStressEnemies(count, width, height) {
  const total = Math.max(0, Math.floor(finiteNumber(count, 0)));
  if (!total) return EMPTY_RENDER_STRESS.enemies;
  const columns = Math.max(1, Math.ceil(Math.sqrt((total * width) / height)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const enemies = [];
  for (let index = 0; index < total; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const type = STRESS_ENEMY_TYPES[index % STRESS_ENEMY_TYPES.length];
    enemies.push(
      Object.freeze({
        hp: 1,
        maxHp: 1,
        radius: 9 + (index % 4),
        towerFloor: 1 + (index % 25),
        type,
        vx: index % 2 === 0 ? 1 : -1,
        x: ((column + 0.5) / columns) * width,
        y: ((row + 0.5) / rows) * height,
      })
    );
  }
  return Object.freeze(enemies);
}

function browserMetadata(globalRef) {
  const navigatorRef = globalRef?.navigator || {};
  return {
    deviceMemoryGb: finiteNumber(navigatorRef.deviceMemory, null),
    devicePixelRatio: finiteNumber(globalRef?.devicePixelRatio, null),
    hardwareConcurrency: finiteNumber(navigatorRef.hardwareConcurrency, null),
    platform: boundedText(navigatorRef.platform || "", 120),
    userAgent: boundedText(navigatorRef.userAgent || "", 320),
  };
}

function distribution(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  return {
    count: sorted.length,
    maxMs: sorted.length ? sorted[sorted.length - 1] : 0,
    over16_7Ms: sorted.filter((value) => value > 16.7).length,
    over33_3Ms: sorted.filter((value) => value > 33.3).length,
    over50Ms: sorted.filter((value) => value > 50).length,
    p50Ms: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
  };
}

function quantile(sorted, percentile) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));
  return sorted[index];
}

function frameSeverity(frame) {
  return Math.max(
    finiteNumber(frame?.gapMs, 0),
    finiteNumber(frame?.durationMs, 0),
    finiteNumber(frame?.stagesMs?.render, 0)
  );
}

function sumCounts(counts) {
  return Object.values(counts || {}).reduce((sum, count) => sum + finiteNumber(count, 0), 0);
}

function pushBounded(target, value, limit) {
  target.push(value);
  if (target.length > limit) target.splice(0, target.length - limit);
}

function positiveInteger(value, fallback) {
  const number = Math.floor(finiteNumber(value, fallback));
  return number > 0 ? number : fallback;
}

function finiteNumber(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedText(value, maxLength = 240) {
  return String(value || "").slice(0, maxLength);
}
