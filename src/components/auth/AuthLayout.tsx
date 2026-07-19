/**
 * Split-screen auth shell shared by Login/Register: form on the left,
 * brand story panel on the right — animated signature gradient, floating
 * story cards, and the landing's typography (Clash Display + Satoshi).
 * Carries the landing's light/dark theme (same `.landing-dark` token
 * overrides + `landing-theme` storage key) and its language/theme toggles.
 */
import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Instagram, Bell, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/anim";
// The `.landing` / `.landing-dark` token overrides live here — without this
// import, visiting /login directly (before the landing route loads) would
// leave the dark theme without any CSS to apply.
import "@/components/landing/landing.css";

const BRAND = "brand-gradient";
const THEME_KEY = "landing-theme"; // shared with Landing.tsx

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** bullets shown on the brand panel */
  points: string[];
  lang: "sq" | "en";
}

export default function AuthLayout({ title, subtitle, children, points, lang }: Props) {
  const pointsRef = useReveal<HTMLUListElement>({ y: 8, delay: 0.1 }, [points.length]);
  const { i18n } = useTranslation();
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; }
  });
  const toggleTheme = () =>
    setDark((d) => {
      try { localStorage.setItem(THEME_KEY, !d ? "dark" : "light"); } catch { /* private mode */ }
      return !d;
    });

  return (
    // `.landing` + `.landing-dark` reuse the landing page's token overrides so
    // both pages share one theme, toggled and persisted with the same key.
    <div className={cn("landing font-sans-brand grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1.05fr]", dark && "landing-dark")}>
      {/* ── Form column ── */}
      <div className="relative flex flex-col px-6 py-7 sm:px-12">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {lang === "sq" ? "Kthehu" : "Back"}
            </Link>
            <div className="flex items-center gap-2">
              {/* language switch — same pill as the landing nav */}
              <div className="flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium">
                {(["sq", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => i18n.changeLanguage(l)}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase transition-colors",
                      lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                onClick={toggleTheme}
                aria-label={dark ? "Light mode" : "Dark mode"}
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/" className="flex items-center gap-2 pl-1">
                <img src="/vela-icon.svg" alt="Vela" className="h-8 w-8 rounded-[10px] shadow-md shadow-red-500/25 ring-1 ring-inset ring-border" />
                <span className="font-display-brand hidden text-[17px] font-semibold sm:inline">Vela</span>
              </Link>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="font-display-brand text-[2.1rem] font-semibold leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-2.5 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Vela · {lang === "sq" ? "Pagesa të sigurta me Raiffeisen (RaiAccept)" : "Secure payments by Raiffeisen (RaiAccept)"}
          </p>
        </div>
      </div>

      {/* ── Brand panel ── */}
      <div className={cn("relative hidden overflow-hidden lg:block", BRAND)}>
        <div className="ls-aurora absolute -left-16 -top-16 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="ls-aurora absolute -bottom-24 -right-12 h-96 w-96 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: "-7s" }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "44px 44px" }}
        />

        <div className="relative flex h-full flex-col justify-center px-12 py-16 text-white xl:px-16">
          {/* Centered content column so ultrawide screens don't leave the
              story hugging the left of a huge gradient field. */}
          <div className="mx-auto w-full max-w-xl 2xl:max-w-2xl">
          <h2 className="font-display-brand max-w-lg text-3xl font-semibold leading-tight xl:text-[2.6rem] xl:leading-[1.15] 2xl:max-w-2xl 2xl:text-5xl">
            {lang === "sq" ? "Kthe Instagramin në dyqan online." : "Turn your Instagram into an online store."}
          </h2>
          <ul ref={pointsRef} className="mt-7 space-y-3">
            {points.map((p) => (
              <li key={p} data-reveal className="flex items-center gap-2.5 text-[15px] text-white/95">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25"><Check className="h-3 w-3" /></span>
                {p}
              </li>
            ))}
          </ul>

          {/* Story: DM → product → order, gently floating */}
          <div className="mt-12 grid max-w-xl grid-cols-2 items-start gap-5">
            <div className="ls-float -rotate-2 rounded-2xl bg-white p-3.5 text-zinc-900 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                <span className={cn("h-5 w-5 rounded-full", BRAND)} />
                <span className="text-xs font-semibold">Shop Name</span>
                <Instagram className="ml-auto h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="mt-2.5 w-fit rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700">
                {lang === "sq" ? "Sa kushton fustani? 🙏" : "How much is the dress? 🙏"}
              </div>
              <div className={cn("ml-auto mt-2 w-fit rounded-2xl rounded-br-sm px-3 py-1.5 text-xs text-white", BRAND)}>
                {lang === "sq" ? "Porosite këtu 👇" : "Order it here 👇"}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="ls-float2 flex rotate-2 items-center gap-3 rounded-2xl bg-white p-3.5 text-zinc-900 shadow-2xl">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Bell className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="text-xs font-bold">{lang === "sq" ? "Porosi e re! 🎉" : "New order! 🎉"}</div>
                  <div className="truncate text-[11px] text-zinc-500">+3,500 ALL · {lang === "sq" ? "paguar me kartë" : "paid by card"}</div>
                </div>
              </div>
              <div className="ls-float3 w-[170px] rotate-1 self-end overflow-hidden rounded-2xl bg-white p-2.5 text-zinc-900 shadow-2xl">
                <img src="/demo/p1.jpg" alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs font-semibold">Fustan liri</span>
                  <span className="text-xs font-bold">3,500 ALL</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-12 text-sm text-white/85">
            {lang === "sq" ? "7 ditë provë falas · Anulo kurdo · Pa kod" : "7-day free trial · Cancel anytime · No code"}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
