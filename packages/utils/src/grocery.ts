export const STORE_SECTIONS = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
] as const

export type StoreSection = (typeof STORE_SECTIONS)[number]

const SECTION_KEYWORDS: Record<StoreSection, string[]> = {
  Produce: [
    'apple', 'banana', 'orange', 'lettuce', 'spinach', 'tomato', 'onion',
    'garlic', 'potato', 'carrot', 'broccoli', 'pepper', 'cucumber', 'lemon',
    'lime', 'grape', 'strawberry', 'blueberry', 'avocado', 'zucchini', 'celery',
    'mushroom', 'kale', 'mango', 'pineapple', 'watermelon', 'peach', 'plum',
  ],
  Dairy: [
    'milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'sour cream',
    'cream cheese', 'cottage cheese', 'half and half', 'whipped cream',
  ],
  'Meat & Seafood': [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey',
    'steak', 'ground beef', 'bacon', 'sausage', 'ham', 'lamb', 'crab', 'lobster',
  ],
  Bakery: [
    'bread', 'bagel', 'muffin', 'croissant', 'bun', 'roll', 'tortilla',
    'pita', 'english muffin', 'sourdough',
  ],
  Frozen: [
    'frozen', 'ice cream', 'pizza', 'waffle', 'ice', 'peas', 'corn',
    'edamame', 'burrito', 'nugget',
  ],
  Pantry: [
    'pasta', 'rice', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'canned',
    'beans', 'lentils', 'oats', 'cereal', 'soup', 'broth', 'stock', 'noodle',
    'spaghetti', 'salt', 'pepper', 'spice', 'seasoning', 'honey', 'syrup',
    'jam', 'peanut butter', 'almond butter', 'nut', 'seed', 'crackers',
  ],
  Beverages: [
    'water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'kombucha',
    'sparkling', 'lemonade', 'gatorade', 'energy drink',
  ],
  Snacks: [
    'chips', 'popcorn', 'pretzel', 'granola', 'bar', 'cookie', 'chocolate',
    'candy', 'gummy', 'trail mix', 'jerky',
  ],
  Household: [
    'paper towel', 'toilet paper', 'trash bag', 'dish soap', 'laundry',
    'detergent', 'sponge', 'foil', 'wrap', 'ziploc', 'bag', 'bleach',
    'cleaner', 'wipe', 'napkin',
  ],
  'Personal Care': [
    'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant',
    'soap', 'lotion', 'razor', 'floss', 'mouthwash',
  ],
  Other: [],
}

export function classifyItem(name: string): StoreSection {
  const lower = name.toLowerCase()
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS) as [
    StoreSection,
    string[],
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) return section
  }
  return 'Other'
}

export function groupItemsBySection<T extends { name: string }>(
  items: T[],
): Record<StoreSection, T[]> {
  const groups = {} as Record<StoreSection, T[]>
  for (const section of STORE_SECTIONS) groups[section] = []
  for (const item of items) {
    const section = classifyItem(item.name)
    groups[section].push(item)
  }
  return groups
}
