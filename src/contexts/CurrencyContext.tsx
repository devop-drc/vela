import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isDemoFrame } from '@/lib/isDemoFrame';
import { getExchangeRates } from "@/lib/exchangeRates";

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
    // Shared single-flight loader — cache-table pre-check + edge-function
    // fallback live in src/lib/exchangeRates.ts, deduped across providers.
    getExchangeRates()
      .then((fetched) => {
        if (!mounted) return;
        const map: Record<string, number> = { ALL: 1 };
        Object.entries(fetched).forEach(([code, rate]) => { map[code] = rate; });
        setRates(map);
      })
      .catch((err) => {
        console.warn('CurrencyProvider: failed to load rates', err);
      });
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
