type BadgeVariant = 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';

export interface TagCategory {
  name: string;
  color: BadgeVariant;
  tags: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    name: 'Meal',
    color: 'blue',
    tags: [
      'Appetizers / Starters',
      'Baking & Pastry',
      'Breakfast',
      'Brunch',
      'Desserts',
      'Drinks / Beverages',
      'Main Dishes',
      'Salads',
      'Sauces & Condiments',
      'Side Dishes',
      'Snacks',
      'Soups',
      'Dips',
      'Broths',
    ],
  },
  {
    name: 'Base',
    color: 'green',
    tags: [
      'Beef',
      'Bread/ Pita/ Sandwitch',
      'Cheese',
      'Chicken',
      'Chocolate',
      'Dairy',
      'Eggs',
      'Fish',
      'Fresh',
      'Lamb / Goat',
      'Legumes',
      'Mixed / Assorted',
      'Mushrooms',
      'Pasta',
      'Pork',
      'Rice & Grains',
      'Salad',
      'Seafood',
      'Tofu / Soy',
      'Turkey',
      'Vegetables',
      'Potatoes',
      'Pizza',
      'Bowls',
      'Seasonings/ Spices',
      'Pastry',
      'Dry Nuts',
    ],
  },
  {
    name: 'Duration',
    color: 'yellow',
    tags: [
      'Under 15 minutes',
      '15–30 minutes',
      '30–60 minutes',
      'Over 60 minutes',
    ],
  },
  {
    name: 'Country',
    color: 'purple',
    tags: [
      'Balkan',
      'Greek',
      'Turkish',
      'Spanish',
      'Italian',
      'French',
      'Portuguese',
      'German',
      'International',
      'Georgian',
      'Armenian',
      'Moroccan',
      'Egyptian',
      'Lebanese',
      'Iranian',
      'Indian',
      'Chinese',
      'Japanese',
      'Vietnamese',
      'Thai',
      'Chilean',
      'American',
      'Brazilian',
      'Peruvian',
      'Mexican',
    ],
  },
  {
    name: 'Store',
    color: 'orange',
    tags: [
      'Freezer-friendly',
      'Leftovers-friendly',
      'Make-ahead',
      'One-pot meals',
    ],
  },
  {
    name: 'Method',
    color: 'red',
    tags: [
      'Air fryer',
      'Baked',
      'Boiled',
      'Braised',
      'Fried',
      'Grilled',
      'Pan-fried',
      'Pressure cooker',
      'Raw / No-cook',
      'Roasted',
      'Slow-cooked',
      'Sous-vide',
      'Steamed',
      'Stewed',
    ],
  },
];

const tagToCategoryMap = new Map<string, TagCategory>();
for (const category of TAG_CATEGORIES) {
  for (const tag of category.tags) {
    tagToCategoryMap.set(tag.toLowerCase(), category);
  }
}

export function getCategoryForTag(tag: string): TagCategory | undefined {
  return tagToCategoryMap.get(tag.toLowerCase());
}

export const ALL_TAGS = TAG_CATEGORIES.flatMap((c) => c.tags);
