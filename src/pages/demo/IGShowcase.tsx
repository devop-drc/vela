/**
 * Instagram-storefront showcase for the demo. A faithful, self-contained mock
 * of Vela's Instagram-style shop (fixed IG look: blue accent, 3-col post grid,
 * single-column feed). No network — clicking a post opens the feed view.
 */
import { useState } from "react";
import {
  Grid3X3, ShoppingBag, Heart, MessageCircle, Send, Bookmark, ChevronDown,
  Sun, Moon, Plus, Minus, Filter, ArrowUpNarrowWide,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { demoProducts, demoProfile, fmtALL } from "./data";

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

export const IGShowcase = () => {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [openId, setOpenId] = useState<string | null>(null);

  const shellStyle = dark
    ? "bg-black text-white"
    : "bg-white text-neutral-900";
  const border = dark ? "border-white/10" : "border-neutral-200";
  const muted = dark ? "text-neutral-400" : "text-neutral-500";

  const openFeed = (id: string) => { setOpenId(id); setView("feed"); };

  return (
    <div className="mx-auto max-w-[440px]">
      {/* phone frame */}
      <div className={cn("overflow-hidden rounded-[2rem] border-[6px] shadow-2xl", dark ? "border-neutral-800" : "border-neutral-900")}>
        <div className={cn("relative flex h-[720px] flex-col", shellStyle)}>
          {/* top bar */}
          <div className={cn("flex items-center justify-between border-b px-4 py-3", border)}>
            <span className="text-lg font-semibold">butiku_i_elires</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setDark((d) => !d)} aria-label="theme">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => { setView(view === "grid" ? "feed" : "grid"); setOpenId(null); }}
                className="flex items-center gap-1 text-sm font-medium"
              >
                {view === "grid" ? "Products" : "Profile"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", view === "feed" && "rotate-180")} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === "grid" ? (
              <>
                {/* profile header */}
                <div className="px-4 py-4">
                  <div className="flex items-center gap-5">
                    <img src={demoProfile.logo_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-red-500 ring-offset-transparent" />
                    <div className="flex flex-1 justify-around text-center">
                      {[["Posts", demoProfile.posts], ["Followers", demoProfile.followers], ["Following", 312]].map(([l, v]) => (
                        <div key={l as string}>
                          <div className="text-lg font-bold leading-none">{fmtK(v as number)}</div>
                          <div className={cn("text-xs", muted)}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold">{demoProfile.shop_name}</p>
                    <p className="text-sm">Veshje &amp; aksesorë të përzgjedhur me dashuri 🌸</p>
                    <p className={cn("text-sm", muted)}>Tiranë · Transport në të gjithë Shqipërinë</p>
                    <p className="text-sm font-medium text-blue-500">vela.al/shop/butiku-i-elires</p>
                  </div>
                  <button className="mt-3 w-full rounded-lg bg-blue-500 py-1.5 text-sm font-semibold text-white">
                    Follow
                  </button>
                </div>

                {/* filter/sort + tab */}
                <div className={cn("flex items-center gap-2 border-t px-4 py-2", border)}>
                  <button className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium", border)}>
                    <Filter className="h-3.5 w-3.5" /> Filter
                  </button>
                  <button className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium", border)}>
                    <ArrowUpNarrowWide className="h-3.5 w-3.5" /> Sort
                  </button>
                </div>
                <div className={cn("flex justify-center border-t py-2", border)}>
                  <Grid3X3 className="h-6 w-6" />
                </div>

                {/* post grid */}
                <div className="grid grid-cols-3 gap-[2px]">
                  {demoProducts.map((p) => (
                    <button key={p.id} onClick={() => openFeed(p.id)} className="group relative aspect-[3/4] overflow-hidden">
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover transition group-hover:opacity-80" />
                      {p.status === "Out of Stock" && (
                        <span className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-semibold text-white">Sold out</span>
                      )}
                      {p.id === "d1" && (
                        <span className="absolute right-1 top-1 rounded bg-emerald-500 px-1 py-0.5 text-[9px] font-semibold text-white">-20%</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* single-column feed */
              <div className="divide-y" style={{ borderColor: dark ? "rgba(255,255,255,.1)" : "#e5e5e5" }}>
                {(openId ? demoProducts.filter((p) => p.id === openId).concat(demoProducts.filter((p) => p.id !== openId)) : demoProducts).map((p) => (
                  <FeedPost key={p.id} p={p} dark={dark} muted={muted} border={border} />
                ))}
              </div>
            )}
          </div>

          {/* bottom nav */}
          <div className={cn("flex items-center justify-around border-t py-2.5", border)}>
            <button onClick={() => { setView("grid"); setOpenId(null); }}><Grid3X3 className="h-6 w-6" /></button>
            <button className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white">2</span>
            </button>
            <button onClick={() => setDark((d) => !d)}>{dark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedPost = ({ p, dark, muted, border }: { p: (typeof demoProducts)[number]; dark: boolean; muted: string; border: string }) => {
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const discounted = p.id === "d1";
  const price = discounted ? Math.round(p.price * 0.8) : p.price;
  return (
    <div className="pb-3">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <img src={demoProfile.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">{p.name}</p>
          <p className={cn("text-[11px]", muted)}>{p.category} · {p.type}</p>
        </div>
      </div>
      <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button onClick={() => setLiked((l) => !l)}>
          <Heart className={cn("h-6 w-6", liked && "fill-red-500 text-red-500")} />
        </button>
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <Bookmark className="ml-auto h-6 w-6" />
      </div>
      <div className="px-3 pt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold">{fmtALL(price)}</span>
          {discounted && <span className={cn("text-sm line-through", muted)}>{fmtALL(p.price)}</span>}
          {discounted && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">-20%</span>}
        </div>
        <p className="mt-1 text-sm">
          <span className="font-semibold">butiku_i_elires</span> {p.caption}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {p.tags.map((t) => <span key={t} className="text-xs text-blue-500">#{t}</span>)}
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 pt-3">
        {p.status === "Out of Stock" ? (
          <button disabled className="h-11 flex-1 rounded-lg bg-neutral-300 text-sm font-semibold text-neutral-500">Out of Stock</button>
        ) : (
          <>
            <div className={cn("flex items-center rounded-lg border", border)}>
              <button className="px-2.5 py-2.5" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <button className="px-2.5 py-2.5" onClick={() => setQty((q) => q + 1)}><Plus className="h-4 w-4" /></button>
            </div>
            <button className={cn("h-11 flex-1 rounded-lg text-sm font-semibold text-white", discounted ? "bg-emerald-500" : "bg-blue-500")}>
              Buy Now
            </button>
            <button className={cn("h-11 flex-1 rounded-lg border text-sm font-semibold", border)}>Add to Cart</button>
          </>
        )}
      </div>
    </div>
  );
};
