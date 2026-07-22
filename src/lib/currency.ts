export type SavingsCurrency =
  | "AUD"
  | "CAD"
  | "CHF"
  | "CZK"
  | "DKK"
  | "EUR"
  | "GBP"
  | "NOK"
  | "NZD"
  | "PLN"
  | "SEK"
  | "SGD"
  | "USD";

export const savingsCurrencies: Array<{
  code: SavingsCurrency;
  label: string;
}> = [
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "AUD", label: "Australian dollar" },
  { code: "NZD", label: "New Zealand dollar" },
  { code: "NOK", label: "Norwegian krone" },
  { code: "SEK", label: "Swedish krona" },
  { code: "DKK", label: "Danish krone" },
  { code: "CHF", label: "Swiss franc" },
  { code: "PLN", label: "Polish złoty" },
  { code: "CZK", label: "Czech koruna" },
  { code: "SGD", label: "Singapore dollar" },
];

const supportedCurrencyCodes = new Set<SavingsCurrency>(
  savingsCurrencies.map((currency) => currency.code)
);

const regionCurrencies: Record<string, SavingsCurrency> = {
  AT: "EUR",
  AU: "AUD",
  BE: "EUR",
  CA: "CAD",
  CH: "CHF",
  CZ: "CZK",
  DE: "EUR",
  DK: "DKK",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GB: "GBP",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LU: "EUR",
  NL: "EUR",
  NO: "NOK",
  NZ: "NZD",
  PL: "PLN",
  PT: "EUR",
  SE: "SEK",
  SG: "SGD",
  US: "USD",
};

const languageCurrencies: Record<string, SavingsCurrency> = {
  da: "DKK",
  de: "EUR",
  en: "USD",
  es: "EUR",
  fi: "EUR",
  fr: "EUR",
  it: "EUR",
  nb: "NOK",
  nl: "EUR",
  nn: "NOK",
  no: "NOK",
  pl: "PLN",
  pt: "EUR",
  sv: "SEK",
};

const PREFERRED_CURRENCY_KEY = "savepixie.preferred-currency";

export function isSavingsCurrency(value: string | null | undefined): value is SavingsCurrency {
  return Boolean(value && supportedCurrencyCodes.has(value.toUpperCase() as SavingsCurrency));
}

export function detectBrowserCurrency(): SavingsCurrency {
  if (typeof navigator === "undefined") return "USD";

  for (const locale of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const normalized = locale.replace("_", "-");
    const parts = normalized.split("-");
    const region = parts.find((part, index) => index > 0 && /^[A-Za-z]{2}$/.test(part));
    if (region && regionCurrencies[region.toUpperCase()]) {
      return regionCurrencies[region.toUpperCase()];
    }

    const language = parts[0]?.toLowerCase();
    if (language && languageCurrencies[language]) return languageCurrencies[language];
  }

  return "USD";
}

export function getPreferredCurrency(): SavingsCurrency {
  if (typeof window === "undefined") return "USD";
  try {
    const stored = window.localStorage.getItem(PREFERRED_CURRENCY_KEY);
    return isSavingsCurrency(stored) ? stored : detectBrowserCurrency();
  } catch {
    return detectBrowserCurrency();
  }
}

export function rememberPreferredCurrency(currency: SavingsCurrency) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERRED_CURRENCY_KEY, currency);
  } catch {
    // Private browsing or strict storage settings must not block saving.
  }
}

export function currencySymbol(currency: SavingsCurrency): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  });
  return formatter.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
}

const starterScaleFromNok: Record<SavingsCurrency, number> = {
  AUD: 0.15,
  CAD: 0.14,
  CHF: 0.085,
  CZK: 2.1,
  DKK: 0.64,
  EUR: 0.085,
  GBP: 0.072,
  NOK: 1,
  NZD: 0.16,
  PLN: 0.36,
  SEK: 0.96,
  SGD: 0.12,
  USD: 0.1,
};

export function starterAmountFromNok(amount: number, currency: SavingsCurrency): number {
  const raw = amount * starterScaleFromNok[currency];
  const rounding =
    raw >= 10_000 ? 1000 : raw >= 1000 ? 100 : raw >= 100 ? 50 : raw >= 20 ? 10 : raw >= 5 ? 5 : 1;
  return Math.max(rounding, Math.round(raw / rounding) * rounding);
}

export function starterCentsFromNok(cents: number, currency: SavingsCurrency): number {
  return starterAmountFromNok(cents / 100, currency) * 100;
}
