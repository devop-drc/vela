// First-run language picker. Shows once (before any tutorial autoplays) until
// the user explicitly chooses Albanian or English; the choice drives i18n AND
// the tutorial language. Dispatches LANG_CHOSEN_EVENT so the tutorial engine
// knows it may start.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Languages } from 'lucide-react';
import { LANG_CHOSEN_KEY, LANG_CHOSEN_EVENT } from '@/components/tutorial/TutorialProvider';

const hasChosen = () => { try { return !!localStorage.getItem(LANG_CHOSEN_KEY); } catch { return true; } };

export const LanguagePromptModal = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(() => !hasChosen());

  const choose = (lang: 'sq' | 'en') => {
    i18n.changeLanguage(lang);
    try { localStorage.setItem(LANG_CHOSEN_KEY, lang); } catch { /* private mode */ }
    setOpen(false);
    window.dispatchEvent(new CustomEvent(LANG_CHOSEN_EVENT));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* must pick — no dismiss */ }}>
      <DialogContent className="max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Languages className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Zgjidh gjuhën · Choose your language</DialogTitle>
          <DialogDescription className="text-center">
            Mund ta ndryshosh kurdo nga menyja anësore. · You can change it any time from the sidebar.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose('sq')}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="text-3xl" aria-hidden>🇦🇱</span>
            <span className="font-semibold">Shqip</span>
            <span className="text-xs text-muted-foreground">Albanian</span>
          </button>
          <button
            type="button"
            onClick={() => choose('en')}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="text-3xl" aria-hidden>🇬🇧</span>
            <span className="font-semibold">English</span>
            <span className="text-xs text-muted-foreground">Anglisht</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
