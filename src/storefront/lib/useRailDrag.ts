import { useEffect, RefObject } from 'react';

/**
 * Mouse drag-to-scroll for a horizontal rail. Touch/pen keep their native
 * momentum scroll (we only take over the mouse). A drag past a small threshold
 * suppresses the click that follows so dragging never triggers a child
 * link/button (e.g. opening a product while flicking the rail).
 */
export function useRailDrag(ref: RefObject<HTMLElement>, deps: any[] = []) {
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    let down = false, moved = false, startX = 0, startScroll = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return; // touch/pen use native scroll
      down = true; moved = false; startX = e.clientX; startScroll = rail.scrollLeft;
      rail.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false; rail.style.cursor = 'grab';
      if (moved) {
        const supp = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
        rail.addEventListener('click', supp, { capture: true, once: true });
        setTimeout(() => rail.removeEventListener('click', supp, true), 60);
      }
    };
    rail.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    rail.style.cursor = 'grab';
    return () => {
      rail.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
