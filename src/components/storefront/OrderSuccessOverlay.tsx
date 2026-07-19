// Full-screen celebration shown when a customer returns from a successful
// card payment (and reusable for any "order confirmed" moment). Confetti
// bursts, a springy checkmark, the order number, then a CTA into the orders
// list. Used by BOTH storefront themes.

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, PartyPopper } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-background/95 px-6 text-center backdrop-blur-sm"
      role="dialog"
      aria-label={title || "Payment successful"}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.55)]"
      >
        <Check className="h-12 w-12 text-white" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6 flex items-center gap-2 text-2xl font-bold tracking-tight"
      >
        <PartyPopper className="h-6 w-6 text-amber-500" /> {title || "Payment successful!"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-2 max-w-sm text-sm text-muted-foreground"
      >
        {subtitle || "Thank you for your purchase — your order is confirmed and the shop is on it."}
      </motion.p>

      {orderNumber && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-4 rounded-full border bg-card px-4 py-1.5 font-mono text-sm font-semibold"
        >
          Order #{orderNumber}
        </motion.p>
      )}

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={onContinue}
        className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {ctaLabel || "Show my orders"}
      </motion.button>
    </motion.div>
  );
};
