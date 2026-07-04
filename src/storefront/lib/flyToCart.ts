// Fly-to-cart: a small thumb of the product arcs from the pressed button to
// the cart icon (any visible element marked data-sf-cart-target), then the
// icon pulses. Web Animations API, no dependencies; skipped entirely for
// reduced motion or when no cart icon is on screen.

export function flyToCart(from: HTMLElement, imageUrl?: string | null) {
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-sf-cart-target]'))
    .find((el) => el.offsetParent !== null || el.getClientRects().length > 0);
  if (!target || typeof from.animate !== 'function') return;

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = 36;
  const startX = a.left + a.width / 2 - size / 2;
  const startY = a.top + a.height / 2 - size / 2;
  const dx = b.left + b.width / 2 - (startX + size / 2);
  const dy = b.top + b.height / 2 - (startY + size / 2);

  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:${startX}px;top:${startY}px;width:${size}px;height:${size}px;border-radius:9999px;z-index:9999;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.28);background:hsl(var(--primary)) center/cover no-repeat;`;
  if (imageUrl) el.style.backgroundImage = `url("${imageUrl}")`;
  document.body.appendChild(el);

  const flight = el.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(.9)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25)`, opacity: 0.5 },
    ],
    { duration: 650, easing: 'cubic-bezier(.3,.7,.4,1)' }
  );
  flight.onfinish = () => {
    el.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' }
    );
  };
  // Safety net if onfinish never fires (tab hidden etc.).
  setTimeout(() => el.remove(), 1500);
}
