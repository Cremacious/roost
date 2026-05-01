import type { SeoPage } from "@/lib/seo";

export type RouteSummary = {
  href: string;
  label: string;
  description: string;
};

export const homepageResourceLinks: RouteSummary[] = [
  {
    href: "/household-management-app",
    label: "Household management app",
    description:
      "An overview of how Roost brings chores, groceries, bills, reminders, calendars, meals, and allowances together.",
  },
  {
    href: "/roommate-chore-app",
    label: "Roommate chore app",
    description:
      "A page for searchers who want a better way to assign chores without awkward follow-up texts.",
  },
  {
    href: "/family-organizer-app",
    label: "Family organizer app",
    description:
      "A page for parents looking for one place to manage calendars, chores, reminders, and allowances.",
  },
  {
    href: "/shared-grocery-list-app",
    label: "Shared grocery list app",
    description:
      "A page focused on collaborative grocery planning, recurring staples, and household visibility.",
  },
  {
    href: "/split-bills-for-roommates",
    label: "Split bills for roommates",
    description:
      "A page for people who want shared expenses and household coordination inside one app.",
  },
  {
    href: "/allowance-app-for-kids",
    label: "Allowance app for kids",
    description:
      "A page focused on connecting chores, routines, and allowances inside a family workflow.",
  },
];

