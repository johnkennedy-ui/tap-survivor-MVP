(() => {
function createGameBannerSystem({ ui, getSave, persist }) {
  let bannerTimer = 0;

  function hasSeenBanner(id) {
    return getSave().seenBanners?.includes(id);
  }

  function markBannerSeen(id) {
    const save = getSave();
    save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
    persist();
  }

  function showBanner(message, duration = 5200) {
    if (!ui.questBanner || !message) return;
    ui.questBanner.textContent = message;
    ui.questBanner.classList.remove("hidden");
    clearTimeout(bannerTimer);
    if (duration > 0) {
      bannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), duration);
    }
  }

  function showMovementGateBanner() {
    showBanner("Click/tap to move", 0);
  }

  function hideMovementGateBanner() {
    if (!ui.questBanner || ui.questBanner.textContent !== "Click/tap to move") return;
    clearTimeout(bannerTimer);
    ui.questBanner.classList.add("hidden");
  }

  function showOnceBanner(id, message, duration) {
    if (hasSeenBanner(id)) return false;
    markBannerSeen(id);
    showBanner(message, duration);
    return true;
  }

  function showQuestBanner(quest, reward) {
    if (!quest) return;
    const firstQuest = !hasSeenBanner("first_quest_completion");
    if (firstQuest) {
      markBannerSeen("first_quest_completion");
    }
    showBanner(
      firstQuest
        ? `${quest.name} complete +${reward} QP. Open Menu > Rewards to spend Quest Points and review quests.`
        : `${quest.name} complete +${reward} QP`,
    );
  }

  return {
    hideMovementGateBanner,
    showBanner,
    showMovementGateBanner,
    showOnceBanner,
    showQuestBanner,
  };
}

globalThis.TapSurvivorGameBanners = {
  createGameBannerSystem,
};
})();
