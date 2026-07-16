import { useRef, useEffect } from 'react';

/**
 * Mouse drag-to-scroll for a horizontal rail that never steals clicks.
 *
 * The gesture is only "armed" on pointerdown — scrolling (and pointer capture)
 * starts once movement crosses a small threshold, so a plain press-release is
 * a normal click on the card underneath. After a real drag, the click that
 * would fire on release is suppressed so flicking the rail never opens a
 * product. Touch/pen keep their native momentum scroll.
 */
export const useDragToScroll = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const THRESHOLD = 5; // px of movement before a press becomes a drag
    let armed = false;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = -1;
    let scroller: HTMLElement = el;

    // The ref often sits on the rail CONTENT (e.g. inside a Radix ScrollArea,
    // whose viewport is the actual overflow element) — resolve the nearest
    // horizontally scrollable ancestor at gesture start, when layout is real.
    const resolveScroller = (): HTMLElement => {
      let n: HTMLElement | null = el;
      while (n) {
        if (n.scrollWidth > n.clientWidth + 1) {
          const s = getComputedStyle(n);
          if (/(auto|scroll|hidden)/.test(s.overflowX)) return n;
        }
        n = n.parentElement;
      }
      return el;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      armed = true;
      dragging = false;
      startX = e.clientX;
      scroller = resolveScroller();
      startScroll = scroller.scrollLeft;
      pointerId = e.pointerId;
      // No capture / preventDefault here — a click must stay a click.
    };

    const onMove = (e: PointerEvent) => {
      if (!armed) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) <= THRESHOLD) return;
        dragging = true;
        try { el.setPointerCapture(pointerId); } catch { /* older browsers */ }
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }
      scroller.scrollLeft = startScroll - dx;
    };

    const endDrag = (e: PointerEvent) => {
      if (!armed) return;
      armed = false;
      if (dragging) {
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
        el.style.cursor = 'grab';
        el.style.userSelect = '';
        // A real drag happened — swallow the click it would otherwise fire.
        const supp = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', supp, { capture: true, once: true });
        setTimeout(() => el.removeEventListener('click', supp, true), 40);
      }
    };

    const onDragStart = (e: Event) => { if (dragging) e.preventDefault(); };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('dragstart', onDragStart);
    el.style.cursor = 'grab';

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  return ref;
};
