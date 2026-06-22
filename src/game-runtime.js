// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-runtime.js
// Run: npm run build:bridges
(() => {
  "use strict";

  function createGameRuntimeController({
    canvas,
    ui,
    documentRef,
    globalRef,
    getGame,
    setGame,
    getSave,
    setSave,
    saveSystem,
    shellUi,
    shopSystem,
    runUi,
    debugSystem,
    spriteSystem,
    bannerSystem,
    persist,
    renderMeta,
    loop,
  }) {
    let gameSpeed = 1;

    function getGameSpeed() {
      return gameSpeed;
    }

    function setGameSpeed(speed) {
      if (![1, 2, 5].includes(speed)) return;
      gameSpeed = speed;
      documentRef.body.dataset.gameSpeed = String(speed);
      ui.speedButtons.forEach((button) => {
        const active = Number(button.dataset.speed) === speed;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      runUi.updateRunHud();
    }

    function resetSave() {
      const resetAfterRemove = () => {
        setSave(saveSystem.defaultSave());
        setGame(null);
        runUi.hideEndScreen();
        ui.levelUp.classList.add("hidden");
        shopSystem.closeShop();
        shellUi.closeRunMenu(false);
        shellUi.showTitleScreen();
        persist();
        renderMeta();
      };
      const removed = saveSystem.removeSave();
      if (removed && typeof removed.then === "function") {
        void removed.then(resetAfterRemove);
      } else {
        resetAfterRemove();
      }
    }

    function startRuntime() {
      shellUi.bind();
      debugSystem.bind();
      setGameSpeed(1);
      bindLifecycleFlush();

      globalThis.TapSurvivorInput.bindMovementInput({
        canvas,
        getGame,
      });
      bindFirstMoveGate();

      spriteSystem.loadSprites();
      renderMeta();
      globalRef.requestAnimationFrame(loop);
    }

    function bindFirstMoveGate() {
      const clearGate = (event) => {
        const game = getGame();
        if (!game?.running || game.paused || !game.awaitingFirstMoveInput) return;
        const rect = canvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
        game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
        game.awaitingFirstMoveInput = false;
        bannerSystem.hideMovementGateBanner();
      };
      canvas.addEventListener("mousedown", clearGate);
      canvas.addEventListener("touchstart", clearGate);
    }

    function bindLifecycleFlush() {
      const flush = () => {
        void persist();
      };
      if (documentRef?.addEventListener) {
        documentRef.addEventListener("visibilitychange", () => {
          if (documentRef.visibilityState === "hidden") flush();
        });
      }
      globalRef.addEventListener?.("pagehide", flush);
      globalRef.addEventListener?.("beforeunload", flush);
      bindCapacitorAppLifecycle(flush);
    }

    function bindCapacitorAppLifecycle(flush) {
      const app = globalRef.Capacitor?.Plugins?.App;
      if (!app?.addListener) return;
      try {
        const listener = app.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) flush();
        });
        if (listener?.catch) listener.catch(() => {});
      } catch {
        // Browser and test runtimes may not expose Capacitor App events.
      }
    }

    function initializeRuntime() {
      const loaded = saveSystem.loadSave();
      if (loaded && typeof loaded.then === "function") {
        void loaded
          .then((loadedSave) => {
            setSave(loadedSave);
            startRuntime();
          })
          .catch(() => {
            setSave(saveSystem.defaultSave());
            startRuntime();
          });
        return;
      }
      setSave(loaded || getSave());
      startRuntime();
    }

    return {
      getGameSpeed,
      setGameSpeed,
      resetSave,
      initializeRuntime,
    };
  }

  globalThis.TapSurvivorGameRuntime = {
    createGameRuntimeController,
  };
})();
