// Guided-tour engine for the admin. Watches the route: if the current page has
// a tour the user hasn't completed, it autoplays (once the page's anchors have
// mounted). The sidebar's "Page tutorial" button replays it manually via
// useTutorial(). Completion is per-page in localStorage.

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CallBackProps, Step, TooltipRenderProps } from 'react-joyride';
import { Home, Package, ShoppingBag, MessageSquareQuote, Layers, Megaphone, CreditCard, Settings, Sparkles, ChevronRight, X, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tourForPath, type TourLang } from './tours';

// Joyride's chunk only loads once a tour actually starts.
const Joyride = lazy(() => import('react-joyride').then((m) => ({ default: m.Joyride })));

/** Set once the user has explicitly picked a language (first-run modal or
    sidebar toggle). Tutorial autoplay waits for it so the two never overlap. */
export const LANG_CHOSEN_KEY = 'lang-chosen';
export const LANG_CHOSEN_EVENT = 'instantshop-lang-chosen';

const JOYRIDE_LOCALES: Record<TourLang, { back: string; close: string; last: string; next: string; skip: string }> = {
  en: { back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' },
  sq: { back: 'Prapa', close: 'Mbyll', last: 'Përfundo', next: 'Tjetra', skip: 'Kalo udhëzuesin' },
};

const DONT_SHOW_LABEL: Record<TourLang, string> = {
  en: "Don't show tutorials",
  sq: 'Mos i shfaq udhëzuesit',
};

const TOUR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: Home, products: Package, orders: ShoppingBag, keywords: MessageSquareQuote,
  categories: Layers, promotions: Megaphone, billing: CreditCard, settings: Settings,
};

/** Split a step's prose into a lead sentence + scannable bullets. Splits only
    before an uppercase start so abbreviations ("p.sh.", "e.g.") stay intact. */
const toLeadAndBullets = (text: string): { lead: string; bullets: string[] } => {
  const parts = String(text).split(/(?<=[.!?])\s+(?=[A-ZÇË])/u).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 2) return { lead: String(text), bullets: [] };
  return { lead: parts[0], bullets: parts.slice(1) };
};

/** Rich tour card: icon header, step counter, lead line + bulleted details,
    plus a "Don't show tutorials" opt-out that disables autoplay everywhere. */
