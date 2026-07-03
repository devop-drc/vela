/**
 * Split-screen auth shell shared by Login/Register: form on the left,
 * brand story panel on the right — animated signature gradient, floating
 * story cards, and the landing's typography (Clash Display + Satoshi).
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Instagram, ShoppingBag, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "brand-gradient";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** bullets shown on the brand panel */
  points: string[];
  lang: "sq" | "en";
}

export default function AuthLayout({ title, subtitle, children, points, lang }: Props) {
  return (
    <div className="font-sans-brand grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1.05fr]">
      {/* ── Form column ── */}
      <div className="relative flex flex-col px-6 py-7 sm:px-12">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {lang === "sq" ? "Kthehu" : "Back"}
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <span className={cn("grid h-8 w-8 place-items-center rounded-[10px] text-white shadow-md shadow-fuchsia-500/25 ring-1 ring-inset ring-white/25", BRAND)}>
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="font-display-brand text-[17px] font-semibold">InstantShop</span>
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="font-display-brand text-[2.1rem] font-semibold leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-2.5 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} InstantShop · {lang === "sq" ? "Pagesa të sigurta me Raiffeisen (RaiAccept)" : "Secure payments by Raiffeisen (RaiAccept)"}
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
            {lang === "sq" ? "Ktheje Instagramin tënd në një dyqan të vërtetë." : "Turn your Instagram into a real store."}
          </h2>
          <ul className="mt-7 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[15px] text-white/95">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25"><Check className="h-3 w-3" /></span>
                {p}
              </li>
            ))}
          </ul>

          {/* Story: DM → product → order, gently floating */}
          <div className="mt-12 grid max-w-xl grid-cols-2 items-start gap-5">
            <div className="ls-float -rotate-2 rounded-2xl bg-white p-3.5 text-foreground shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className={cn("h-5 w-5 rounded-full", BRAND)} />
                <span className="text-xs font-semibold">Butiku i Elirës</span>
                <Instagram className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-2.5 w-fit rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-xs">
                {lang === "sq" ? "Sa kushton fustani? 🙏" : "How much is the dress? 🙏"}
              </div>
              <div className={cn("ml-auto mt-2 w-fit rounded-2xl rounded-br-sm px-3 py-1.5 text-xs text-white", BRAND)}>
                {lang === "sq" ? "Porosite këtu 👇" : "Order it here 👇"}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="ls-float2 flex rotate-2 items-center gap-3 rounded-2xl bg-white p-3.5 text-foreground shadow-2xl">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Bell className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="text-xs font-bold">{lang === "sq" ? "Porosi e re! 🎉" : "New order! 🎉"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">+3,500 ALL · {lang === "sq" ? "paguar me kartë" : "paid by card"}</div>
                </div>
              </div>
              <div className="ls-float3 w-[170px] rotate-1 self-end overflow-hidden rounded-2xl bg-white p-2.5 text-foreground shadow-2xl">
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