export const solutionPages: Record<string, SeoPage> = {
  "household-management-app": {
    slug: "household-management-app",
    path: "/household-management-app",
    title: "Household Management App for Families and Roommates",
    description:
      "Roost is a household management app for families and roommates with chores, grocery lists, bills, reminders, calendars, meals, and allowances in one place.",
    heroTitle: "A household management app that covers the whole home.",
    heroDescription:
      "Roost gives families and roommates one shared place for chores, grocery lists, reminders, bills, meals, allowances, and calendars so the house keeps moving without one person carrying the whole mental load.",
    eyebrow: "Household management",
    keywords: [
      "household management app",
      "home management app",
      "family household app",
      "roommate household app",
    ],
    intent: [
      "Manage chores, reminders, groceries, bills, and calendars together.",
      "Stop switching between separate apps for every household job.",
      "Give every member of the house shared visibility into what matters next.",
    ],
    sections: [
      {
        title: "Why people search for a household management app",
        paragraphs: [
          "Most households do not have one giant problem. They have ten small coordination problems that pile up fast: chores nobody owns, groceries that get duplicated, reminders that live in one person's head, and bills that need tracking.",
          "Roost is built for that gap. Instead of treating chores, expenses, calendars, reminders, and groceries as separate products, it treats them like parts of the same shared-home workflow.",
        ],
      },
      {
        title: "What Roost helps your home manage",
        paragraphs: [
          "Roost works best for homes that want a single operating system for daily life. Roommates can assign chores, track recurring responsibilities, split expenses, and coordinate groceries. Families can combine shared calendars, reminders, chores, meal planning, and kid allowances in the same place.",
        ],
        bullets: [
          "Chores with assignments and recurring schedules.",
          "Shared grocery lists for staples, weekly trips, and store runs.",
          "Expense tracking and bill splitting so balances stay visible.",
          "Household reminders and calendars that everyone can see.",
          "Meal planning and allowances for family households that need more than a checklist.",
        ],
      },
      {
        title: "Built for families and roommates, not just one niche",
        paragraphs: [
          "Some apps are good at chores but weak at finances. Some are decent for bill splitting but leave families juggling separate calendar and reminder tools. Roost is built for households that want to coordinate the whole home.",
          "That broader fit matters because families and roommates search differently. Families search for organizer apps and chore tools. Roommates search for bill splitting, grocery list, or shared house apps. Roost can meet both intents without pretending those households work the same way.",
        ],
      },
    ],
    faqs: [
      {
        question: "Who is Roost best for?",
        answer:
          "Roost is best for families, roommates, college houses, and any shared home that wants one place to manage chores, groceries, reminders, bills, calendars, meals, and allowances.",
      },
      {
        question: "Is Roost only for chores?",
        answer:
          "No. Chores are one part of the product, but Roost is designed as a broader household management app that also handles shared grocery lists, reminders, expenses, calendars, meal planning, and family workflows.",
      },
      {
        question: "Why use one app instead of several smaller ones?",
        answer:
          "One app reduces context switching and missing handoffs. The same household that needs a chore assignment usually also needs grocery planning, reminders, and expense tracking, so putting those workflows together is usually simpler than stitching together multiple apps.",
      },
    ],
    relatedPaths: [
      "/roommate-chore-app",
      "/family-organizer-app",
      "/shared-grocery-list-app",
      "/split-bills-for-roommates",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
  "roommate-chore-app": {
    slug: "roommate-chore-app",
    path: "/roommate-chore-app",
    title: "Roommate Chore App for Shared Homes",
    description:
      "Roost helps roommates assign chores, set recurring schedules, track completion, and reduce the awkward follow-up texts that come with shared cleaning.",
    heroTitle: "A roommate chore app that makes expectations visible.",
    heroDescription:
      "Roost helps roommates assign chores, rotate responsibilities, reset recurring tasks automatically, and give everyone one shared source of truth for who owns what around the house.",
    eyebrow: "Roommate chores",
    keywords: [
      "roommate chore app",
      "app for roommate chores",
      "shared house chore app",
      "roommate cleaning schedule app",
    ],
    intent: [
      "Make recurring chores visible without chasing people down.",
      "Assign ownership so nobody can claim they did not know.",
      "Turn household expectations into a shared system instead of a group chat argument.",
    ],
    sections: [
      {
        title: "The problem with roommate chore systems",
        paragraphs: [
          "A whiteboard gets ignored. A text thread gets buried. A spreadsheet feels like homework. Even when the house agrees on the chores, the system falls apart when nobody can see the schedule or the current owner at a glance.",
          "A good roommate chore app has to do more than list tasks. It needs to keep the responsibilities visible, reset recurring chores automatically, and make it obvious when something is done and when it is overdue.",
        ],
      },
      {
        title: "How Roost helps roommates share chores fairly",
        paragraphs: [
          "Roost is designed for homes where fairness matters as much as convenience. You can assign chores to specific people, create recurring schedules for the boring jobs that never stop coming back, and keep the whole household on the same page without one person becoming the chore manager by default.",
        ],
        bullets: [
          "Assign chores to one roommate instead of leaving them vague.",
          "Set daily, weekly, or monthly recurring schedules.",
          "Track completion so the house can see what is done and what is still hanging out there.",
          "Use streaks and lightweight accountability to keep chores moving.",
        ],
      },
      {
        title: "Why a roommate chore app works better inside a full household tool",
        paragraphs: [
          "Roommates rarely stop at chores. The same house also needs shared grocery lists, bill splitting, reminders, and calendar coordination. That is why Roost is useful beyond chore management alone.",
          "Roost makes the chore workflow stronger because it sits inside a broader roommate operating system. The same people using the house together can also track expenses, lists, and reminders in one place.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can roommates rotate chores in Roost?",
        answer:
          "Roost supports recurring chores and clear assignment tracking, which gives shared homes a cleaner base for chore rotation and repeating schedules.",
      },
      {
        question: "Is Roost only for large roommate houses?",
        answer:
          "No. It works for two roommates who just want less friction as well as larger houses where fairness and visibility get much harder without a system.",
      },
      {
        question: "Does Roost also help with bills and groceries?",
        answer:
          "Yes. Roost is broader than a chore-only app, so the same roommate household can also manage shared grocery lists, reminders, calendars, and bill splitting workflows.",
      },
    ],
    relatedPaths: [
      "/split-bills-for-roommates",
      "/shared-grocery-list-app",
      "/compare/splitwise-vs-roost",
      "/guides/how-to-organize-household-chores",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
  "family-organizer-app": {
    slug: "family-organizer-app",
    path: "/family-organizer-app",
    title: "Family Organizer App for Busy Households",
    description:
      "Roost helps families manage chores, reminders, calendars, grocery lists, meal planning, and allowances in one shared household system.",
    heroTitle: "A family organizer app for the real work of running a home.",
    heroDescription:
      "Roost helps families keep chores, calendars, reminders, groceries, meal plans, and kid allowances in one place so the routine jobs of home life stop living in one parent's brain.",
    eyebrow: "Family organizer",
    keywords: [
      "family organizer app",
      "family management app",
      "family planning app",
      "home organizer app for families",
    ],
    intent: [
      "Coordinate the whole family from one shared household dashboard.",
      "Reduce the mental load around chores, schedules, and reminders.",
      "Give kids and adults visibility into what needs to happen this week.",
    ],
    sections: [
      {
        title: "Why families outgrow generic to-do apps",
        paragraphs: [
          "Families do not just need a checklist. They need a system that handles recurring chores, school and home reminders, meal planning, grocery coordination, and age-appropriate responsibility for kids.",
          "A dedicated family organizer app should reduce that load by giving the whole household one place to see what is next and what belongs to whom.",
        ],
      },
      {
        title: "How Roost supports family routines",
        paragraphs: [
          "Roost combines the parts of home life that tend to create daily friction. Parents can assign chores, set recurring reminders, plan meals, keep a shared calendar, and tie kid allowances to household responsibilities.",
        ],
        bullets: [
          "Family chores with visibility and recurring schedules.",
          "Shared reminders for recurring responsibilities like trash day, rent, or maintenance.",
          "Meal planning that connects naturally to grocery coordination.",
          "Allowances for kids who are earning rewards through chores and consistency.",
        ],
      },
      {
        title: "A family organizer should help the whole house, not just parents",
        paragraphs: [
          "The best family organizer app is one that more than one person actually uses. Roost is built so that kids, parents, and other household members can see responsibilities and household context clearly.",
          "Some households mainly need chores and reminders at first. Others need calendars, grocery coordination, meal planning, and allowances. Roost gives families a shared base instead of forcing them to replace tools every time the household gets busier.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Roost a family calendar app or a chore app?",
        answer:
          "It is broader than either of those alone. Roost includes family-friendly household workflows like chores, reminders, calendars, grocery coordination, meal planning, and allowances.",
      },
      {
        question: "Can families use Roost for kids and parents together?",
        answer:
          "Yes. Roost is built for shared household use, so parents and kids can operate from the same system instead of using separate tools for chores, routines, and rewards.",
      },
      {
        question: "What makes Roost different from a normal task manager?",
        answer:
          "A normal task manager is usually individual-first. Roost is household-first, which matters for shared routines, recurring chores, household reminders, meal planning, and kid allowance tracking.",
      },
    ],
    relatedPaths: [
      "/allowance-app-for-kids",
      "/shared-grocery-list-app",
      "/compare/cozi-vs-roost",
      "/guides/shared-grocery-list-for-families",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
  "shared-grocery-list-app": {
    slug: "shared-grocery-list-app",
    path: "/shared-grocery-list-app",
    title: "Shared Grocery List App for Families and Roommates",
    description:
      "Roost helps households maintain shared shopping lists, recurring staples, store-specific runs, and household visibility in one place.",
    heroTitle: "A shared grocery list app that the whole household can actually use.",
    heroDescription:
      "Roost helps families and roommates manage shared grocery lists without duplicate items, buried texts, or one person carrying all the shopping context for the house.",
    eyebrow: "Shared grocery lists",
    keywords: [
      "shared grocery list app",
      "family grocery list app",
      "roommate grocery list app",
      "collaborative shopping list app",
    ],
    intent: [
      "Keep one up-to-date list that everyone in the home can find.",
      "Avoid duplicate purchases and last-minute grocery texts.",
      "Connect shopping with the rest of household planning instead of treating it like a separate silo.",
    ],
    sections: [
      {
        title: "Why shared grocery lists break down",
        paragraphs: [
          "A grocery list usually fails because nobody knows which version is the real one. One person has notes on their phone, someone else sends a text, and a third person buys something that was already in the cart because they never saw the update.",
          "A shared grocery list app needs to make the list easy to find, easy to update, and visible to everyone involved in shopping for the household.",
        ],
      },
      {
        title: "How Roost makes grocery coordination easier",
        paragraphs: [
          "Roost gives households one place for shopping coordination. You can maintain recurring staples, build lists for different stores or trips, and let everyone see the same current state instead of rebuilding the list from memory every week.",
        ],
        bullets: [
          "Shared lists that more than one person can update.",
          "Visibility into who added what so context does not disappear.",
          "Support for different shopping runs like weekly groceries, Costco, or Target.",
          "A natural fit with meal planning and the rest of the household workflow.",
        ],
      },
      {
        title: "Why grocery lists work better inside a household app",
        paragraphs: [
          "Grocery planning is connected to everything else going on in the home. Families use it with meal planning. Roommates use it with expense splitting. Everyone uses it with reminders and weekly routines.",
          "When your list is in the same environment as meals, reminders, chores, and expenses, the handoffs get simpler and the house spends less time figuring out the plan.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Roost work for both families and roommates?",
        answer:
          "Yes. Families often use it for meal-linked shopping and recurring staples, while roommates use it for shared house items, common runs, and shared cost visibility.",
      },
      {
        question: "Is Roost just a grocery list app?",
        answer:
          "No. Grocery lists are one part of a broader household system that also includes chores, reminders, bills, calendars, meal planning, and more.",
      },
      {
        question: "Why would I use Roost instead of a notes app?",
        answer:
          "Notes apps are flexible, but they are not designed for household coordination. Roost gives grocery planning a shared, visible home that fits into the rest of household life.",
      },
    ],
    relatedPaths: [
      "/household-management-app",
      "/family-organizer-app",
      "/guides/shared-grocery-list-for-families",
      "/split-bills-for-roommates",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
  "split-bills-for-roommates": {
    slug: "split-bills-for-roommates",
    path: "/split-bills-for-roommates",
    title: "Split Bills for Roommates Without Losing Track",
    description:
      "Roost helps shared homes track expenses, balances, and household context in the same place they manage chores, lists, and reminders.",
    heroTitle: "Split bills for roommates without turning it into a monthly argument.",
    heroDescription:
      "Roost helps roommates keep shared expenses visible, track who owes what, and manage household logistics in one app instead of separating bills from the rest of house coordination.",
    eyebrow: "Roommate expenses",
    keywords: [
      "split bills for roommates",
      "roommate bill splitting app",
      "shared expense app for roommates",
      "split rent and utilities app",
    ],
    intent: [
      "Track shared costs without awkward follow-up messages.",
      "Keep balances visible inside the same app the house already uses for chores and groceries.",
      "Manage rent, utilities, grocery runs, and recurring bills with better household context.",
    ],
    sections: [
      {
        title: "What people really want when they search to split bills for roommates",
        paragraphs: [
          "Most people are not searching for bill splitting because they love finance tools. They are searching because the house needs a reliable record of who paid, who owes, and what still needs to be settled.",
          "Roost approaches expense tracking as part of the household workflow. Bills, groceries, and recurring home costs all happen inside the same shared living environment as chores and reminders.",
        ],
      },
      {
        title: "How Roost fits into shared home finances",
        paragraphs: [
          "Roost lets roommates log shared expenses, see balances, and keep a visible record of what is happening financially around the house. That works especially well when the same people also need a shared grocery list, reminders for recurring bills, and a place to track house responsibilities.",
        ],
        bullets: [
          "Track shared expenses in the same place the house coordinates everything else.",
          "Keep household balances visible instead of relying on memory or a chat thread.",
          "Handle recurring bills as part of recurring household life, not a one-off spreadsheet task.",
        ],
      },
      {
        title: "Why Roost can be stronger than a pure money app for shared homes",
        paragraphs: [
          "Some tools are excellent at pure expense tracking, but they stop at the money layer. Roost is useful for people who want the financial workflow connected to the rest of the house.",
          "That makes it a strong option for shared homes where bills are only one part of a larger coordination problem around chores, groceries, reminders, and routines.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Roost help with rent, utilities, and grocery runs?",
        answer:
          "Yes. Roost is designed for shared household expenses, which makes it useful for recurring bills and day-to-day shared costs inside the same home.",
      },
      {
        question: "Is Roost a replacement for dedicated bill splitting apps?",
        answer:
          "For households that mainly care about home coordination and shared living context, it can be a better fit because expenses sit alongside chores, groceries, reminders, and other household workflows.",
      },
      {
        question: "Does Roost work best for roommates or families?",
        answer:
          "The expense flow is especially strong for roommates and shared homes, but families can also benefit when they want one household system instead of separate tools.",
      },
    ],
    relatedPaths: [
      "/roommate-chore-app",
      "/shared-grocery-list-app",
      "/compare/splitwise-vs-roost",
      "/household-management-app",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
  "allowance-app-for-kids": {
    slug: "allowance-app-for-kids",
    path: "/allowance-app-for-kids",
    title: "Allowance App for Kids with Chores and Household Context",
    description:
      "Roost helps families connect chores and allowances in one shared household app so kids can see what they have earned and parents can tie rewards to real routines.",
    heroTitle: "An allowance app for kids that fits into the rest of family life.",
    heroDescription:
      "Roost helps families connect chores and allowances in one shared household app so kids can see what they have earned and parents can tie rewards to real routines instead of running a separate allowance system by hand.",
    eyebrow: "Allowances for kids",
    keywords: [
      "allowance app for kids",
      "kids allowance app",
      "chore and allowance app",
      "family allowance tracker",
    ],
    intent: [
      "Tie allowances to chores and household habits in one system.",
      "Let kids see progress without parents manually recalculating everything.",
      "Use allowances as part of a family organizer, not as an isolated money tool.",
    ],
    sections: [
      {
        title: "Why families look for an allowance app",
        paragraphs: [
          "Parents usually start looking for an allowance app when the existing system gets too manual. Rewards are being tracked in a notebook, a notes app, or memory, and it gets harder to tell what a child has earned and which chores count.",
          "An allowance app works best when it is connected to the actual household responsibilities kids are completing, not when it lives on its own in a separate tool.",
        ],
      },
      {
        title: "How Roost connects chores and rewards",
        paragraphs: [
          "Roost fits families that want chores, routines, and allowances to live in the same shared household system. Kids can see what responsibilities are assigned, parents can manage expectations in one place, and the allowance layer sits inside the broader family workflow.",
        ],
        bullets: [
          "Track household chores in the same environment as allowances.",
          "Give kids visibility into what they have done and what still matters.",
          "Reduce the amount of manual follow-up parents have to do.",
        ],
      },
      {
        title: "A better fit for families who need more than a reward chart",
        paragraphs: [
          "Some families want a simple reward tracker, but many also need reminders, calendars, grocery coordination, and meal planning. Roost gives those families room to grow.",
          "That makes Roost a strong option for parents who want one household system rather than one app for allowances, another for chores, and another for family organization.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is Roost only for families with young kids?",
        answer:
          "No. It can support younger children who are learning routines as well as older kids and teens who are taking on more visible household responsibilities.",
      },
      {
        question: "Does Roost replace a banking app for kids?",
        answer:
          "Roost is about household coordination and allowance tracking, not kid banking. It works best for families that want chores and allowances tied together inside daily home routines.",
      },
      {
        question: "Can parents use Roost for more than allowances?",
        answer:
          "Yes. Roost is a broader family organizer app with chores, reminders, calendars, grocery planning, meals, and shared household coordination.",
      },
    ],
    relatedPaths: [
      "/family-organizer-app",
      "/household-management-app",
      "/guides/how-to-organize-household-chores",
      "/compare/cozi-vs-roost",
    ],
    type: "solution",
    updatedAt: "2026-04-15",
  },
};
