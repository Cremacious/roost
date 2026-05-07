export const STORE_SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery & Bread',
  'Frozen',
  'Pantry & Dry Goods',
  'Canned & Jarred',
  'Snacks',
  'Beverages',
  'Breakfast',
  'Condiments & Sauces',
  'Cleaning & Household',
  'Personal Care',
  'Baby & Kids',
  'Pet',
  'Other',
] as const

export type StoreSection = (typeof STORE_SECTIONS)[number]

const SECTION_KEYWORDS: Record<StoreSection, string[]> = {
  Produce: [
    'apple','apples','banana','bananas','orange','oranges','lemon','lemons',
    'lime','limes','grape','grapes','strawberry','strawberries','blueberry',
    'blueberries','raspberry','raspberries','blackberry','blackberries','mango',
    'mangoes','pineapple','watermelon','cantaloupe','peach','peaches','pear',
    'pears','plum','plums','cherry','cherries','avocado','avocados',
    'tomato','tomatoes','cucumber','cucumbers','lettuce','spinach',
    'kale','arugula','cabbage','broccoli','cauliflower','carrot','carrots',
    'celery','onion','onions','garlic','potato','potatoes','sweet potato',
    'sweet potatoes','zucchini','squash','bell pepper','bell peppers','pepper',
    'peppers','jalapeño','jalapeno','mushroom','mushrooms','corn',
    'asparagus','green bean','green beans','pea','peas','edamame','beet','beets',
    'radish','radishes','artichoke','brussels sprout','brussels sprouts',
    'eggplant','ginger','herb','herbs','basil','cilantro','parsley','mint',
    'rosemary','thyme','sage','dill','chive','chives','scallion','scallions',
    'green onion','green onions','shallot','shallots','leek','leeks','produce',
    'fruit','vegetable','vegetables','fresh','salad','coleslaw',
  ],
  'Meat & Seafood': [
    'chicken','beef','pork','turkey','lamb','veal','duck','steak',
    'ground beef','ground turkey','ground pork','ground chicken',
    'chicken breast','chicken thigh','chicken thighs','chicken wing',
    'chicken wings','chicken leg','chicken legs','chicken drumstick',
    'ribeye','sirloin','brisket','ribs','pork chop','pork chops','bacon',
    'ham','sausage','sausages','salami','pepperoni','prosciutto','deli meat',
    'deli turkey','deli ham','hot dog','hot dogs','bratwurst','chorizo',
    'salmon','tuna','shrimp','cod','tilapia','halibut','mahi','crab',
    'lobster','scallop','scallops','clam','clams','mussel','mussels',
    'oyster','oysters','fish','seafood','meat','protein',
  ],
  'Dairy & Eggs': [
    'milk','whole milk','skim milk','almond milk','oat milk','soy milk',
    'coconut milk','cream','heavy cream','half and half','whipping cream',
    'sour cream','cream cheese','butter','margarine','ghee',
    'cheese','cheddar','mozzarella','parmesan','parmigiano','swiss',
    'brie','feta','gouda','goat cheese','ricotta','cottage cheese','string cheese',
    'american cheese','provolone','colby','monterey jack','pepper jack',
    'yogurt','greek yogurt','kefir','egg','eggs','egg whites','dairy','lactose',
  ],
  'Bakery & Bread': [
    'bread','white bread','wheat bread','sourdough','rye bread','pumpernickel',
    'baguette','ciabatta','focaccia','pita','pita bread','naan',
    'tortilla','tortillas','wrap','wraps','roll','rolls','dinner roll',
    'dinner rolls','hamburger bun','hamburger buns','hot dog bun','hot dog buns',
    'english muffin','english muffins','bagel','bagels','croissant','croissants',
    'muffin','muffins','donut','donuts','cake','cupcake','cupcakes','pie',
    'pastry','pastries','brownie','brownies','cookie','cookies',
    'cracker','crackers','bread crumbs','panko','pita chip','pita chips','bakery','loaf',
  ],
  Frozen: [
    'frozen','ice cream','gelato','sorbet','frozen yogurt','popsicle','popsicles',
    'frozen pizza','frozen meal','frozen meals','frozen dinner','frozen dinners',
    'frozen vegetable','frozen vegetables','frozen fruit','frozen berries',
    'frozen corn','frozen peas','frozen broccoli','frozen spinach','edamame frozen',
    'fish stick','fish sticks','chicken nugget','chicken nuggets','frozen chicken',
    'waffles','frozen waffles','waffle','french fry','french fries','fries',
    'tater tot','tater tots','hash brown','hash browns','frozen burrito',
    'frozen burritos','ice','ice pack',
  ],
  'Pantry & Dry Goods': [
    'pasta','spaghetti','penne','rigatoni','fettuccine','linguine','lasagna',
    'macaroni','orzo','noodle','noodles','ramen','rice','white rice','brown rice',
    'jasmine rice','basmati','quinoa','couscous','farro','barley','oats',
    'oatmeal','flour','all-purpose flour','bread flour','cornmeal','cornstarch',
    'baking soda','baking powder','yeast','sugar','brown sugar','powdered sugar',
    'honey','maple syrup','agave','vanilla','vanilla extract','cocoa','cocoa powder',
    'chocolate chips','oil','olive oil','vegetable oil','canola oil','coconut oil',
    'sesame oil','vinegar','apple cider vinegar','balsamic vinegar','red wine vinegar',
    'white vinegar','rice vinegar','salt','pepper','spice','spices',
    'seasoning','cumin','paprika','turmeric','cinnamon','chili powder',
    'garlic powder','onion powder','oregano','bay leaf','bay leaves','nutmeg',
    'curry','curry powder','garam masala','lentil','lentils','dried bean',
    'dried beans','chickpea','chickpeas','black bean','black beans',
    'kidney bean','kidney beans','pinto bean','pinto beans','split pea','split peas',
    'broth','stock','bouillon','bread crumb','bread crumbs',
  ],
  'Canned & Jarred': [
    'canned','can of','jar of','canned tomato','canned tomatoes','crushed tomato',
    'crushed tomatoes','diced tomato','diced tomatoes','tomato paste','tomato sauce',
    'tomato puree','marinara','canned tuna','canned salmon','canned chicken',
    'canned bean','canned beans','canned corn','canned pea','canned peas',
    'canned pumpkin','pumpkin puree','coconut cream','evaporated milk',
    'condensed milk','canned soup','soup can','chicken noodle','tomato soup',
    'pickle','pickles','olive','olives','capers','artichoke hearts',
    'roasted pepper','roasted peppers','salsa','peanut butter','almond butter',
    'nut butter','jelly','jam','preserves','nutella','tahini','hummus',
    'applesauce','fruit cup',
  ],
  Snacks: [
    'chip','chips','potato chip','potato chips','tortilla chip','tortilla chips',
    'dorito','doritos','cheeto','cheetos','lays','pringle','pringles',
    'popcorn','pretzel','pretzels','rice cake','rice cakes',
    'granola bar','granola bars','protein bar','protein bars','energy bar',
    'trail mix','nut','nuts','almond','almonds','cashew','cashews',
    'walnut','walnuts','pecan','pecans','pistachio','pistachios',
    'peanut','peanuts','mixed nuts','sunflower seed','sunflower seeds',
    'pumpkin seed','pumpkin seeds','pepita','pepitas','raisin','raisins',
    'dried fruit','jerky','beef jerky','fruit snack','fruit snacks',
    'gummy','gummies','candy','chocolate','candy bar','snack','snacks',
  ],
  Beverages: [
    'water','sparkling water','seltzer','la croix','topo chico','perrier',
    'juice','orange juice','apple juice','grape juice','cranberry juice',
    'lemonade','iced tea','tea','green tea','herbal tea','coffee','espresso',
    'cold brew','coffee beans','ground coffee','k-cup','k-cups',
    'soda','diet soda','coke','diet coke','pepsi','sprite','dr pepper',
    'ginger ale','root beer','sparkling','kombucha','sports drink','gatorade',
    'powerade','electrolyte','vitamin water','energy drink','red bull','monster',
    'beer','wine','white wine','red wine','champagne','prosecco','hard seltzer',
    'white claw','truly','cocktail','mixer','tonic','club soda','alcohol','liquor',
    'vodka','gin','rum','tequila','whiskey','bourbon','drink','drinks',
    'beverage','beverages','creamer','coffee creamer',
  ],
  Breakfast: [
    'cereal','granola','muesli','oatmeal packet','instant oatmeal',
    'pancake mix','waffle mix','pancake','syrup','pancake syrup',
    'breakfast bar','pop tart','pop tarts','toaster strudel',
    'breakfast sausage','breakfast sandwich',
  ],
  'Condiments & Sauces': [
    'ketchup','mustard','dijon','mayo','mayonnaise','hot sauce','tabasco',
    'sriracha','buffalo sauce','bbq sauce','barbecue sauce','steak sauce',
    'worcestershire','soy sauce','tamari','fish sauce','oyster sauce','hoisin',
    'teriyaki','sweet chili','ranch','caesar','italian dressing','vinaigrette',
    'dressing','salad dressing','relish','chutney','miso','gochujang',
    'harissa','aioli','pesto','tapenade','sauce','condiment','dip',
    'whipped cream','cool whip',
  ],
  'Cleaning & Household': [
    'dish soap','dishwasher pod','dishwasher pods','dishwasher detergent',
    'hand soap','soap','body wash','laundry detergent','fabric softener',
    'dryer sheet','dryer sheets','bleach','all-purpose cleaner','spray cleaner',
    'windex','bathroom cleaner','toilet cleaner','toilet bowl cleaner',
    'scrub','sponge','sponges','paper towel','paper towels',
    'toilet paper','toilet tissue','tp','tissue','kleenex','facial tissue',
    'trash bag','trash bags','garbage bag','garbage bags','zip bag','ziploc',
    'aluminum foil','plastic wrap','saran wrap','parchment paper','wax paper',
    'coffee filter','coffee filters','plastic bag','storage bag',
    'cleaning','cleaner','detergent','disinfectant','lysol','clorox',
    'candle','air freshener','febreze',
  ],
  'Personal Care': [
    'shampoo','conditioner','hair mask','hair oil','hair spray','dry shampoo',
    'face wash','cleanser','moisturizer','lotion','sunscreen','spf',
    'toothpaste','toothbrush','floss','mouthwash','deodorant','antiperspirant',
    'razor','razors','shaving cream','aftershave','cologne','perfume',
    'makeup','foundation','concealer','mascara','lipstick','lip balm','chapstick',
    'nail polish','nail file','cotton ball','cotton balls','q-tip','q-tips',
    'cotton swab','cotton swabs','bandaid','bandaids','band-aid','band-aids',
    'tylenol','advil','ibuprofen','acetaminophen','aspirin','medicine',
    'vitamin','vitamins','supplement','supplements','melatonin','probiotic',
    'probiotics','protein powder','personal care','hygiene',
  ],
  'Baby & Kids': [
    'diaper','diapers','wipe','wipes','baby wipe','baby wipes','baby food',
    'formula','baby formula','baby bottle','pacifier','baby lotion',
    'baby shampoo','baby wash','baby powder','toddler','kids snack','kids snacks',
    'juice box','juice boxes','capri sun','gogurt','lunchable',
  ],
  Pet: [
    'dog food','cat food','pet food','dog treat','dog treats','cat treat',
    'cat treats','pet treat','pet treats','dog toy','cat toy','pet toy',
    'cat litter','litter','pet shampoo','flea','heartworm','kibble',
    'wet food','dry food','fish food','bird seed','birdseed',
  ],
  Other: [],
}

export function classifyItem(name: string): StoreSection {
  const lower = name.toLowerCase().trim()
  for (const section of STORE_SECTIONS) {
    if (section === 'Other') continue
    for (const keyword of SECTION_KEYWORDS[section]) {
      if (
        lower === keyword ||
        lower.startsWith(keyword + ' ') ||
        lower.endsWith(' ' + keyword) ||
        lower.includes(' ' + keyword + ' ') ||
        lower.includes(keyword)
      ) {
        return section
      }
    }
  }
  return 'Other'
}

export interface GroupedItems<T> {
  section: StoreSection
  items: T[]
}

export function groupItemsBySection<T extends { name: string }>(items: T[]): GroupedItems<T>[] {
  const classified = items.map(item => ({ item, section: classifyItem(item.name) }))
  const groups = new Map<StoreSection, T[]>()
  for (const section of STORE_SECTIONS) {
    const sectionItems = classified.filter(c => c.section === section).map(c => c.item)
    if (sectionItems.length > 0) groups.set(section, sectionItems)
  }
  return Array.from(groups.entries()).map(([section, items]) => ({ section, items }))
}
