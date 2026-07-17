export type AccountAccess = "instant" | "notice" | "fixed";
export type AccountRegion = "nationwide" | "east" | "west" | "north";

export type AccountCheckCriteria = {
  amountNok: number;
  access: AccountAccess;
  region: AccountRegion;
  age: number;
  requireVerification: boolean;
};

export type AccountProduct = {
  id: string;
  provider: string;
  productName: string;
  ratePercent: number;
  access: AccountAccess;
  accessLabel: string;
  regions: AccountRegion[];
  minimumAge: number;
  maximumAge?: number;
  minimumBalanceNok: number;
  openBankingCompatible: boolean;
  depositGuarantee: string;
};

export type AccountCheckResult = AccountProduct & {
  estimatedInterestNok: number;
  score: number;
  reasons: string[];
};

// Fictional products for UI development only. Production data must come through
// the server-side Finansportalen provider after a distribution agreement exists.
export const sampleAccountProducts: AccountProduct[] = [
  {
    id: "nordlys-flex",
    provider: "Nordlys Bank",
    productName: "Flexible Saver",
    ratePercent: 4.15,
    access: "instant",
    accessLabel: "Withdraw whenever you need",
    regions: ["nationwide"],
    minimumAge: 18,
    minimumBalanceNok: 0,
    openBankingCompatible: true,
    depositGuarantee: "Norwegian deposit guarantee",
  },
  {
    id: "fjord-31",
    provider: "Fjord Konto",
    productName: "31-day Goal Account",
    ratePercent: 4.55,
    access: "notice",
    accessLabel: "31 days' notice for withdrawals",
    regions: ["nationwide"],
    minimumAge: 18,
    minimumBalanceNok: 10_000,
    openBankingCompatible: true,
    depositGuarantee: "Norwegian deposit guarantee",
  },
  {
    id: "glimt-young",
    provider: "Glimt Sparebank",
    productName: "Young Dream Saver",
    ratePercent: 4.8,
    access: "instant",
    accessLabel: "Four free withdrawals each year",
    regions: ["east", "west", "north"],
    minimumAge: 18,
    maximumAge: 33,
    minimumBalanceNok: 0,
    openBankingCompatible: true,
    depositGuarantee: "Norwegian deposit guarantee",
  },
  {
    id: "havblikk-fixed",
    provider: "Havblikk Bank",
    productName: "90-day Saver",
    ratePercent: 4.7,
    access: "fixed",
    accessLabel: "Money is held for 90 days",
    regions: ["nationwide"],
    minimumAge: 18,
    minimumBalanceNok: 25_000,
    openBankingCompatible: false,
    depositGuarantee: "EEA deposit guarantee",
  },
  {
    id: "lokal-spark",
    provider: "Local Spark Bank",
    productName: "Community Savings Home",
    ratePercent: 4.35,
    access: "instant",
    accessLabel: "Withdraw whenever you need",
    regions: ["east"],
    minimumAge: 18,
    minimumBalanceNok: 0,
    openBankingCompatible: true,
    depositGuarantee: "Norwegian deposit guarantee",
  },
];

const accessWeight: Record<AccountAccess, number> = {
  instant: 1,
  notice: 2,
  fixed: 3,
};

export function compareSampleAccounts(criteria: AccountCheckCriteria): AccountCheckResult[] {
  return sampleAccountProducts
    .filter((product) => product.minimumAge <= criteria.age)
    .filter((product) => !product.maximumAge || product.maximumAge >= criteria.age)
    .filter((product) => product.minimumBalanceNok <= criteria.amountNok)
    .filter(
      (product) =>
        product.regions.includes("nationwide") || product.regions.includes(criteria.region)
    )
    .filter((product) => !criteria.requireVerification || product.openBankingCompatible)
    .filter((product) => accessWeight[product.access] <= accessWeight[criteria.access])
    .map((product) => {
      const reasons = [
        `${product.ratePercent.toFixed(2)}% example rate`,
        product.accessLabel,
        product.openBankingCompatible
          ? "Can support SavePixie verification"
          : "Would need manual verification",
      ];
      const accessMatch = product.access === criteria.access ? 12 : 4;
      const verificationMatch = product.openBankingCompatible ? 8 : 0;

      return {
        ...product,
        estimatedInterestNok: Math.round(criteria.amountNok * (product.ratePercent / 100)),
        score: product.ratePercent * 10 + accessMatch + verificationMatch,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || b.ratePercent - a.ratePercent);
}
