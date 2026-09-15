export function setTargetFromEvent({ event, canvas, game, worldView }) {
  if (!game || !game.running || game.paused || !game.player) return false;
  const point = event?.touches ? event.touches[0] : event;

  try {
    let target;
    if (worldView) {
      target = worldView.targetFromEvent(event, game);
    } else {
      // Deliberate legacy/Farm seam for standalone injected factories.
      // A Climb run must never silently receive screen-space coordinates.
      if (game.world && game.world.modeId !== "farm") return false;
      const rect = canvas.getBoundingClientRect();
      if (
        ![
          point?.clientX,
          point?.clientY,
          rect.left,
          rect.top,
          rect.width,
          rect.height,
          canvas.width,
          canvas.height,
        ].every(Number.isFinite) ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        canvas.width <= 0 ||
        canvas.height <= 0
      )
        return false;
      target = {
        x: ((point.clientX - rect.left) / rect.width) * canvas.width,
        y: ((point.clientY - rect.top) / rect.height) * canvas.height,
      };
    }
    if (!Number.isFinite(target?.x) || !Number.isFinite(target?.y)) return false;
    game.player.targetX = target.x;
    game.player.targetY = target.y;
    return true;
  } catch {
    // Invalid touch/rect geometry must leave the current target and gate intact.
    return false;
  }
}

export function bindMovementInput({ canvas, getGame, worldView, onTarget }) {
  function setTarget(event) {
    const converted = setTargetFromEvent({ event, canvas, game: getGame?.(), worldView });
    if (converted) onTarget?.();
    return converted;
  }

  canvas.addEventListener?.("mousedown", setTarget);
  canvas.addEventListener?.("mousemove", (event) => {
    if (event.buttons === 1) setTarget(event);
  });
  canvas.addEventListener?.("touchstart", (event) => {
    event.preventDefault?.();
    setTarget(event);
  });
  canvas.addEventListener?.("touchmove", (event) => {
    event.preventDefault?.();
    setTarget(event);
  });

  return { setTarget };
}
