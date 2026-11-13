export type PlanId = "regular" | "geek" | "pro" | "ekop" | "premium";

export const PLANS = {
  regular: {
    id: "regular", name: "Regular", priceNgn: 0, uploadBytes: 2 * 1024 * 1024,
    freeFileAnalyses: 3, chat: "Basic AI chat and writing", media: "Limited free media credits",
    videoCreditsPerMonth: 0, features: ["AI chat", "3 file analyses", "Daily streaks", "Chat history", "Light/dark themes"]
  },
  geek: {
    id: "geek", name: "Geek", priceNgn: null, uploadBytes: 5 * 1024 * 1024,
    freeFileAnalyses: 30, chat: "Expanded AI usage", media: "Limited image/audio/video credits",
    videoCreditsPerMonth: 5, features: ["Everything in Regular", "Larger uploads", "Expanded file analysis", "Media studio"]
  },
  pro: {
    id: "pro", name: "Pro", priceNgn: null, uploadBytes: 10 * 1024 * 1024,
    freeFileAnalyses: 150, chat: "Higher usage allowance", media: "Expanded media credits",
    videoCreditsPerMonth: 20, features: ["Everything in Geek", "10 MB uploads", "Higher quotas", "Priority processing"]
  },
  ekop: {
    id: "ekop", name: "Ekop", priceNgn: null, uploadBytes: 15 * 1024 * 1024,
    freeFileAnalyses: 500, chat: "Advanced workflows", media: "Generous media credits",
    videoCreditsPerMonth: 60, features: ["Everything in Pro", "15 MB uploads", "Advanced workflows", "Higher media credits"]
  },
  premium: {
    id: "premium", name: "Premium", priceNgn: null, uploadBytes: 50 * 1024 * 1024,
    freeFileAnalyses: 2000, chat: "Highest usage allowance", media: "Highest configurable media credits",
    videoCreditsPerMonth: 150, features: ["Everything in Ekop", "50 MB uploads", "Top usage tier", "Priority support"]
  }
} as const;

export function getPlan(plan: string) {
  return PLANS[(plan in PLANS ? plan : "regular") as PlanId];
}