const makeTourTooltip = (tourKey: string, lang: TourLang, onDontShow: () => void) => (props: TooltipRenderProps) => {
  const { step, index, size, isLastStep, backProps, primaryProps, skipProps, tooltipProps } = props;
  const Icon = TOUR_ICONS[tourKey] ?? Sparkles;
  const { lead, bullets } = toLeadAndBullets(step.content as string);
  return (
    <div {...tooltipProps} className="w-[380px] max-w-[92vw] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
      <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{step.title as string}</p>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
          {index + 1}/{size}
        </span>
        <button {...skipProps} aria-label={String(skipProps.title)} className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed">
        <p>{lead}</p>
        {bullets.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button {...skipProps} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {String(skipProps.title)}
          </button>
          <button
            type="button"
            onClick={onDontShow}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            <EyeOff className="h-3.5 w-3.5" /> {DONT_SHOW_LABEL[lang]}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button {...(backProps as any)} variant="ghost" size="sm" className="h-8 text-xs">{String(backProps.title)}</Button>
          )}
          <Button {...(primaryProps as any)} size="sm" className="h-8 text-xs">
            {String(primaryProps.title)}{!isLastStep && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

const DONE_PREFIX = 'tutorial-done:';
const doneKey = (key: string) => `${DONE_PREFIX}${key}`;
const isDone = (key: string) => { try { return localStorage.getItem(doneKey(key)) === '1'; } catch { return true; } };
const markDone = (key: string) => { try { localStorage.setItem(doneKey(key), '1'); } catch { /* private mode */ } };

// Global opt-out: when set, no tutorial ever autoplays. The sidebar "Page
// tutorial" button still replays on demand (it clears this flag).
const SKIP_ALL_KEY = 'tutorial-skip-all';
const isSkipAll = () => { try { return localStorage.getItem(SKIP_ALL_KEY) === '1'; } catch { return true; } };
const setSkipAll = (v: boolean) => { try { v ? localStorage.setItem(SKIP_ALL_KEY, '1') : localStorage.removeItem(SKIP_ALL_KEY); } catch { /* private mode */ } };

interface TutorialContextValue {
  /** Start (or restart) the tour for the current page. */
  startTutorial: () => void;
  /** Whether the current page has a tour at all. */
  hasTour: boolean;
}

const TutorialContext = createContext<TutorialContextValue>({ startTutorial: () => {}, hasTour: false });
export const useTutorial = () => useContext(TutorialContext);

/** Keep only steps whose targets exist ('body' steps always pass). */
const availableSteps = (steps: Step[]): Step[] =>
  steps.filter((s) => s.target === 'body' || (typeof s.target === 'string' && document.querySelector(s.target)));

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tooltipComponent, setTooltipComponent] = useState<React.ComponentType<TooltipRenderProps> | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lang: TourLang = i18n.language?.startsWith('sq') ? 'sq' : 'en';
  const tour = tourForPath(location.pathname, lang);

  // "Don't show tutorials" — disable autoplay everywhere and close the current
  // tour. Also marks this page done so it's consistent.
  const dontShowAgain = useCallback(() => {
    setSkipAll(true);
    if (activeKeyRef.current) markDone(activeKeyRef.current);
    if (pollRef.current) clearTimeout(pollRef.current);
    setRun(false);
  }, []);

  const begin = useCallback((manual: boolean) => {
    if (!tour) return;
    // A manual replay (sidebar button) re-enables tutorials — the user asked
    // for it explicitly, so honour that over a prior global opt-out.
    if (manual) setSkipAll(false);
    // Lazy pages + data need a moment to mount their anchors: poll up to ~6s
    // for at least one anchored step, then start with whatever is available.
    if (pollRef.current) clearTimeout(pollRef.current);
    let tries = 0;
    const attempt = () => {
      const ready = availableSteps(tour.steps);
      const anchored = ready.some((s) => s.target !== 'body');
      if (anchored || tries >= 12) {
        if (ready.length === 0) return;
        activeKeyRef.current = tour.key;
        setTooltipComponent(() => makeTourTooltip(tour.key, lang, dontShowAgain));
        setSteps(ready);
        setRun(true);
        return;
      }
      tries += 1;
      pollRef.current = setTimeout(attempt, 500);
    };
    pollRef.current = setTimeout(attempt, manual ? 0 : 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, lang, dontShowAgain]);

  // Autoplay on first visit to a page whose tour isn't completed. Waits until
  // the user has picked a language (first-run modal) so the two never overlap;
  // the modal dispatches LANG_CHOSEN_EVENT when done. Language changes restart
  // a running tour in the new language.
  useEffect(() => {
    setRun(false);
    if (pollRef.current) clearTimeout(pollRef.current);
    const langChosen = (() => { try { return !!localStorage.getItem(LANG_CHOSEN_KEY); } catch { return true; } })();
    const canAutoplay = () => tour && !isDone(tour.key) && !isSkipAll();
    if (canAutoplay() && langChosen) begin(false);
    const onLangChosen = () => { if (canAutoplay()) begin(false); };
    window.addEventListener(LANG_CHOSEN_EVENT, onLangChosen);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      window.removeEventListener(LANG_CHOSEN_EVENT, onLangChosen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, lang]);

  // Persist completion on ANY tour end. react-joyride signals the end in a few
  // ways depending on how it's dismissed (finished, skipped, closed, tour:end),
  // and with a custom tooltip the exact status can vary — so cover them all,
  // otherwise a completed tour re-autoplays on the next visit.
  const onCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data as CallBackProps & { action?: string };
    const ended = status === 'finished' || status === 'skipped'
      || type === 'tour:end' || action === 'close' || action === 'skip';
    if (ended) {
      setRun(false);
      if (activeKeyRef.current) markDone(activeKeyRef.current);
    }
  }, []);

  return (
    <TutorialContext.Provider value={{ startTutorial: () => begin(true), hasTour: !!tour }}>
      {children}
      {run && (
      <Suspense fallback={null}>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        spotlightPadding={6}
        callback={onCallback}
        locale={JOYRIDE_LOCALES[lang]}
        tooltipComponent={tooltipComponent ?? undefined}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--card))',
            textColor: 'hsl(var(--card-foreground))',
            arrowColor: 'hsl(var(--card))',
            overlayColor: 'rgba(0, 0, 0, 0.55)',
          },
          tooltip: { borderRadius: 12, padding: 18, fontSize: 14 },
          tooltipTitle: { fontSize: 16, fontWeight: 700, textAlign: 'left' },
          tooltipContent: { padding: '10px 0 0', textAlign: 'left', lineHeight: 1.55 },
          buttonNext: { borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 },
          buttonBack: { fontSize: 13 },
          buttonSkip: { fontSize: 13, color: 'hsl(var(--muted-foreground))' },
        }}
      />
      </Suspense>
      )}
    </TutorialContext.Provider>
  );
};
