import type { SeoPage } from "@/lib/seo";
import type { RouteSummary } from "@/lib/seo-content-solutions";

export const guidePages: Record<string, SeoPage> = {
  "how-to-organize-household-chores": {
    slug: "how-to-organize-household-chores",
    path: "/guides/how-to-organize-household-chores",
    title: "How to Organize Household Chores Without Constant Reminders",
    description:
      "Learn how to organize household chores with a system that makes responsibilities visible, recurring, and easier for families or roommates to follow through on.",
    heroTitle: "How to organize household chores without becoming the house manager forever.",
    heroDescription:
      "The best chore system is not the fanciest one. It is the one everyone can see, understand, and keep using. Here is a practical framework for organizing household chores in a way that actually sticks.",
    eyebrow: "Household guide",
    keywords: [
      "how to organize household chores",
      "household chore system",
      "family chore organization",
      "roommate chore schedule",
    ],
    intent: [
      "Make every recurring responsibility visible.",
      "Assign ownership before frustration builds up.",
      "Use a simple shared system instead of memory and nagging.",
    ],
    sections: [
      {
        title: "1. List the chores that actually repeat",
        paragraphs: [
          "Start by writing down the tasks that reliably come back. Daily dishes, weekly vacuuming, trash, groceries, bathroom cleaning, rent reminders, and home maintenance all count.",
          "People often underestimate how much housework feels invisible until it is written down. Naming the repeat jobs is the first step toward fairness.",
        ],
      },
      {
        title: "2. Assign ownership instead of using vague group responsibility",
        paragraphs: [
          "A chore assigned to everyone is usually a chore assigned to nobody. Give every repeating task an owner, even if that owner rotates over time.",
          "Ownership creates clarity and reduces the mental energy of guessing who should notice what. That is where chore systems usually start to feel fair instead of fuzzy.",
        ],
      },
      {
        title: "3. Put chores on a recurring schedule",
        paragraphs: [
          "Households run on recurring work, so chore organization should too. Daily, weekly, and monthly tasks need automatic reset points.",
        ],
        bullets: [
          "Daily: dishes, counters, pet care, quick resets.",
          "Weekly: trash, bathrooms, vacuuming, laundry rotations.",
          "Monthly: filters, deep cleaning, pantry resets, maintenance checks.",
        ],
      },
      {
        title: "4. Keep the system in a place everyone can find",
        paragraphs: [
          "The best chore plan in the world is useless if it lives in one person's notebook. Use a shared system that everyone can access easily.",
          "That is one reason digital household apps work well. They centralize the list, the owners, and the recurring schedule instead of scattering them across memory, paper, and group messages.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the easiest way to organize household chores?",
        answer:
          "List the repeating chores, assign each one to a person, put them on a recurring schedule, and keep the system in a shared place everyone can access easily.",
      },
      {
        question: "Should chores rotate or stay assigned?",
        answer:
          "Either can work. The important part is that the current owner is always clear. Many households start with fixed ownership and rotate only when they want to rebalance the work.",
      },
      {
        question: "Why do chore systems stop working?",
        answer:
          "They usually fail because the tasks are unclear, the owners are vague, the schedule is inconsistent, or the system lives in a place nobody checks reliably.",
      },
    ],
    relatedPaths: [
      "/roommate-chore-app",
      "/family-organizer-app",
      "/allowance-app-for-kids",
      "/household-management-app",
    ],
    type: "guide",
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
  },
  "shared-grocery-list-for-families": {
    slug: "shared-grocery-list-for-families",
    path: "/guides/shared-grocery-list-for-families",
    title: "How to Build a Shared Grocery List System for Families",
    description:
      "A practical guide to building a shared grocery list system for families so everyone can add items, see the current plan, and reduce duplicate purchases.",
    heroTitle: "How to build a shared grocery list system your family will actually use.",
    heroDescription:
      "The hardest part of grocery planning is rarely the list itself. It is keeping the whole household aligned. Here is a simple way to make a shared grocery list work for busy families.",
    eyebrow: "Family grocery guide",
    keywords: [
      "shared grocery list for families",
      "family grocery list system",
      "how to make a shared grocery list",
      "family shopping list app",
    ],
    intent: [
      "Create one reliable list for the whole family.",
      "Cut down on duplicate shopping and forgotten staples.",
      "Connect meal planning and grocery planning without extra friction.",
    ],
    sections: [
      {
        title: "Use one shared list, not multiple channels",
        paragraphs: [
          "If groceries are being managed partly in texts, partly in memory, and partly in one person’s notes app, the list is already broken.",
          "Start by choosing one system where the family can add and check items without asking who has the latest version.",
        ],
      },
      {
        title: "Separate recurring staples from one-off needs",
        paragraphs: [
          "The best family grocery list system distinguishes between routine staples and random weekly needs. Milk, eggs, lunch items, and household basics behave differently from ingredients for a one-time recipe.",
          "When families separate those categories mentally or structurally, shopping gets more predictable and easier to delegate.",
        ],
      },
      {
        title: "Connect the list to meal planning",
        paragraphs: [
          "Meal planning only reduces stress when it actually informs the shopping list. If dinner plans live in a separate place, the grocery list becomes a memory test again.",
          "A shared household app can simplify this because meals and groceries live closer together.",
        ],
      },
      {
        title: "Make the list visible before the store run starts",
        paragraphs: [
          "Families often forget that a shared list only works if everyone trusts it. Before anyone shops, make sure the list has been reviewed recently and that the household knows where to add last-minute needs.",
        ],
      },
    ],
    faqs: [
      {
        question: "What makes a shared grocery list work for families?",
        answer:
          "One shared source of truth, a clear place to add items, a distinction between recurring staples and one-off needs, and a connection to meal planning all make a big difference.",
      },
      {
        question: "Should kids add items to the family grocery list?",
        answer:
          "They can, if that fits the household. Shared visibility often works better than routing every request through one parent.",
      },
      {
        question: "Why does the same family keep buying duplicates?",
        answer:
          "Duplicate shopping usually happens when the list is fragmented or outdated. A shared system reduces the guesswork and gives the household one current view.",
      },
    ],
    relatedPaths: [
      "/shared-grocery-list-app",
      "/family-organizer-app",
      "/household-management-app",
      "/compare/cozi-vs-roost",
    ],
    type: "guide",
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
  },
};

export const comparePages: Record<string, SeoPage> = {
  "splitwise-vs-roost": {
    slug: "splitwise-vs-roost",
    path: "/compare/splitwise-vs-roost",
    title: "Splitwise vs Roost for Shared Homes",
    description:
      "Comparing Splitwise vs Roost? Splitwise is strong for pure expense tracking, while Roost is built for shared home coordination with bills, chores, groceries, reminders, and more.",
    heroTitle: "Splitwise vs Roost: expense tracker or full household app?",
    heroDescription:
      "If your main need is pure expense tracking, Splitwise is a familiar option. If your home also needs chores, shared grocery lists, reminders, and broader coordination, Roost is built for that bigger shared-home workflow.",
    eyebrow: "Comparison guide",
    keywords: [
      "splitwise vs roost",
      "splitwise alternative for roommates",
      "roommate expense app comparison",
    ],
    intent: [
      "Understand whether you need a pure money tool or a broader household system.",
      "Compare expense tracking against all-in-one shared home coordination.",
      "Choose the app that matches how your home actually operates.",
    ],
    sections: [
      {
        title: "Where Splitwise is strongest",
        paragraphs: [
          "Splitwise is centered on shared expenses. It is well known because it focuses the product around who paid, who owes, and how balances settle out.",
        ],
      },
      {
        title: "Where Roost is different",
        paragraphs: [
          "Roost is built for the wider problem of sharing a home. Expense tracking is part of the picture, but so are chores, shared grocery lists, reminders, calendars, meal planning, and household structure.",
          "Roost is a better fit when the same people splitting bills are also coordinating the rest of the house.",
        ],
      },
      {
        title: "Which one fits your search intent better",
        paragraphs: [
          "Choose Splitwise if your main job is tracking shared costs and you do not care much about chores, reminders, or grocery coordination in the same tool.",
          "Choose Roost if the pain point is broader household coordination and you want bills to sit inside that larger shared-home system.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Roost a Splitwise replacement?",
        answer:
          "For some shared homes, yes. Roost is especially relevant when expense tracking is only one part of a larger coordination problem around chores, groceries, reminders, and shared routines.",
      },
      {
        question: "Which is better for roommates?",
        answer:
          "If roommates only care about money tracking, Splitwise can fit well. If they want one app for bills plus household coordination, Roost is usually the closer match.",
      },
      {
        question: "Does Roost include bill splitting?",
        answer:
          "Yes. Roost supports household expense tracking as part of a broader shared-home workflow.",
      },
    ],
    relatedPaths: [
      "/split-bills-for-roommates",
      "/roommate-chore-app",
      "/household-management-app",
      "/shared-grocery-list-app",
    ],
    type: "compare",
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
  },
  "cozi-vs-roost": {
    slug: "cozi-vs-roost",
    path: "/compare/cozi-vs-roost",
    title: "Cozi vs Roost for Family Organization",
    description:
      "Comparing Cozi vs Roost? Cozi is known for family organization, while Roost combines family coordination with chores, allowances, groceries, reminders, and broader household workflows.",
    heroTitle: "Cozi vs Roost: which family organizer fits your household better?",
    heroDescription:
      "If you are comparing Cozi vs Roost, the real question is whether you want a calendar-and-lists organizer first or a broader household app that also emphasizes chores, allowances, reminders, groceries, and shared home accountability.",
    eyebrow: "Comparison guide",
    keywords: [
      "cozi vs roost",
      "cozi alternative",
      "family organizer app comparison",
    ],
    intent: [
      "Compare a familiar family organizer with a broader household operating system.",
      "Decide whether your family needs coordination alone or coordination plus responsibility tracking.",
      "Choose the tool that matches how your family actually runs the house.",
    ],
    sections: [
      {
        title: "Where Cozi is strongest",
        paragraphs: [
          "Cozi is well known for family scheduling, lists, and organizational visibility. Families who mainly want calendar-style coordination and a familiar family organizer experience often start there.",
        ],
      },
      {
        title: "Where Roost goes further",
        paragraphs: [
          "Roost is built for the broader mechanics of household life. It brings together chores, allowances, reminders, groceries, bills, calendars, and meal planning in one family-focused household app.",
          "That makes it a better fit when the pain point is not just scheduling, but also follow-through and responsibility tracking.",
        ],
      },
      {
        title: "How to choose between them",
        paragraphs: [
          "Choose Cozi if your primary need is straightforward family organization around schedules and shared lists.",
          "Choose Roost if your family also wants chores, allowances, reminders, and household accountability to live in the same system instead of scattered across separate tools.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Roost a Cozi alternative?",
        answer:
          "Yes, especially for families that want a broader household workflow tool rather than a more traditional organizer centered mostly on schedules and shared planning.",
      },
      {
        question: "Which app is better for chore and allowance tracking?",
        answer:
          "Roost is the closer fit when chores, allowances, reminders, and broader household coordination are important parts of the decision.",
      },
      {
        question: "Can Roost handle family calendars too?",
        answer:
          "Yes. Roost includes shared household calendar functionality alongside chores, reminders, groceries, meals, and family routines.",
      },
    ],
    relatedPaths: [
      "/family-organizer-app",
      "/allowance-app-for-kids",
      "/shared-grocery-list-app",
      "/guides/shared-grocery-list-for-families",
    ],
    type: "compare",
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
  },
};

export const relatedRouteDetails: Record<string, RouteSummary> = {
  "/household-management-app": {
    href: "/household-management-app",
    label: "Household management app",
    description: "See how Roost fits chores, groceries, reminders, bills, and calendars into one shared-home workflow.",
  },
  "/roommate-chore-app": {
    href: "/roommate-chore-app",
    label: "Roommate chore app",
    description: "Learn how Roost helps roommates assign chores and make recurring work visible.",
  },
  "/family-organizer-app": {
    href: "/family-organizer-app",
    label: "Family organizer app",
    description: "See how Roost supports family coordination, reminders, chores, calendars, and allowances.",
  },
  "/shared-grocery-list-app": {
    href: "/shared-grocery-list-app",
    label: "Shared grocery list app",
    description: "Explore how Roost helps homes keep one reliable shopping list everyone can access.",
  },
  "/split-bills-for-roommates": {
    href: "/split-bills-for-roommates",
    label: "Split bills for roommates",
    description: "See how Roost handles shared expenses inside a broader household coordination tool.",
  },
  "/allowance-app-for-kids": {
    href: "/allowance-app-for-kids",
    label: "Allowance app for kids",
    description: "See how chores, routines, and allowances fit together in Roost for family households.",
  },
  "/guides/how-to-organize-household-chores": {
    href: "/guides/how-to-organize-household-chores",
    label: "How to organize household chores",
    description: "Read a practical guide for building a chore system that actually sticks.",
  },
  "/guides/shared-grocery-list-for-families": {
    href: "/guides/shared-grocery-list-for-families",
    label: "Shared grocery list tips",
    description: "Read a practical guide for building a grocery list system families can actually use.",
  },
  "/compare/splitwise-vs-roost": {
    href: "/compare/splitwise-vs-roost",
    label: "Splitwise vs Roost",
    description: "Compare a pure expense-tracking tool with a broader shared-home coordination app.",
  },
  "/compare/cozi-vs-roost": {
    href: "/compare/cozi-vs-roost",
    label: "Cozi vs Roost",
    description: "Compare a familiar family organizer with a broader household workflow tool.",
  },
};
