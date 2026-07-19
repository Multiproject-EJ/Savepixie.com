export type SavingsMove = {
  id: string;
  name: string;
  emoji: string;
  headline: string;
  description: string;
  suggestedCents: number;
  principle: string;
  completionKind: "action" | "save";
  actionLabel: string;
  reflectionPrompt: string;
};

export type GoalIdea = {
  id: string;
  name: string;
  emoji: string;
  targetCents: number;
  category: string;
  motivation: string;
};

export const savingsMoves: SavingsMove[] = [
  {
    id: "swap-and-save",
    name: "Swap & Save",
    emoji: "↔️",
    headline: "Make one painless swap",
    description: "Choose one small spend to swap today, then send the difference to your goal.",
    suggestedCents: 5000,
    principle: "Keep the joy; redirect the waste.",
    completionKind: "save",
    actionLabel: "Make the swap",
    reflectionPrompt: "What did you swap or skip?",
  },
  {
    id: "round-up-rally",
    name: "Round-up Rally",
    emoji: "⬆️",
    headline: "Round today in your favour",
    description: "Round a recent purchase up to the next 50 kr and save the difference manually.",
    suggestedCents: 3000,
    principle: "Small invisible amounts become visible progress.",
    completionKind: "save",
    actionLabel: "Round and save",
    reflectionPrompt: "Which purchase did you round up?",
  },
  {
    id: "pause-power",
    name: "Pause Power",
    emoji: "⏸️",
    headline: "Give one want 24 hours",
    description: "Pause a non-essential purchase for a day and bank a tiny part of its price now.",
    suggestedCents: 5000,
    principle: "A pause creates choice without banning treats.",
    completionKind: "action",
    actionLabel: "Start my 24-hour pause",
    reflectionPrompt: "What are you giving yourself time to reconsider?",
  },
  {
    id: "found-money",
    name: "Found Money",
    emoji: "✨",
    headline: "Catch money you did not expect",
    description:
      "Save part of a refund, discount, gift, or under-budget moment before it disappears.",
    suggestedCents: 10000,
    principle: "Give surprise money a purpose first.",
    completionKind: "save",
    actionLabel: "Give it a purpose",
    reflectionPrompt: "Where did the unexpected money come from?",
  },
  {
    id: "tiny-tax",
    name: "Tiny Treat Tax",
    emoji: "🍰",
    headline: "Match a little of the fun",
    description: "Enjoy a treat, then move a small matching amount toward something bigger.",
    suggestedCents: 2000,
    principle: "Pleasure today can support pleasure tomorrow.",
    completionKind: "save",
    actionLabel: "Match my treat",
    reflectionPrompt: "What little treat are you matching?",
  },
  {
    id: "no-spend-sprint",
    name: "No-spend Sprint",
    emoji: "🏁",
    headline: "Protect one spending-free pocket",
    description:
      "Choose one easy category to skip for a few hours and save a small victory amount.",
    suggestedCents: 5000,
    principle: "Short sprints feel lighter than strict bans.",
    completionKind: "action",
    actionLabel: "Begin my sprint",
    reflectionPrompt: "Which easy spending pocket will you protect?",
  },
];

export const goalIdeas: GoalIdea[] = [
  {
    id: "mini-adventure",
    name: "Weekend adventure",
    emoji: "🏕️",
    targetCents: 350000,
    category: "Experiences",
    motivation: "A memorable escape without the after-trip money wobble.",
  },
  {
    id: "calm-buffer",
    name: "Peace-of-mind fund",
    emoji: "🌿",
    targetCents: 500000,
    category: "Security",
    motivation: "A small cushion that makes ordinary surprises feel calmer.",
  },
  {
    id: "creative-kit",
    name: "Creative setup",
    emoji: "🎨",
    targetCents: 800000,
    category: "Creativity",
    motivation: "Tools that help a hobby become a real part of your week.",
  },
  {
    id: "dream-trip",
    name: "Dream trip",
    emoji: "✈️",
    targetCents: 1200000,
    category: "Travel",
    motivation: "Turn a far-away place into a plan you can watch getting closer.",
  },
  {
    id: "first-home",
    name: "Cosy home upgrade",
    emoji: "🛋️",
    targetCents: 600000,
    category: "Home",
    motivation: "One meaningful improvement rather than endless impulse décor.",
  },
  {
    id: "future-skill",
    name: "Course or new skill",
    emoji: "🌱",
    targetCents: 450000,
    category: "Growth",
    motivation: "Invest in something future-you can keep using.",
  },
];

export function getDailySavingsMove(date = new Date()) {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return savingsMoves[Math.abs(dayNumber) % savingsMoves.length];
}
