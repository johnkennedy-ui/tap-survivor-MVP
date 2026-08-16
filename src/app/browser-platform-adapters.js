import { bindMovementInput } from "../modules/input.js";

export function createBrowserPlatformAdapters({ canvas, globalRef, ui }) {
  let frameHandler = null;

  function loop(now) {
    frameHandler?.(now);
    globalRef.requestAnimationFrame?.(loop);
  }

  loop.attachFrameHandler = (handler) => {
    frameHandler = handler;
    return loop;
  };

  return {
    bannerSystem: createBrowserBannerSystem({ globalRef, ui }),
    bindMovementInput({ canvas: targetCanvas = canvas, getGame }) {
      return bindMovementInput({ canvas: targetCanvas, getGame });
    },
    canvas,
    debugSystem: {
      bind() {},
      render() {},
    },
    loop,
  };
}

function createBrowserBannerSystem({ globalRef, ui }) {
  let bannerTimer = 0;
  const clearTimer = () => globalRef.clearTimeout?.(bannerTimer);
  function showBanner(message, duration = 5200) {
    if (!ui.questBanner || !message) return;
    ui.questBanner.textContent = message;
    ui.questBanner.classList?.remove?.("hidden");
    clearTimer();
    if (duration > 0) {
      bannerTimer = globalRef.setTimeout?.(() => ui.questBanner.classList?.add?.("hidden"), duration) || 0;
    }
  }
  return {
    hideMovementGateBanner() {
      clearTimer();
      ui.questBanner?.classList?.add?.("hidden");
    },
    showBanner,
    showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    },
    showOnceBanner(_id, message, duration) {
      showBanner(message, duration);
      return true;
    },
    showQuestBanner(quest, reward) {
      showBanner(`${quest?.name || "Quest"} complete +${reward || 0} QP`);
    },
  };
}
