// Full-screen celebration shown when a customer returns from a successful
// card payment (and reusable for any "order confirmed" moment). Confetti
// bursts, a springy checkmark, the order number, then a CTA into the orders
// list. Used by BOTH storefront themes.

import { useEffect, useRef } from "react";
import { Reveal } from "@/lib/anim";
import confetti from "canvas-confetti";
import { Check, PartyPopper } from "lucide-react";
import { useSfT } from "@/storefront/lib/visitorPrefs";

interface Props {
  orderNumber?: string | null;
  /** "Show my orders" — dismisses the overlay and reveals the orders list. */
  onContinue: () => void;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
}

export const OrderSuccessOverlay = ({ orderNumber, onContinue, title, subtitle, ctaLabel }: Props) => {
  const fired = useRef(false);
  const { t } = useSfT();

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Two side cannons + a center burst, staggered — short and celebratory.
    // was (Instagram-era): ["#FD1D1D", "#D62976", "#962FBF", "#4F5BD5", "#FEDA75", "#34d399"]
    const defaults = { zIndex: 220, disableForReducedMotion: true, colors: ["#FF2E4D", "#A31234", "#F59E0B", "#FACC15", "#7F1D3B", "#34d399"] };
    confetti({ ...defaults, particleCount: 90, spread: 75, origin: { x: 0.5, y: 0.45 } });
    const t1 = setTimeout(() => confetti({ ...defaults, particleCount: 45, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } }), 250);
    const t2 = setTimeout(() => confetti({ ...defaults, particleCount: 45, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } }), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <Reveal from="fade"
      className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-background/95 px-6 text-center backdrop-blur-sm"
      role="dialog"
      aria-label={title || t('paymentSuccess')}
    >
      <Reveal from="scale"
        className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.55)]"
      >
        <Check className="h-12 w-12 text-white" strokeWidth={3} />
      </Reveal>

      <Reveal as="h1" from="up"
        className="mt-6 flex items-center gap-2 text-2xl font-bold tracking-tight"
      >
        <PartyPopper className="h-6 w-6 text-amber-500" /> {title || t('paymentSuccess')}
      </Reveal>

      <Reveal as="p" from="up"
        className="mt-2 max-w-sm text-sm text-muted-foreground"
      >
        {subtitle || t('paymentSuccessSub')}
      </Reveal>

      {orderNumber && (
        <Reveal as="p" from="fade"
          className="mt-4 rounded-full border bg-card px-4 py-1.5 font-mono text-sm font-semibold"
        >
          {t('order')} #{orderNumber}
        </Reveal>
      )}

      <Reveal as="button" from="up"
        onClick={onContinue}
        className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {ctaLabel || t('showMyOrders')}
      </Reveal>
    </Reveal>
  );
};
