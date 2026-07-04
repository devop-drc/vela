import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isDemoFrame } from '@/lib/isDemoFrame';
import { supabase } from "@/integrations/supabase/client";

export type ExchangeRate = { code: string; rate: number; as_of: string };

type CurrencyContextValue = {
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  rates: Record<string, number>; // code -> rate (ALL -> code)
  convert: (amount: number, from: string, to: string) => number;
  convertALLTo: (amountALL: number, code: string) => number;
  toALL: (amount: number, from: string) => number;
  format: (amountALL: number, code: string) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const symbols: Record<string, string> = { USD: "$", EUR: "€", ALL: "L", GBP: "£" };

export const CurrencyProvider: React.FC<{ children: React.ReactNode; defaultDisplay?: string }>= ({ children, defaultDisplay = "EUR" }) => {
  const [displayCurrency, setDisplayCurrency] = useState(defaultDisplay);
  const [rates, setRates] = useState<Record<string, number>>({ ALL: 1 });

  useEffect(() => {
    if (isDemoFrame()) return; // demo/preview iframes run on mock data
    let mounted = true;
    (async () => {
      // 1) Try cache table first
      const { data: cached, error: cacheErr } = await supabase
        .from('exchange_rates_cache')
        .select('id, rates, last_fetched_at')
        .eq('id', 1)
        .maybeSingle();

      const now = Date.now();
      const freshEnough = (ts?: string | null) => ts ? (now - new Date(ts).getTime()) < 24 * 60 * 60 * 1000 : false;

      if (cached?.rates && freshEnough(cached.last_fetched_at)) {
        const map: Record<string, number> = { ALL: 1 };
        Object.entries<number>(cached.rates as Record<string, number>).forEach(([code, rate]) => { map[code] = rate; });
        if (mounted) setRates(map);
        return;
      }

      // 2) Fallback to edge function (which will refresh cache)
      const { data, error } = await supabase.functions.invoke('exchange-rates');
      if (!mounted) return;
      if (!error && data && data.rates) {
        const map: Record<string, number> = { ALL: 1 };
        Object.entries<number>(data.rates as Record<string, number>).forEach(([code, rate]) => { map[code] = rate; });
        setRates(map);
      } else {
        console.warn('CurrencyProvider: failed to load rates', error || data || cacheErr);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const convert = useCallback((amount: number, from: string, to: string) => {
    if (!isFinite(amount)) return 0;
    if (from === to) return amount;
    // All rates are ALL -> code. Convert via ALL
    const fromToALL = from === "ALL" ? 1 : (rates[from] ? 1 / rates[from] : 1);
    const inALL = amount * fromToALL;
    const allToTarget = rates[to] || 1; // ALL -> target
    return inALL * allToTarget;
  }, [rates]);

  const convertALLTo = useCallback((amountALL: number, code: string) => convert(amountALL, "ALL", code), [convert]);
  const toALL = useCallback((amount: number, from: string) => convert(amount, from, "ALL"), [convert]);

  const format = useCallback((amountALL: number, code: string) => {
    const v = convertALLTo(amountALL, code);
    const symbol = symbols[code] || code + " ";
    return `${symbol}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [convertALLTo]);

  const value = useMemo(() => ({ displayCurrency, setDisplayCurrency, rates, convert, convertALLTo, toALL, format }), [displayCurrency, rates, convert, convertALLTo, toALL, format]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
