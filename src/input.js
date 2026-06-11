(() => {
function setTargetFromEvent({ event, canvas, game }) {
  if (!game || !game.running || game.paused) return;
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
  game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
}

function bindMovementInput({ canvas, getGame }) {
  function setTarget(event) {
    setTargetFromEvent({ event, canvas, game: getGame() });
  }

  canvas.addEventListener("mousedown", setTarget);
  canvas.addEventListener("mousemove", (event) => {
    if (event.buttons === 1) setTarget(event);
  });
  canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    setTarget(event);
  });
  canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    setTarget(event);
  });

  return { setTarget };
}

globalThis.TapSurvivorInput = {
  bindMovementInput,
};
})();
