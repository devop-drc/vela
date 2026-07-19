/**
 * React Bits–style animation primitives (reactbits.dev), implemented locally
 * on top of GSAP so the landing page has no extra dependencies.
 * All components respect prefers-reduced-motion.
 */
import { useEffect, useId, useLayoutEffect, useRef, ReactNode, CSSProperties } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "./anim";

/* ── SplitText — per-character staggered rise-in ─────────────────────── */
export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.02,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".st-c",
        { opacity: 0, y: "0.55em", rotateX: -50 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: "power4.out", stagger, delay }
      );
    }, el);
    return () => ctx.revert();
  }, [text, delay, stagger]);

  const words = text.split(" ");
  return (
    <span ref={ref} className={cn("inline-block", className)} aria-label={text} style={{ perspective: 600 }}>
      {words.map((w, i) => (
        <span key={i} className="inline-block whitespace-nowrap" aria-hidden>
          {[...w].map((c, j) => (
            <span key={j} className="st-c inline-block will-change-transform">{c}</span>
          ))}
          {i < words.length - 1 ? <span className="st-c inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
}

/* ── BlurText — words blur + fade into place ─────────────────────────── */
export function BlurText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bt-w",
        { opacity: 0, y: 12, filter: "blur(8px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power3.out", stagger: 0.035, delay }
      );
    }, el);
    return () => ctx.revert();
  }, [text, delay]);

  return (
    <span ref={ref} className={cn("inline", className)} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="bt-w inline-block will-change-transform" aria-hidden>
          {w}&nbsp;
        </span>
      ))}
    </span>
  );
}

/* ── ShinyText — a light sweep across the text ───────────────────────── */
export function ShinyText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("shiny-text", className)}>{children}</span>;
}

/* ── SpotlightCard — radial glow that follows the cursor ─────────────── */
export function SpotlightCard({
  children,
  className,
  spotColor = "rgba(255, 46, 77, 0.14)",
}: {
  children: ReactNode;
  className?: string;
  spotColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn("spotlight-card", className)}
      style={{ "--spot": spotColor } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ── Tilted — 3D tilt toward the cursor ──────────────────────────────── */
export function Tilted({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * max);
      rx(-ny * max);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [max]);
  return (
    <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}

/* ── StarBorder — rotating gradient border wrapper for CTAs ──────────── */
export function StarBorder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("star-border", className)}>
      <span className="star-border-inner">{children}</span>
    </span>
  );
}

/* ── CircularText — rotating text-on-a-circle sticker ────────────────── */
export function CircularText({
  text,
  className,
  duration = 16,
  children,
}: {
  text: string;
  className?: string;
  duration?: number;
  children?: ReactNode; // centered content (e.g. an icon)
}) {
  const id = useId().replace(/[:]/g, "");
  return (
    <span className={cn("relative inline-block", className)} aria-hidden>
      <svg
        viewBox="0 0 100 100"
        className="ls-rotating h-full w-full"
        style={{ animationDuration: `${duration}s` }}
      >
        <defs>
          <path id={`circ-${id}`} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text className="fill-current" style={{ fontSize: 8, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
          <textPath href={`#circ-${id}`}>{text}</textPath>
        </text>
      </svg>
      {children && (
        <span className="absolute inset-0 grid place-items-center">{children}</span>
      )}
    </span>
  );
}

/* ── Particles — drifting glow dots on a canvas ──────────────────────── */
export function Particles({ className, count = 60, dark = true }: { className?: string; count?: number; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || prefersReducedMotion()) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; va: number; hue: number };
    const ps: P[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.14,
      a: 0.1 + Math.random() * 0.5,
      va: (Math.random() - 0.5) * 0.008,
      hue: Math.random() < 0.35 ? 300 : Math.random() < 0.5 ? 40 : 0, // fuchsia / amber / white
    }));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        if (p.a < 0.08 || p.a > 0.6) p.va *= -1;
        if (p.x < -4) p.x = w + 4; if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4; if (p.y > h + 4) p.y = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const alpha = dark ? p.a : p.a * 0.7;
        ctx.fillStyle =
          p.hue === 0
            ? (dark ? `rgba(255,255,255,${alpha})` : `rgba(71,60,105,${alpha})`)
            : p.hue === 300
              ? (dark ? `rgba(232,121,249,${alpha})` : `rgba(220,38,38,${alpha})`)
              : (dark ? `rgba(251,191,36,${alpha})` : `rgba(217,119,6,${alpha})`);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count, dark]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
