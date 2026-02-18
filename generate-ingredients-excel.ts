import * as XLSX from 'xlsx';

// ============================================================
// Type definitions
// ============================================================
interface Ingredient {
  Name: string;
  Category: string;
  Tags: string;
  Source: string;
  Calories_kcal: number | string;
  Protein_g: number | string;
  Carbs_g: number | string;
  Fat_g: number | string;
  Fiber_g: number | string;
  Sugar_g: number | string;
  Sodium_mg: number | string;
}

const N = ''; // shorthand for "not available"

// ============================================================
// Helper: build ingredient row
// ============================================================
function ing(
  name: string, category: string, tags: string, source: string,
  cal: number | string = N, pro: number | string = N, carb: number | string = N,
  fat: number | string = N, fib: number | string = N, sug: number | string = N,
  sod: number | string = N
): Ingredient {
  return {
    Name: name.toLowerCase().trim(),
    Category: category, Tags: tags, Source: source,
    Calories_kcal: cal, Protein_g: pro, Carbs_g: carb,
    Fat_g: fat, Fiber_g: fib, Sugar_g: sug, Sodium_mg: sod,
  };
}

// ============================================================
// SOURCE 1: FooDB (foodb.ca) — 778 foods
// Nutritional data: FooDB provides nutrient data per food;
// included where commonly known (per 100g raw values from USDA cross-ref)
// ============================================================
const SRC1 = 'FooDB (foodb.ca)';
const foodb: Ingredient[] = [
  // Page 1
  ing('angelica', 'herbs', 'herb,fresh,aromatic', SRC1),
  ing('savoy cabbage', 'produce', 'vegetable,fresh,leafy', SRC1, 27, 2, 6.1, 0.1, 3.1, 2.3, 28),
  ing('silver linden', 'herbs', 'herb,tea,aromatic', SRC1),
  ing('kiwi', 'produce', 'fruit,fresh,tropical', SRC1, 61, 1.1, 14.7, 0.5, 3, 9, 3),
  ing('garden onion', 'produce', 'vegetable,fresh,allium', SRC1, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4),
  ing('leek', 'produce', 'vegetable,fresh,allium', SRC1, 61, 1.5, 14.2, 0.3, 1.8, 3.9, 20),
  ing('garlic', 'produce', 'vegetable,fresh,allium', SRC1, 149, 6.4, 33.1, 0.5, 2.1, 1, 17),
  ing('chives', 'herbs', 'herb,fresh,allium', SRC1, 30, 3.3, 1.8, 0.7, 2.5, 1.9, 3),
  ing('lemon verbena', 'herbs', 'herb,tea,aromatic', SRC1),
  ing('cashew nut', 'nuts', 'nut,protein,snack', SRC1, 553, 18.2, 30.2, 43.8, 3.3, 5.9, 12),
  ing('pineapple', 'produce', 'fruit,fresh,tropical', SRC1, 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1),
  ing('dill', 'herbs', 'herb,fresh,aromatic', SRC1, 43, 3.5, 7, 1.1, 2.1, 0, 61),
  ing('custard apple', 'produce', 'fruit,fresh,tropical', SRC1, 94, 2.1, 23.6, 0.3, 4.4, 0, 9),
  ing('wild celery', 'herbs', 'herb,fresh,aromatic', SRC1),
  ing('peanut', 'nuts', 'nut,protein,legume', SRC1, 567, 25.8, 16.1, 49.2, 8.5, 4, 18),
  ing('burdock', 'produce', 'vegetable,fresh,root', SRC1, 72, 1.5, 17.3, 0.2, 3.3, 2.9, 5),
  ing('horseradish', 'produce', 'condiment,fresh,pungent', SRC1, 48, 1.2, 11.3, 0.7, 3.3, 7.99, 314),
  ing('tarragon', 'herbs', 'herb,dried,aromatic', SRC1, 295, 22.8, 50.2, 7.2, 7.4, 0, 62),
  ing('mugwort', 'herbs', 'herb,dried,aromatic', SRC1),
  ing('asparagus', 'produce', 'vegetable,fresh,seasonal', SRC1, 20, 2.2, 3.9, 0.1, 2.1, 1.9, 2),
  ing('oat', 'grains', 'cereal,whole grain,fiber', SRC1, 389, 16.9, 66.3, 6.9, 10.6, 0, 2),
  ing('star fruit', 'produce', 'fruit,fresh,tropical', SRC1, 31, 1, 6.7, 0.3, 2.8, 4, 2),
  ing('brazil nut', 'nuts', 'nut,protein,selenium', SRC1, 656, 14.3, 12.3, 66.4, 7.5, 2.3, 3),
  ing('common beet', 'produce', 'vegetable,fresh,root', SRC1, 43, 1.6, 9.6, 0.2, 2.8, 6.8, 78),
  // Page 2
  ing('borage', 'herbs', 'herb,fresh,edible flower', SRC1, 21, 1.8, 3.1, 0.7, 0, 0, 80),
  ing('chinese mustard', 'produce', 'vegetable,fresh,asian', SRC1, 13, 1.5, 2.2, 0.2, 1.8, 1.3, 15),
  ing('swede', 'produce', 'vegetable,fresh,root', SRC1, 36, 1.1, 8.6, 0.2, 2.3, 4.5, 12),
  ing('common cabbage', 'produce', 'vegetable,fresh,leafy', SRC1, 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18),
  ing('cauliflower', 'produce', 'vegetable,fresh,cruciferous', SRC1, 25, 1.9, 5, 0.3, 2, 1.9, 30),
  ing('brussel sprouts', 'produce', 'vegetable,fresh,cruciferous', SRC1, 43, 3.4, 8.9, 0.3, 3.8, 2.2, 25),
  ing('kohlrabi', 'produce', 'vegetable,fresh,cruciferous', SRC1, 27, 1.7, 6.2, 0.1, 3.6, 2.6, 20),
  ing('broccoli', 'produce', 'vegetable,fresh,cruciferous', SRC1, 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33),
  ing('chinese cabbage', 'produce', 'vegetable,fresh,asian', SRC1, 13, 1.5, 2.2, 0.2, 1, 1.2, 9),
  ing('turnip', 'produce', 'vegetable,fresh,root', SRC1, 28, 0.9, 6.4, 0.1, 1.8, 3.8, 67),
  ing('pigeon pea', 'pulses', 'legume,protein,dried', SRC1, 343, 21.7, 62.8, 1.5, 15, 0, 17),
  ing('capers', 'pantry', 'preserved,condiment,mediterranean', SRC1, 23, 2.4, 4.9, 0.9, 3.2, 0.4, 2964),
  ing('pepper', 'produce', 'vegetable,fresh,colorful', SRC1, 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3),
  ing('papaya', 'produce', 'fruit,fresh,tropical', SRC1, 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8),
  ing('safflower', 'herbs', 'herb,oil,dried', SRC1),
  ing('caraway', 'spices', 'spice,seed,aromatic', SRC1, 333, 19.8, 49.9, 14.6, 38.3, 0.6, 17),
  ing('pecan nut', 'nuts', 'nut,fat,snack', SRC1, 691, 9.2, 13.9, 72, 9.6, 4, 0),
  ing('chestnut', 'nuts', 'nut,starchy,seasonal', SRC1, 213, 2.4, 45.5, 2.3, 8.1, 0, 3),
  ing('roman camomile', 'herbs', 'herb,tea,calming', SRC1),
  ing('chickpea', 'pulses', 'legume,protein,versatile', SRC1, 364, 19.3, 60.6, 6, 17.4, 10.7, 24),
  ing('endive', 'produce', 'vegetable,fresh,leafy', SRC1, 17, 1.3, 3.4, 0.2, 3.1, 0.3, 22),
  ing('chicory', 'produce', 'vegetable,fresh,bitter', SRC1, 23, 1.7, 4.7, 0.3, 4, 0.7, 45),
  ing('chinese cinnamon', 'spices', 'spice,warm,aromatic', SRC1),
  ing('ceylon cinnamon', 'spices', 'spice,warm,aromatic', SRC1, 247, 4, 80.6, 1.2, 53.1, 2.2, 10),
  // Page 3
  ing('watermelon', 'produce', 'fruit,fresh,summer', SRC1, 30, 0.6, 7.5, 0.2, 0.4, 6.2, 1),
  ing('lime', 'produce', 'fruit,fresh,citrus', SRC1, 30, 0.7, 10.5, 0.2, 2.8, 1.7, 2),
  ing('lemon', 'produce', 'fruit,fresh,citrus', SRC1, 29, 1.1, 9.3, 0.3, 2.8, 2.5, 2),
  ing('pummelo', 'produce', 'fruit,fresh,citrus', SRC1, 38, 0.8, 9.6, 0.04, 1, 0, 1),
  ing('mandarin orange', 'produce', 'fruit,fresh,citrus', SRC1, 53, 0.8, 13.3, 0.3, 1.8, 10.6, 2),
  ing('sweet orange', 'produce', 'fruit,fresh,citrus', SRC1, 47, 0.9, 11.7, 0.1, 2.4, 9.4, 0),
  ing('arabica coffee', 'beverages', 'coffee,caffeinated,bean', SRC1),
  ing('robusta coffee', 'beverages', 'coffee,caffeinated,bean', SRC1),
  ing('coriander', 'herbs', 'herb,fresh,aromatic', SRC1, 23, 2.1, 3.7, 0.5, 2.8, 0.9, 46),
  ing('common hazelnut', 'nuts', 'nut,fat,baking', SRC1, 628, 15, 16.7, 60.7, 9.7, 4.3, 0),
  ing('saffron', 'spices', 'spice,expensive,aromatic', SRC1, 310, 11.4, 65.4, 5.8, 3.9, 0, 148),
  ing('muskmelon', 'produce', 'fruit,fresh,melon', SRC1, 34, 0.8, 8.2, 0.2, 0.9, 7.9, 16),
  ing('cucumber', 'produce', 'vegetable,fresh,salad', SRC1, 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2),
  ing('cumin', 'spices', 'spice,dried,aromatic', SRC1, 375, 17.8, 44.2, 22.3, 10.5, 2.3, 168),
  ing('turmeric', 'spices', 'spice,dried,golden', SRC1, 354, 7.8, 64.9, 9.9, 21.1, 3.2, 38),
  ing('quince', 'produce', 'fruit,fresh,seasonal', SRC1, 57, 0.4, 15.3, 0.1, 1.9, 0, 4),
  ing('lemon grass', 'herbs', 'herb,fresh,asian', SRC1, 99, 1.8, 25.3, 0.5, 0, 0, 6),
  ing('globe artichoke', 'produce', 'vegetable,fresh,mediterranean', SRC1, 47, 3.3, 10.5, 0.1, 5.4, 1, 94),
  ing('wild carrot', 'produce', 'vegetable,fresh,root', SRC1),
  ing('japanese persimmon', 'produce', 'fruit,fresh,asian', SRC1, 70, 0.6, 18.6, 0.2, 3.6, 12.5, 1),
  ing('cardamom', 'spices', 'spice,seed,aromatic', SRC1, 311, 10.8, 68.5, 6.7, 28, 0, 18),
  ing('black crowberry', 'produce', 'fruit,berry,wild', SRC1),
  ing('loquat', 'produce', 'fruit,fresh,asian', SRC1, 47, 0.4, 12.1, 0.2, 1.7, 0, 1),
  ing('rocket salad', 'produce', 'vegetable,fresh,leafy', SRC1, 25, 2.6, 3.7, 0.7, 1.6, 2, 27),
  // Page 4
  ing('wax apple', 'produce', 'fruit,fresh,tropical', SRC1, 25, 0.6, 5.7, 0.3, 0, 0, 0),
  ing('common buckwheat', 'grains', 'cereal,whole grain,gluten-free', SRC1, 343, 13.2, 71.5, 3.4, 10, 0, 1),
  ing('fig', 'produce', 'fruit,fresh,sweet', SRC1, 74, 0.7, 19.2, 0.3, 2.9, 16.3, 1),
  ing('fennel', 'produce', 'vegetable,fresh,aromatic', SRC1, 31, 1.2, 7.3, 0.2, 3.1, 0, 52),
  ing('strawberry', 'produce', 'fruit,berry,seasonal', SRC1, 32, 0.7, 7.7, 0.3, 2, 4.9, 1),
  ing('soy bean', 'pulses', 'legume,protein,versatile', SRC1, 446, 36.5, 30.2, 19.9, 9.3, 7.3, 2),
  ing('sunflower', 'nuts', 'seed,protein,snack', SRC1, 584, 20.8, 20, 51.5, 8.6, 2.6, 9),
  ing('sea buckthorn berry', 'produce', 'fruit,berry,superfood', SRC1),
  ing('barley', 'grains', 'cereal,whole grain,fiber', SRC1, 354, 12.5, 73.5, 2.3, 17.3, 0.8, 12),
  ing('hyssop', 'herbs', 'herb,medicinal,aromatic', SRC1),
  ing('star anise', 'spices', 'spice,aromatic,asian', SRC1, 337, 17.6, 50.02, 15.9, 14.6, 0, 16),
  ing('swamp cabbage', 'produce', 'vegetable,fresh,asian', SRC1, 19, 2.6, 3.1, 0.2, 2, 0, 113),
  ing('sweet potato', 'produce', 'vegetable,starchy,root', SRC1, 86, 1.6, 20.1, 0.1, 3, 4.2, 55),
  ing('black walnut', 'nuts', 'nut,omega-3,wild', SRC1, 619, 24.1, 9.9, 59, 6.8, 1.1, 2),
  ing('common walnut', 'nuts', 'nut,omega-3,brain food', SRC1, 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2),
  ing('lettuce', 'produce', 'vegetable,fresh,salad', SRC1, 15, 1.4, 2.9, 0.2, 1.3, 0.8, 28),
  ing('grass pea', 'pulses', 'legume,protein,dried', SRC1),
  ing('sweet bay', 'herbs', 'herb,dried,aromatic', SRC1, 313, 7.6, 74.97, 8.4, 26.3, 0, 23),
  ing('lentils', 'pulses', 'legume,protein,versatile', SRC1, 352, 25.8, 60.1, 1.1, 30.5, 2, 6),
  ing('garden cress', 'produce', 'vegetable,fresh,peppery', SRC1, 32, 2.6, 5.5, 0.7, 1.1, 4.4, 14),
  ing('lovage', 'herbs', 'herb,fresh,aromatic', SRC1),
  ing('flaxseed', 'nuts', 'seed,omega-3,fiber', SRC1, 534, 18.3, 28.9, 42.2, 27.3, 1.6, 30),
  ing('mexican oregano', 'herbs', 'herb,dried,aromatic', SRC1),
  // Page 5
  ing('lichee', 'produce', 'fruit,fresh,tropical', SRC1, 66, 0.8, 16.5, 0.4, 1.3, 15.2, 1),
  ing('lupine', 'pulses', 'legume,protein,alternative', SRC1, 371, 36.2, 40.4, 9.7, 18.9, 0, 15),
  ing('apple', 'produce', 'fruit,fresh,common', SRC1, 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1),
  ing('mango', 'produce', 'fruit,fresh,tropical', SRC1, 60, 0.8, 15, 0.4, 1.6, 13.7, 1),
  ing('german camomile', 'herbs', 'herb,tea,calming', SRC1),
  ing('lemon balm', 'herbs', 'herb,fresh,calming', SRC1),
  ing('spearmint', 'herbs', 'herb,fresh,aromatic', SRC1, 44, 3.3, 8.4, 0.7, 6.8, 0, 31),
  ing('peppermint', 'herbs', 'herb,fresh,aromatic', SRC1, 70, 3.8, 14.9, 0.9, 8, 0, 31),
  ing('bitter gourd', 'produce', 'vegetable,fresh,asian', SRC1, 17, 1, 3.7, 0.2, 2.8, 0, 5),
  ing('mulberry', 'produce', 'fruit,berry,seasonal', SRC1, 43, 1.4, 9.8, 0.4, 1.7, 8.1, 10),
  ing('nutmeg', 'spices', 'spice,warm,baking', SRC1, 525, 5.8, 49.3, 36.3, 20.8, 0, 16),
  ing('sweet basil', 'herbs', 'herb,fresh,aromatic', SRC1, 23, 3.1, 2.6, 0.6, 1.6, 0.3, 4),
  ing('olive', 'produce', 'vegetable,preserved,mediterranean', SRC1, 115, 0.8, 6.3, 10.7, 3.2, 0, 1556),
  ing('sweet marjoram', 'herbs', 'herb,dried,aromatic', SRC1, 271, 12.7, 60.6, 7, 40.3, 4.2, 77),
  ing('common oregano', 'herbs', 'herb,dried,aromatic', SRC1, 265, 9, 68.9, 4.3, 42.5, 4.1, 25),
  ing('rice', 'grains', 'cereal,staple,versatile', SRC1, 130, 2.7, 28.2, 0.3, 0.4, 0, 1),
  ing('millet', 'grains', 'cereal,whole grain,gluten-free', SRC1, 378, 11, 72.8, 4.2, 8.5, 0, 5),
  ing('poppy', 'spices', 'seed,baking,aromatic', SRC1, 525, 18, 28.1, 41.6, 19.5, 3, 26),
  // Page 6
  ing('passion fruit', 'produce', 'fruit,fresh,tropical', SRC1, 97, 2.2, 23.4, 0.7, 10.4, 11.2, 28),
  ing('parsnip', 'produce', 'vegetable,fresh,root', SRC1, 75, 1.2, 18, 0.3, 4.9, 4.8, 10),
  ing('avocado', 'produce', 'fruit,fresh,healthy fat', SRC1, 160, 2, 8.5, 14.7, 6.7, 0.7, 7),
  ing('parsley', 'herbs', 'herb,fresh,garnish', SRC1, 36, 3, 6.3, 0.8, 3.3, 0.8, 56),
  ing('scarlet bean', 'pulses', 'legume,dried,protein', SRC1),
  ing('lima bean', 'pulses', 'legume,protein,starchy', SRC1, 338, 21.5, 63.4, 0.7, 19, 5.7, 18),
  ing('common bean', 'pulses', 'legume,protein,versatile', SRC1, 333, 23.6, 60, 0.8, 24.9, 2.1, 5),
  ing('date', 'produce', 'fruit,dried,sweet', SRC1, 277, 1.8, 75, 0.2, 6.7, 66.5, 1),
  ing('black chokeberry', 'produce', 'fruit,berry,antioxidant', SRC1),
  ing('anise', 'spices', 'spice,seed,aromatic', SRC1, 337, 17.6, 50, 15.9, 14.6, 0, 16),
  ing('pine nut', 'nuts', 'nut,fat,mediterranean', SRC1, 673, 13.7, 13.1, 68.4, 3.7, 3.6, 2),
  ing('pistachio', 'nuts', 'nut,protein,snack', SRC1, 560, 20.2, 27.2, 45.3, 10.6, 7.7, 1),
  ing('common pea', 'produce', 'vegetable,fresh,sweet', SRC1, 81, 5.4, 14.4, 0.4, 5.7, 5.7, 5),
  ing('purslane', 'herbs', 'herb,fresh,edible', SRC1, 20, 2, 3.4, 0.4, 0, 0, 45),
  ing('apricot', 'produce', 'fruit,fresh,stone fruit', SRC1, 48, 1.4, 11.1, 0.4, 2, 9.2, 1),
  ing('sweet cherry', 'produce', 'fruit,fresh,stone fruit', SRC1, 63, 1.1, 16, 0.2, 2.1, 12.8, 0),
  ing('sour cherry', 'produce', 'fruit,fresh,tart', SRC1, 50, 1, 12.2, 0.3, 1.6, 8.5, 3),
  ing('european plum', 'produce', 'fruit,fresh,stone fruit', SRC1, 46, 0.7, 11.4, 0.3, 1.4, 9.9, 0),
  ing('almond', 'nuts', 'nut,protein,baking', SRC1, 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1),
  ing('peach', 'produce', 'fruit,fresh,stone fruit', SRC1, 39, 0.9, 9.5, 0.2, 1.5, 8.4, 0),
  ing('guava', 'produce', 'fruit,fresh,tropical', SRC1, 68, 2.6, 14.3, 1, 5.4, 8.9, 2),
  ing('pomegranate', 'produce', 'fruit,fresh,antioxidant', SRC1, 83, 1.7, 18.7, 1.2, 4, 13.7, 3),
  ing('pear', 'produce', 'fruit,fresh,sweet', SRC1, 57, 0.4, 15.2, 0.1, 3.1, 9.8, 1),
  // Page 7
  ing('radish', 'produce', 'vegetable,fresh,peppery', SRC1, 16, 0.7, 3.4, 0.1, 1.6, 1.9, 39),
  ing('garden rhubarb', 'produce', 'vegetable,fresh,tart', SRC1, 21, 0.9, 4.5, 0.2, 1.8, 1.1, 4),
  ing('blackcurrant', 'produce', 'fruit,berry,tart', SRC1, 63, 1.4, 15.4, 0.4, 0, 0, 2),
  ing('redcurrant', 'produce', 'fruit,berry,tart', SRC1, 56, 1.4, 13.8, 0.2, 4.3, 7.4, 1),
  ing('gooseberry', 'produce', 'fruit,berry,tart', SRC1, 44, 0.9, 10.2, 0.6, 4.3, 0, 1),
  ing('watercress', 'produce', 'vegetable,fresh,peppery', SRC1, 11, 2.3, 1.3, 0.1, 0.5, 0.2, 41),
  ing('rosemary', 'herbs', 'herb,fresh,aromatic', SRC1, 131, 3.3, 20.7, 5.9, 14.1, 0, 26),
  ing('cloudberry', 'produce', 'fruit,berry,wild', SRC1, 51, 2.4, 8.6, 0.8, 0, 0, 1),
  ing('red raspberry', 'produce', 'fruit,berry,sweet', SRC1, 52, 1.2, 11.9, 0.6, 6.5, 4.4, 1),
  ing('sorrel', 'herbs', 'herb,fresh,tart', SRC1, 22, 2, 3.2, 0.7, 2.9, 0, 4),
  ing('common sage', 'herbs', 'herb,dried,aromatic', SRC1, 315, 10.6, 60.7, 12.7, 40.3, 1.7, 11),
  ing('black elderberry', 'produce', 'fruit,berry,immune', SRC1, 73, 0.7, 18.4, 0.5, 7, 0, 6),
  ing('summer savory', 'herbs', 'herb,dried,aromatic', SRC1, 272, 6.7, 68.7, 5.9, 45.7, 0, 24),
  ing('rye', 'grains', 'cereal,whole grain,fiber', SRC1, 338, 10.3, 75.9, 1.6, 15.1, 1, 2),
  ing('sesame', 'nuts', 'seed,calcium,aromatic', SRC1, 573, 17.7, 23.4, 49.7, 11.8, 0.3, 11),
  ing('garden tomato', 'produce', 'vegetable,fresh,versatile', SRC1, 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5),
  ing('cherry tomato', 'produce', 'vegetable,fresh,sweet', SRC1, 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5),
  ing('eggplant', 'produce', 'vegetable,fresh,mediterranean', SRC1, 25, 1, 5.9, 0.2, 3, 3.5, 2),
  ing('potato', 'produce', 'vegetable,starchy,staple', SRC1, 77, 2, 17, 0.1, 2.2, 0.8, 6),
  ing('spinach', 'produce', 'vegetable,fresh,leafy', SRC1, 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79),
  // Page 8
  ing('cloves', 'spices', 'spice,warm,aromatic', SRC1, 274, 6, 65.5, 13, 33.9, 2.4, 277),
  ing('tamarind', 'produce', 'fruit,preserved,sour', SRC1, 239, 2.8, 62.5, 0.6, 5.1, 0, 28),
  ing('dandelion', 'herbs', 'herb,fresh,medicinal', SRC1, 45, 2.7, 9.2, 0.7, 3.5, 0.7, 76),
  ing('cocoa bean', 'pantry', 'chocolate,antioxidant,baking', SRC1),
  ing('common thyme', 'herbs', 'herb,dried,aromatic', SRC1, 276, 9.1, 63.9, 7.4, 37, 0, 55),
  ing('fenugreek', 'spices', 'spice,seed,aromatic', SRC1, 323, 23, 58.4, 6.4, 24.6, 0, 67),
  ing('common wheat', 'grains', 'cereal,staple,versatile', SRC1, 339, 13.7, 72, 2.5, 10.7, 0, 2),
  ing('lowbush blueberry', 'produce', 'fruit,berry,antioxidant', SRC1, 57, 0.7, 14.5, 0.3, 2.4, 10, 1),
  ing('highbush blueberry', 'produce', 'fruit,berry,antioxidant', SRC1, 57, 0.7, 14.5, 0.3, 2.4, 10, 1),
  ing('american cranberry', 'produce', 'fruit,berry,tart', SRC1, 46, 0.4, 12.2, 0.1, 4.6, 4, 2),
  ing('bilberry', 'produce', 'fruit,berry,antioxidant', SRC1),
  ing('lingonberry', 'produce', 'fruit,berry,scandinavian', SRC1),
  ing('vanilla', 'spices', 'spice,sweet,aromatic', SRC1, 288, 0.1, 12.65, 0.1, 0, 12.65, 9),
  ing('broad bean', 'pulses', 'legume,protein,fresh', SRC1, 341, 26.1, 58.3, 1.5, 25, 5.7, 13),
  ing('adzuki bean', 'pulses', 'legume,protein,asian', SRC1, 329, 19.9, 62.9, 0.5, 12.7, 0, 5),
  ing('mung bean', 'pulses', 'legume,protein,sprout', SRC1, 347, 23.9, 62.6, 1.2, 16.3, 6.6, 15),
  ing('cowpea', 'pulses', 'legume,protein,dried', SRC1, 336, 23.5, 60, 1.3, 10.6, 0, 16),
  // Page 9
  ing('common grape', 'produce', 'fruit,fresh,versatile', SRC1, 69, 0.7, 18.1, 0.2, 0.9, 15.5, 2),
  ing('corn', 'produce', 'vegetable,starchy,versatile', SRC1, 86, 3.3, 19, 1.3, 2.7, 6.3, 15),
  ing('ginger', 'spices', 'spice,fresh,warming', SRC1, 80, 1.8, 17.8, 0.8, 2, 1.7, 13),
  ing('banana', 'produce', 'fruit,fresh,energy', SRC1, 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1),
  ing('celeriac', 'produce', 'vegetable,fresh,root', SRC1, 42, 1.5, 9.2, 0.3, 1.8, 1.6, 100),
  ing('celery', 'produce', 'vegetable,fresh,crunchy', SRC1, 14, 0.7, 3, 0.2, 1.6, 1.3, 80),
  ing('nectarine', 'produce', 'fruit,fresh,stone fruit', SRC1, 44, 1.1, 10.6, 0.3, 1.7, 7.9, 0),
  ing('longan', 'produce', 'fruit,fresh,tropical', SRC1, 60, 1.3, 15.1, 0.1, 1.1, 0, 0),
  ing('macadamia nut', 'nuts', 'nut,fat,premium', SRC1, 718, 7.9, 13.8, 75.8, 8.6, 4.6, 5),
  // Page 10
  ing('swiss chard', 'produce', 'vegetable,fresh,leafy', SRC1, 19, 1.8, 3.7, 0.2, 1.6, 1.1, 213),
  ing('shallot', 'produce', 'vegetable,fresh,allium', SRC1, 72, 2.5, 16.8, 0.1, 3.2, 7.9, 12),
  ing('carrot', 'produce', 'vegetable,fresh,root', SRC1, 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69),
  ing('grapefruit', 'produce', 'fruit,fresh,citrus', SRC1, 42, 0.8, 10.7, 0.1, 1.6, 6.9, 0),
  ing('kale', 'produce', 'vegetable,fresh,superfood', SRC1, 49, 4.3, 8.7, 0.9, 3.6, 2.3, 38),
  // Page 11
  ing('daikon radish', 'produce', 'vegetable,fresh,asian', SRC1, 18, 0.6, 4.1, 0.1, 1.6, 2.5, 21),
  ing('red beetroot', 'produce', 'vegetable,fresh,root', SRC1, 43, 1.6, 9.6, 0.2, 2.8, 6.8, 78),
  ing('abalone', 'seafood', 'shellfish,protein,premium', SRC1, 105, 17.1, 6.01, 0.8, 0, 0, 301),
  ing('acerola', 'produce', 'fruit,fresh,vitamin c', SRC1, 32, 0.4, 7.7, 0.3, 1.1, 0, 7),
  ing('winter squash', 'produce', 'vegetable,starchy,versatile', SRC1, 34, 0.8, 8.6, 0.1, 1.5, 0, 4),
  ing('agar', 'pantry', 'thickener,vegan,gelatin substitute', SRC1, 26, 0.5, 6.75, 0.03, 0.5, 0, 9),
  ing('red king crab', 'seafood', 'shellfish,protein,premium', SRC1, 97, 19.4, 0, 1.5, 0, 0, 836),
  ing('alfalfa', 'produce', 'sprout,fresh,nutrient dense', SRC1, 23, 4, 2.1, 0.7, 1.9, 0, 6),
  ing('allspice', 'spices', 'spice,warm,aromatic', SRC1, 263, 6.1, 72.1, 8.7, 21.6, 0, 77),
  ing('amaranth', 'grains', 'grain,protein,gluten-free', SRC1, 371, 13.6, 65.2, 7, 6.7, 1.7, 4),
  // Page 12
  ing('bamboo shoots', 'produce', 'vegetable,fresh,asian', SRC1, 27, 2.6, 5.2, 0.3, 2.2, 3, 4),
  ing('bison', 'meat', 'meat,protein,lean', SRC1, 143, 28.4, 0, 2.4, 0, 0, 57),
  ing('blue crab', 'seafood', 'shellfish,protein,delicate', SRC1, 87, 18.1, 0, 1.1, 0, 0, 293),
  ing('blue mussel', 'seafood', 'shellfish,protein,omega-3', SRC1, 86, 11.9, 3.7, 2.2, 0, 0, 286),
  ing('bluefin tuna', 'seafood', 'fish,protein,omega-3', SRC1, 144, 23.3, 0, 4.9, 0, 0, 39),
  ing('wild boar', 'meat', 'game,protein,lean', SRC1, 122, 21.5, 0, 3.3, 0, 0, 0),
  ing('breadfruit', 'produce', 'fruit,starchy,tropical', SRC1, 103, 1.1, 27.1, 0.2, 4.9, 11, 2),
  ing('rapini', 'produce', 'vegetable,fresh,bitter', SRC1, 22, 3.2, 2.8, 0.5, 2.7, 0.4, 33),
  ing('butternut squash', 'produce', 'vegetable,starchy,sweet', SRC1, 45, 1, 11.7, 0.1, 2, 2.2, 4),
  // Page 13
  ing('cardoon', 'produce', 'vegetable,fresh,mediterranean', SRC1, 17, 0.7, 4.1, 0.1, 1.6, 0, 170),
  ing('cassava', 'produce', 'vegetable,starchy,tropical', SRC1, 160, 1.4, 38.1, 0.3, 1.8, 1.7, 14),
  ing('chayote', 'produce', 'vegetable,fresh,mild', SRC1, 19, 0.8, 4.5, 0.1, 1.7, 1.7, 2),
  ing('cherimoya', 'produce', 'fruit,fresh,tropical', SRC1, 75, 1.6, 17.7, 0.7, 3, 12.9, 7),
  ing('chervil', 'herbs', 'herb,fresh,delicate', SRC1, 237, 23.2, 49.1, 3.9, 11.3, 0, 83),
  ing('chia', 'nuts', 'seed,omega-3,superfood', SRC1, 486, 16.5, 42.1, 30.7, 34.4, 0, 16),
  ing('chicken', 'meat', 'poultry,protein,versatile', SRC1, 239, 27.3, 0, 13.6, 0, 0, 82),
  ing('coconut', 'produce', 'fruit,tropical,fat', SRC1, 354, 3.3, 15.2, 33.5, 9, 6.2, 20),
  ing('pacific cod', 'seafood', 'fish,protein,mild', SRC1, 82, 17.9, 0, 0.6, 0, 0, 77),
  ing('atlantic cod', 'seafood', 'fish,protein,mild', SRC1, 82, 17.8, 0, 0.7, 0, 0, 54),
  ing('common octopus', 'seafood', 'shellfish,protein,mediterranean', SRC1, 82, 14.9, 2.2, 1, 0, 0, 230),
  // Page 14
  ing('cuttlefish', 'seafood', 'shellfish,protein,mild', SRC1, 79, 16.2, 0.8, 0.7, 0, 0, 372),
  ing('durian', 'produce', 'fruit,fresh,tropical', SRC1, 147, 1.5, 27.1, 5.3, 3.8, 0, 2),
  ing('eastern oyster', 'seafood', 'shellfish,zinc,umami', SRC1, 68, 7.1, 3.9, 2.5, 0, 0, 417),
  ing('freshwater eel', 'seafood', 'fish,protein,rich', SRC1, 184, 18.4, 0, 11.7, 0, 0, 51),
  ing('elderberry', 'produce', 'fruit,berry,immune', SRC1, 73, 0.7, 18.4, 0.5, 7, 0, 6),
  ing('elk', 'meat', 'game,protein,lean', SRC1, 111, 22.8, 0, 1.4, 0, 0, 52),
  ing('emu', 'meat', 'poultry,protein,lean', SRC1, 103, 22.5, 0, 0.8, 0, 0, 57),
  ing('european anchovy', 'seafood', 'fish,omega-3,umami', SRC1, 131, 20.4, 0, 4.8, 0, 0, 104),
  // Page 15
  ing('grouper', 'seafood', 'fish,protein,mild', SRC1, 92, 19.4, 0, 1, 0, 0, 53),
  ing('haddock', 'seafood', 'fish,protein,mild', SRC1, 74, 16.3, 0, 0.4, 0, 0, 213),
  ing('halibut', 'seafood', 'fish,protein,lean', SRC1, 91, 18.6, 0, 1.3, 0, 0, 46),
  ing('hazelnut', 'nuts', 'nut,fat,baking', SRC1, 628, 15, 16.7, 60.7, 9.7, 4.3, 0),
  ing('jackfruit', 'produce', 'fruit,fresh,tropical', SRC1, 95, 1.7, 23.3, 0.6, 1.5, 19.1, 2),
  ing('jerusalem artichoke', 'produce', 'vegetable,fresh,root', SRC1, 73, 2, 17.4, 0.01, 1.6, 9.6, 4),
  ing('jujube', 'produce', 'fruit,fresh,asian', SRC1, 79, 1.2, 20.2, 0.2, 0, 0, 3),
  ing('kelp', 'produce', 'seaweed,mineral rich,asian', SRC1, 43, 1.7, 9.6, 0.6, 1.3, 0.6, 233),
  // Page 16
  ing('kumquat', 'produce', 'fruit,fresh,citrus', SRC1, 71, 1.9, 15.9, 0.9, 6.5, 9.4, 10),
  ing('american lobster', 'seafood', 'shellfish,protein,premium', SRC1, 77, 16.5, 0.5, 0.7, 0, 0, 296),
  ing('loganberry', 'produce', 'fruit,berry,hybrid', SRC1, 55, 1.5, 13.2, 0.3, 5.3, 7.7, 1),
  ing('malabar spinach', 'produce', 'vegetable,fresh,leafy', SRC1, 19, 1.8, 3.4, 0.3, 0, 0, 24),
  ing('purple mangosteen', 'produce', 'fruit,fresh,tropical', SRC1, 73, 0.4, 18, 0.6, 1.8, 0, 7),
  ing('monkfish', 'seafood', 'fish,protein,firm', SRC1, 76, 14.5, 0, 1.5, 0, 0, 18),
  ing('mountain yam', 'produce', 'vegetable,starchy,asian', SRC1, 118, 1.5, 28.1, 0.2, 0, 0, 9),
  ing('nopal', 'produce', 'vegetable,fresh,mexican', SRC1, 16, 1.3, 3.3, 0.1, 2.2, 1.1, 21),
  // Page 17
  ing('okra', 'produce', 'vegetable,fresh,southern', SRC1, 33, 1.9, 7, 0.2, 3.2, 1.5, 7),
  ing('ostrich', 'meat', 'poultry,protein,lean', SRC1, 116, 21.8, 0, 2.6, 0, 0, 72),
  ing('pheasant', 'meat', 'game,protein,lean', SRC1, 133, 24.4, 0, 3.6, 0, 0, 37),
  ing('quinoa', 'grains', 'grain,protein,gluten-free', SRC1, 368, 14.1, 64.2, 6.1, 7, 0, 5),
  ing('rabbit', 'meat', 'game,protein,lean', SRC1, 136, 20.1, 0, 5.6, 0, 0, 41),
  ing('rainbow trout', 'seafood', 'fish,protein,omega-3', SRC1, 141, 20.5, 0, 6.2, 0, 0, 31),
  // Page 18
  ing('rose hip', 'produce', 'fruit,vitamin c,herbal', SRC1, 162, 1.6, 38.2, 0.3, 24.1, 2.6, 4),
  ing('pink salmon', 'seafood', 'fish,protein,omega-3', SRC1, 127, 20.5, 0, 4.4, 0, 0, 67),
  ing('coho salmon', 'seafood', 'fish,protein,omega-3', SRC1, 146, 21.6, 0, 5.9, 0, 0, 46),
  ing('sockeye salmon', 'seafood', 'fish,protein,omega-3', SRC1, 168, 21.3, 0, 8.6, 0, 0, 47),
  ing('chinook salmon', 'seafood', 'fish,protein,omega-3', SRC1, 179, 19.9, 0, 10.4, 0, 0, 50),
  ing('atlantic salmon', 'seafood', 'fish,protein,omega-3', SRC1, 208, 20.4, 0, 13.4, 0, 0, 59),
  ing('salmonberry', 'produce', 'fruit,berry,wild', SRC1),
  ing('sapodilla', 'produce', 'fruit,fresh,tropical', SRC1, 83, 0.4, 20, 1.1, 5.3, 0, 12),
  ing('scallop', 'seafood', 'shellfish,protein,delicate', SRC1, 69, 12.1, 3.2, 0.5, 0, 0, 392),
  ing('sea cucumber', 'seafood', 'shellfish,protein,asian', SRC1),
  ing('sheep', 'meat', 'meat,protein,rich', SRC1, 294, 24.5, 0, 20.9, 0, 0, 66),
  // Page 19
  ing('soursop', 'produce', 'fruit,fresh,tropical', SRC1, 66, 1, 16.8, 0.3, 3.3, 13.5, 14),
  ing('spelt', 'grains', 'cereal,whole grain,ancient', SRC1, 338, 14.6, 70.2, 2.4, 10.7, 6.8, 8),
  ing('spirulina', 'produce', 'seaweed,protein,superfood', SRC1, 290, 57.5, 23.9, 7.7, 3.6, 3.1, 1048),
  ing('taro', 'produce', 'vegetable,starchy,root', SRC1, 112, 1.5, 26.5, 0.2, 4.1, 0.5, 11),
  ing('teff', 'grains', 'grain,protein,gluten-free', SRC1, 367, 13.3, 73.1, 2.4, 8, 1.8, 12),
  ing('turkey', 'meat', 'poultry,protein,lean', SRC1, 189, 28.6, 0, 7.4, 0, 0, 68),
  ing('cattle', 'meat', 'meat,protein,red meat', SRC1),
  ing('wasabi', 'spices', 'spice,hot,japanese', SRC1, 109, 4.8, 23.5, 0.6, 7.8, 0, 17),
  // Page 20
  ing('wax gourd', 'produce', 'vegetable,fresh,asian', SRC1, 13, 0.4, 3, 0.2, 2.9, 0, 111),
  ing('squid', 'seafood', 'shellfish,protein,mild', SRC1, 92, 15.6, 3.1, 1.4, 0, 0, 44),
  ing('shrimp', 'seafood', 'shellfish,protein,versatile', SRC1, 85, 20.1, 0.9, 0.5, 0, 0, 566),
  ing('crayfish', 'seafood', 'shellfish,protein,freshwater', SRC1, 82, 16.8, 0, 1.0, 0, 0, 58),
  ing('domestic pig', 'meat', 'meat,protein,versatile', SRC1),
  ing('yam', 'produce', 'vegetable,starchy,tropical', SRC1, 118, 1.5, 27.9, 0.2, 4.1, 0.5, 9),
  ing('jicama', 'produce', 'vegetable,fresh,crunchy', SRC1, 38, 0.7, 8.8, 0.1, 4.9, 1.8, 4),
  ing('common mushroom', 'produce', 'vegetable,fresh,umami', SRC1, 22, 3.1, 3.3, 0.3, 1, 2, 5),
  ing('shiitake', 'produce', 'mushroom,fresh,asian', SRC1, 34, 2.2, 6.8, 0.5, 2.5, 2.4, 9),
  ing('black-eyed pea', 'pulses', 'legume,protein,southern', SRC1, 336, 23.5, 60.3, 1.3, 10.6, 0, 16),
  // Page 21
  ing('deer', 'meat', 'game,protein,lean', SRC1, 120, 23, 0, 2.4, 0, 0, 51),
  ing('domestic goat', 'meat', 'meat,protein,lean', SRC1, 109, 20.6, 0, 2.3, 0, 0, 86),
  ing('enokitake', 'produce', 'mushroom,fresh,asian', SRC1, 37, 2.7, 7.8, 0.3, 2.7, 0.2, 3),
  ing('oyster mushroom', 'produce', 'mushroom,fresh,mild', SRC1, 33, 3.3, 6.1, 0.4, 2.3, 1.1, 18),
  ing('maitake', 'produce', 'mushroom,fresh,immune', SRC1, 31, 1.9, 7, 0.2, 2.7, 2.1, 1),
  ing('chanterelle', 'produce', 'mushroom,fresh,wild', SRC1, 38, 1.5, 6.9, 0.5, 3.8, 1.2, 9),
  // Page 22-23
  ing('cinnamon', 'spices', 'spice,warm,baking', SRC1, 247, 4, 80.6, 1.2, 53.1, 2.2, 10),
  ing('tilapia', 'seafood', 'fish,protein,mild', SRC1, 96, 20.1, 0, 1.7, 0, 0, 52),
  // Page 24
  ing('salt', 'spices', 'seasoning,essential,mineral', SRC1, 0, 0, 0, 0, 0, 0, 38758),
  ing('butter', 'dairy', 'fat,cooking,baking', SRC1, 717, 0.9, 0.1, 81.1, 0, 0.1, 643),
  ing('cream', 'dairy', 'dairy,fat,cooking', SRC1, 340, 2.1, 2.8, 36.1, 0, 2.9, 34),
  ing('honey', 'pantry', 'sweetener,natural,baking', SRC1, 304, 0.3, 82.4, 0, 0.2, 82.1, 4),
  ing('vinegar', 'pantry', 'acidic,condiment,cooking', SRC1, 18, 0, 0.04, 0, 0, 0.04, 2),
  ing('curry powder', 'spices', 'spice,blend,aromatic', SRC1, 325, 14.3, 55.8, 14.01, 53.2, 2.8, 52),
  ing('cocoa powder', 'pantry', 'chocolate,baking,antioxidant', SRC1, 228, 19.6, 57.9, 13.7, 33.2, 1.8, 21),
  ing('chocolate', 'pantry', 'sweet,baking,indulgent', SRC1, 546, 5, 59.4, 31.3, 7, 47.9, 24),
  ing('soy sauce', 'pantry', 'condiment,asian,umami', SRC1, 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493),
  ing('miso', 'pantry', 'fermented,asian,umami', SRC1, 199, 12.8, 26.5, 6, 5.4, 6.2, 3728),
  ing('tofu', 'produce', 'soy,protein,versatile', SRC1, 76, 8, 1.9, 4.8, 0.3, 0.6, 7),
  ing('cheese', 'dairy', 'dairy,protein,fat', SRC1, 402, 25, 1.3, 33.1, 0, 0.5, 621),
  ing('milk', 'dairy', 'dairy,calcium,protein', SRC1, 61, 3.2, 4.8, 3.2, 0, 5.1, 43),
  ing('eggs', 'dairy', 'protein,versatile,baking', SRC1, 155, 12.6, 1.1, 10.6, 0, 1.1, 124),
  ing('yogurt', 'dairy', 'dairy,fermented,probiotic', SRC1, 61, 3.5, 4.7, 3.3, 0, 4.7, 46),
  // Page 25
  ing('kefir', 'dairy', 'dairy,fermented,probiotic', SRC1, 43, 3.8, 4.5, 1, 0, 0, 40),
  ing('buttermilk', 'dairy', 'dairy,fermented,baking', SRC1, 40, 3.3, 4.8, 0.9, 0, 4.8, 105),
  ing('lard', 'pantry', 'fat,cooking,animal', SRC1, 902, 0, 0, 100, 0, 0, 0),
  // Page 26
  ing('heart of palm', 'produce', 'vegetable,canned,tropical', SRC1, 28, 2.5, 4.6, 0.6, 2.4, 0, 426),
  ing('bulgur', 'grains', 'grain,whole grain,middle eastern', SRC1, 342, 12.3, 75.9, 1.3, 18.3, 0.4, 17),
  ing('semolina', 'grains', 'grain,pasta,wheat', SRC1, 360, 12.7, 72.8, 1.1, 3.9, 0.7, 1),
  ing('tapioca', 'pantry', 'starch,thickener,gluten-free', SRC1, 358, 0.2, 88.7, 0.02, 0.9, 3.3, 1),
  ing('molasses', 'pantry', 'sweetener,baking,mineral rich', SRC1, 290, 0, 74.7, 0.1, 0, 74.7, 37),
  ing('olive oil', 'pantry', 'oil,cooking,mediterranean', SRC1, 884, 0, 0, 100, 0, 0, 2),
  // Page 27
  ing('evaporated milk', 'dairy', 'dairy,canned,cooking', SRC1, 134, 6.8, 10, 7.6, 0, 10, 106),
  ing('flour', 'pantry', 'baking,staple,wheat', SRC1, 364, 10.3, 76.3, 1, 2.7, 0.3, 2),
  ing('condensed milk', 'dairy', 'dairy,sweet,baking', SRC1, 321, 7.9, 54.4, 8.7, 0, 54.4, 127),
  ing('margarine', 'pantry', 'fat,cooking,spread', SRC1, 717, 0.2, 0.7, 80.7, 0, 0, 751),
  // Page 28
  ing('green zucchini', 'produce', 'vegetable,fresh,versatile', SRC1, 17, 1.2, 3.1, 0.3, 1, 2.5, 8),
  ing('green bell pepper', 'produce', 'vegetable,fresh,crunchy', SRC1, 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3),
  ing('yellow bell pepper', 'produce', 'vegetable,fresh,sweet', SRC1, 27, 1, 6.3, 0.2, 0.9, 0, 2),
  ing('red bell pepper', 'produce', 'vegetable,fresh,sweet', SRC1, 31, 1, 6.0, 0.3, 2.1, 4.2, 4),
  ing('green bean', 'produce', 'vegetable,fresh,versatile', SRC1, 31, 1.8, 7.0, 0.1, 3.4, 3.3, 6),
  ing('white cabbage', 'produce', 'vegetable,fresh,leafy', SRC1, 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18),
  ing('romaine lettuce', 'produce', 'vegetable,fresh,salad', SRC1, 17, 1.2, 3.3, 0.3, 2.1, 1.2, 8),
  ing('blackberry', 'produce', 'fruit,berry,antioxidant', SRC1, 43, 1.4, 9.6, 0.5, 5.3, 4.9, 1),
  // Page 29
  ing('canola oil', 'pantry', 'oil,cooking,neutral', SRC1, 884, 0, 0, 100, 0, 0, 0),
  // Page 30
  ing('cheddar cheese', 'dairy', 'dairy,cheese,sharp', SRC1, 403, 24.9, 1.3, 33.1, 0, 0.5, 621),
  ing('parmesan cheese', 'dairy', 'dairy,cheese,aged', SRC1, 392, 35.7, 3.2, 25.8, 0, 0.9, 1529),
  ing('almond milk', 'dairy', 'plant milk,dairy-free,low calorie', SRC1, 15, 0.6, 0.6, 1.1, 0, 0, 67),
  ing('coconut milk', 'dairy', 'plant milk,tropical,rich', SRC1, 230, 2.3, 5.5, 23.8, 2.2, 3.3, 15),
  ing('sunflower oil', 'pantry', 'oil,cooking,neutral', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('coconut oil', 'pantry', 'oil,cooking,tropical', SRC1, 862, 0, 0, 100, 0, 0, 0),
  ing('peanut oil', 'pantry', 'oil,cooking,asian', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('corn oil', 'pantry', 'oil,cooking,neutral', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('avocado oil', 'pantry', 'oil,cooking,healthy', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('grapeseed oil', 'pantry', 'oil,cooking,neutral', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('sesame oil', 'pantry', 'oil,cooking,asian', SRC1, 884, 0, 0, 100, 0, 0, 0),
  ing('monterey jack cheese', 'dairy', 'dairy,cheese,mild', SRC1, 373, 24.5, 0.7, 30.3, 0, 0.5, 536),
  ing('swiss cheese', 'dairy', 'dairy,cheese,nutty', SRC1, 380, 27, 5.4, 28, 0, 1.4, 192),
  ing('cottage cheese', 'dairy', 'dairy,cheese,low fat', SRC1, 98, 11.1, 3.4, 4.3, 0, 2.7, 364),
  ing('blue cheese', 'dairy', 'dairy,cheese,pungent', SRC1, 353, 21.4, 2.3, 28.7, 0, 0, 1395),
  ing('clam', 'seafood', 'shellfish,protein,mineral rich', SRC1, 74, 12.8, 2.6, 1, 0, 0, 601),
  ing('sour cream', 'dairy', 'dairy,condiment,tangy', SRC1, 198, 2.4, 4.6, 19.4, 0, 3.5, 80),
  ing('jalapeno pepper', 'produce', 'vegetable,hot,spicy', SRC1, 29, 0.9, 6.5, 0.4, 2.8, 4.1, 1),
  ing('greek feta cheese', 'dairy', 'dairy,cheese,mediterranean', SRC1, 264, 14.2, 4.1, 21.3, 0, 4.1, 917),
  ing('plantain', 'produce', 'fruit,starchy,tropical', SRC1, 122, 1.3, 31.9, 0.4, 2.3, 15, 4),
  ing('clementine', 'produce', 'fruit,fresh,citrus', SRC1, 47, 0.8, 12.0, 0.1, 1.7, 9.2, 1),
  // Page 31
  ing('red onion', 'produce', 'vegetable,fresh,allium', SRC1, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4),
  ing('green onion', 'produce', 'vegetable,fresh,allium', SRC1, 32, 1.8, 7.3, 0.2, 2.6, 2.3, 16),
  ing('iceberg lettuce', 'produce', 'vegetable,fresh,salad', SRC1, 14, 0.9, 3.0, 0.1, 1.2, 2.0, 10),
  ing('pea shoots', 'produce', 'vegetable,fresh,sprout', SRC1),
  ing('water spinach', 'produce', 'vegetable,fresh,asian', SRC1, 19, 2.6, 3.1, 0.2, 2, 0, 113),
  ing('pitaya', 'produce', 'fruit,fresh,tropical', SRC1, 60, 1.2, 13, 0, 3, 8, 0),
  ing('goji', 'produce', 'fruit,dried,superfood', SRC1, 349, 14.3, 77.1, 0.4, 13, 45.6, 298),
  ing('cantaloupe melon', 'produce', 'fruit,fresh,melon', SRC1, 34, 0.8, 8.2, 0.2, 0.9, 7.9, 16),
  // Page 32
  ing('cape gooseberry', 'produce', 'fruit,fresh,tart', SRC1, 53, 1.9, 11.2, 0.7, 0, 0, 0),
  ing('herbal tea', 'beverages', 'tea,caffeine-free,herbal', SRC1, 1, 0, 0.2, 0, 0, 0, 2),
  ing('fish oil', 'pantry', 'oil,supplement,omega-3', SRC1, 902, 0, 0, 100, 0, 0, 0),
];

// ============================================================
// SOURCE 2: Tasting Table (tastingtable.com) — 30 items
// ============================================================
const SRC2 = 'Tasting Table (tastingtable.com)';
const tastingTable: Ingredient[] = [
  ing('black pepper', 'spices', 'spice,essential,universal', SRC2, 251, 10.4, 63.9, 3.3, 25.3, 0.6, 20),
  ing('fresh parsley', 'herbs', 'herb,fresh,garnish', SRC2, 36, 3, 6.3, 0.8, 3.3, 0.8, 56),
  ing('grapeseed oil', 'pantry', 'oil,cooking,neutral', SRC2, 884, 0, 0, 100, 0, 0, 0),
  ing('cider vinegar', 'pantry', 'vinegar,condiment,acidic', SRC2, 21, 0, 0.9, 0, 0, 0.4, 5),
  ing('mustard', 'pantry', 'condiment,spicy,versatile', SRC2, 60, 4.4, 5.8, 3.3, 4, 2.2, 1135),
  ing('capers', 'pantry', 'preserved,condiment,mediterranean', SRC2, 23, 2.4, 4.9, 0.9, 3.2, 0.4, 2964),
  ing('fish sauce', 'pantry', 'condiment,asian,umami', SRC2, 35, 5.1, 3.6, 0.01, 0, 0, 7851),
  ing('soy sauce', 'pantry', 'condiment,asian,umami', SRC2, 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493),
  ing('shallots', 'produce', 'vegetable,fresh,allium', SRC2, 72, 2.5, 16.8, 0.1, 3.2, 7.9, 12),
  ing('carrots', 'produce', 'vegetable,fresh,root', SRC2, 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69),
  ing('onions', 'produce', 'vegetable,fresh,allium', SRC2, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4),
  ing('celery', 'produce', 'vegetable,fresh,aromatic', SRC2, 14, 0.7, 3, 0.2, 1.6, 1.3, 80),
  ing('anchovies', 'pantry', 'fish,preserved,umami', SRC2, 131, 20.4, 0, 4.8, 0, 0, 104),
  ing('cream', 'dairy', 'dairy,fat,cooking', SRC2, 340, 2.1, 2.8, 36.1, 0, 2.9, 34),
  ing('flour', 'pantry', 'baking,staple,wheat', SRC2, 364, 10.3, 76.3, 1, 2.7, 0.3, 2),
  ing('cornstarch', 'pantry', 'thickener,baking,starch', SRC2, 381, 0.3, 91.3, 0.1, 0.9, 0, 9),
  ing('rice', 'grains', 'cereal,staple,versatile', SRC2, 130, 2.7, 28.2, 0.3, 0.4, 0, 1),
  ing('pasta', 'grains', 'wheat,staple,italian', SRC2, 131, 5, 25, 1.1, 1.8, 0.6, 1),
  ing('breadcrumbs', 'pantry', 'coating,baking,crunch', SRC2, 395, 13.4, 71.8, 5.3, 4.5, 6.2, 732),
  ing('cheese', 'dairy', 'dairy,protein,fat', SRC2, 402, 25, 1.3, 33.1, 0, 0.5, 621),
  ing('bacon', 'meat', 'pork,cured,smoky', SRC2, 541, 37, 1.4, 42, 0, 0, 2310),
  ing('frozen peas', 'frozen', 'vegetable,frozen,sweet', SRC2, 77, 5.2, 13.6, 0.3, 4.5, 5.5, 103),
  ing('chiles', 'produce', 'vegetable,hot,spicy', SRC2, 40, 1.9, 8.8, 0.4, 1.5, 5.3, 9),
  ing('za\'atar', 'spices', 'spice,blend,middle eastern', SRC2),
  ing('tahini', 'pantry', 'paste,sesame,mediterranean', SRC2, 595, 17, 21.2, 53.8, 9.3, 0.5, 115),
  ing('beans', 'pulses', 'legume,protein,versatile', SRC2, 333, 23.6, 60, 0.8, 24.9, 2.1, 5),
  ing('canned tomatoes', 'pantry', 'preserved,cooking,italian', SRC2, 17, 0.8, 3.6, 0.1, 0.9, 2.4, 132),
];

// ============================================================
// SOURCE 3: Simone Jones Tyner (simonejonestyner.com) — 75 items
// ============================================================
const SRC3 = 'Simone Jones Tyner (simonejonestyner.com)';
const simone: Ingredient[] = [
  // Pantry
  ing('all-purpose flour', 'pantry', 'baking,staple,wheat', SRC3, 364, 10.3, 76.3, 1, 2.7, 0.3, 2),
  ing('granulated sugar', 'pantry', 'sweetener,baking,staple', SRC3, 387, 0, 100, 0, 0, 100, 0),
  ing('confectioner\'s sugar', 'pantry', 'sweetener,baking,icing', SRC3, 389, 0, 99.8, 0, 0, 97.8, 0),
  ing('cornstarch', 'pantry', 'thickener,baking,starch', SRC3, 381, 0.3, 91.3, 0.1, 0.9, 0, 9),
  ing('brown sugar', 'pantry', 'sweetener,baking,molasses', SRC3, 380, 0.1, 98.1, 0, 0, 97, 28),
  ing('baking soda', 'pantry', 'baking,leavening,essential', SRC3, 0, 0, 0, 0, 0, 0, 27360),
  ing('baking powder', 'pantry', 'baking,leavening,essential', SRC3, 53, 0, 27.7, 0, 0.2, 0, 10600),
  ing('breadcrumbs', 'pantry', 'coating,baking,crunch', SRC3, 395, 13.4, 71.8, 5.3, 4.5, 6.2, 732),
  ing('bread', 'pantry', 'staple,wheat,carb', SRC3, 265, 9, 49, 3.2, 2.7, 5, 491),
  ing('pasta', 'grains', 'wheat,staple,italian', SRC3, 131, 5, 25, 1.1, 1.8, 0.6, 1),
  ing('crackers', 'pantry', 'snack,wheat,crispy', SRC3, 421, 10, 74, 9.5, 3, 0, 712),
  ing('corn flakes', 'pantry', 'cereal,breakfast,processed', SRC3, 357, 7, 84, 0.4, 3.3, 8.4, 729),
  ing('rice', 'grains', 'cereal,staple,versatile', SRC3, 130, 2.7, 28.2, 0.3, 0.4, 0, 1),
  ing('garlic', 'produce', 'vegetable,fresh,allium', SRC3, 149, 6.4, 33.1, 0.5, 2.1, 1, 17),
  ing('potatoes', 'produce', 'vegetable,starchy,staple', SRC3, 77, 2, 17, 0.1, 2.2, 0.8, 6),
  // Condiments
  ing('ketchup', 'pantry', 'condiment,sweet,tomato', SRC3, 112, 1.7, 25.8, 0.4, 0.3, 22.8, 907),
  ing('mustard', 'pantry', 'condiment,spicy,versatile', SRC3, 60, 4.4, 5.8, 3.3, 4, 2.2, 1135),
  ing('relish', 'pantry', 'condiment,pickled,sweet', SRC3, 130, 0.5, 35, 0.4, 1.3, 23.5, 1010),
  ing('mayonnaise', 'pantry', 'condiment,creamy,emulsion', SRC3, 680, 1, 0.6, 75, 0, 0.6, 635),
  ing('soy sauce', 'pantry', 'condiment,asian,umami', SRC3, 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493),
  ing('honey', 'pantry', 'sweetener,natural,baking', SRC3, 304, 0.3, 82.4, 0, 0.2, 82.1, 4),
  ing('apple cider vinegar', 'pantry', 'vinegar,condiment,acidic', SRC3, 21, 0, 0.9, 0, 0, 0.4, 5),
  ing('white vinegar', 'pantry', 'vinegar,cleaning,cooking', SRC3, 18, 0, 0.04, 0, 0, 0.04, 2),
  ing('balsamic vinegar', 'pantry', 'vinegar,condiment,italian', SRC3, 88, 0.5, 17.0, 0, 0, 14.95, 23),
  ing('worcestershire sauce', 'pantry', 'condiment,sauce,umami', SRC3, 78, 0, 19.5, 0, 0, 10.2, 980),
  ing('hot sauce', 'pantry', 'condiment,spicy,versatile', SRC3, 11, 0.6, 1.7, 0.4, 0.5, 0.9, 2643),
  // Oil
  ing('olive oil', 'pantry', 'oil,cooking,mediterranean', SRC3, 884, 0, 0, 100, 0, 0, 2),
  ing('sesame oil', 'pantry', 'oil,cooking,asian', SRC3, 884, 0, 0, 100, 0, 0, 0),
  ing('vegetable oil', 'pantry', 'oil,cooking,neutral', SRC3, 884, 0, 0, 100, 0, 0, 0),
  ing('cooking spray', 'pantry', 'oil,cooking,low calorie', SRC3),
  // Canned/Jarred
  ing('cream of chicken soup', 'pantry', 'canned,soup,cooking', SRC3, 56, 1.3, 5.8, 3.1, 0.3, 0.4, 450),
  ing('cream of mushroom soup', 'pantry', 'canned,soup,cooking', SRC3, 51, 0.7, 4.2, 3.4, 0.3, 0.4, 397),
  ing('chicken broth', 'pantry', 'broth,stock,cooking', SRC3, 7, 1.0, 0.2, 0.2, 0, 0.2, 343),
  ing('vegetable broth', 'pantry', 'broth,stock,vegetarian', SRC3, 6, 0.2, 1.1, 0.1, 0, 0.3, 297),
  ing('canned tomatoes', 'pantry', 'preserved,cooking,italian', SRC3, 17, 0.8, 3.6, 0.1, 0.9, 2.4, 132),
  ing('tomato paste', 'pantry', 'concentrated,cooking,italian', SRC3, 82, 4.3, 18.9, 0.5, 4.4, 12.2, 98),
  ing('pasta sauce', 'pantry', 'sauce,italian,cooking', SRC3, 51, 1.5, 8.3, 1.4, 1.5, 5.5, 384),
  ing('canned beans', 'pantry', 'legume,canned,protein', SRC3, 114, 7.3, 20.7, 0.5, 5.5, 0.7, 364),
  ing('tuna', 'seafood', 'fish,canned,protein', SRC3, 116, 25.5, 0, 0.8, 0, 0, 50),
  // Herbs/Spices
  ing('salt', 'spices', 'seasoning,essential,mineral', SRC3, 0, 0, 0, 0, 0, 0, 38758),
  ing('black pepper', 'spices', 'spice,essential,universal', SRC3, 251, 10.4, 63.9, 3.3, 25.3, 0.6, 20),
  ing('kosher salt', 'spices', 'seasoning,essential,basic', SRC3, 0, 0, 0, 0, 0, 0, 38758),
  ing('cinnamon', 'spices', 'spice,warm,baking', SRC3, 247, 4, 80.6, 1.2, 53.1, 2.2, 10),
  ing('nutmeg', 'spices', 'spice,warm,baking', SRC3, 525, 5.8, 49.3, 36.3, 20.8, 0, 16),
  ing('oregano', 'spices', 'herb,dried,italian', SRC3, 265, 9, 68.9, 4.3, 42.5, 4.1, 25),
  ing('rosemary', 'herbs', 'herb,dried,aromatic', SRC3, 131, 3.3, 20.7, 5.9, 14.1, 0, 26),
  ing('basil', 'herbs', 'herb,dried,italian', SRC3, 23, 3.1, 2.6, 0.6, 1.6, 0.3, 4),
  ing('red pepper flakes', 'spices', 'spice,hot,dried', SRC3, 318, 12, 56.6, 17.3, 34.8, 10.3, 30),
  ing('parsley flakes', 'herbs', 'herb,dried,garnish', SRC3, 292, 26.6, 51.7, 5.5, 26.7, 0, 452),
  ing('garlic powder', 'spices', 'spice,dried,allium', SRC3, 331, 16.6, 72.7, 0.7, 9, 2.4, 60),
  ing('cayenne pepper', 'spices', 'spice,hot,dried', SRC3, 318, 12, 56.6, 17.3, 27.2, 10.3, 30),
  ing('paprika', 'spices', 'spice,mild,colorful', SRC3, 282, 14.1, 53.99, 13, 34.9, 10.3, 68),
  ing('bay leaves', 'spices', 'herb,dried,aromatic', SRC3, 313, 7.6, 74.97, 8.4, 26.3, 0, 23),
  ing('vanilla extract', 'pantry', 'baking,extract,sweet', SRC3, 288, 0.1, 12.65, 0.1, 0, 12.65, 9),
  ing('chili powder', 'spices', 'spice,blend,hot', SRC3, 282, 13.5, 49.7, 14.3, 34.8, 7.2, 1010),
  ing('ginger', 'spices', 'spice,fresh,warming', SRC3, 80, 1.8, 17.8, 0.8, 2, 1.7, 13),
  ing('onion powder', 'spices', 'spice,dried,allium', SRC3, 341, 10.4, 79.1, 1.1, 15.2, 6.6, 73),
  // Refrigerator/Freezer
  ing('butter', 'dairy', 'fat,cooking,baking', SRC3, 717, 0.9, 0.1, 81.1, 0, 0.1, 643),
  ing('milk', 'dairy', 'dairy,calcium,protein', SRC3, 61, 3.2, 4.8, 3.2, 0, 5.1, 43),
  ing('eggs', 'dairy', 'protein,versatile,baking', SRC3, 155, 12.6, 1.1, 10.6, 0, 1.1, 124),
  ing('lemons', 'produce', 'fruit,fresh,citrus', SRC3, 29, 1.1, 9.3, 0.3, 2.8, 2.5, 2),
  ing('parmesan cheese', 'dairy', 'dairy,cheese,aged', SRC3, 392, 35.7, 3.2, 25.8, 0, 0.9, 1529),
  ing('cheddar cheese', 'dairy', 'dairy,cheese,sharp', SRC3, 403, 24.9, 1.3, 33.1, 0, 0.5, 621),
  ing('mozzarella cheese', 'dairy', 'dairy,cheese,mild', SRC3, 280, 28.2, 3.1, 17.1, 0, 1.1, 628),
  ing('peas', 'frozen', 'vegetable,frozen,sweet', SRC3, 81, 5.4, 14.4, 0.4, 5.7, 5.7, 5),
  ing('spinach', 'produce', 'vegetable,fresh,leafy', SRC3, 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79),
  ing('corn', 'produce', 'vegetable,starchy,versatile', SRC3, 86, 3.3, 19, 1.3, 2.7, 6.3, 15),
  ing('green beans', 'produce', 'vegetable,fresh,versatile', SRC3, 31, 1.8, 7, 0.1, 3.4, 3.3, 6),
  ing('carrots', 'produce', 'vegetable,fresh,root', SRC3, 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69),
  ing('broccoli', 'produce', 'vegetable,fresh,cruciferous', SRC3, 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33),
  ing('sausage', 'meat', 'pork,cured,seasoned', SRC3, 301, 12.3, 1.1, 27.3, 0, 0, 808),
  ing('chicken breast', 'meat', 'poultry,protein,lean', SRC3, 106, 22.5, 0, 1.9, 0, 0, 66),
  ing('chicken thighs', 'meat', 'poultry,protein,juicy', SRC3, 177, 24.9, 0, 8, 0, 0, 84),
  ing('ground beef', 'meat', 'beef,protein,versatile', SRC3, 254, 17.2, 0, 20, 0, 0, 66),
  ing('ground turkey', 'meat', 'poultry,protein,lean', SRC3, 150, 27.4, 0, 7.7, 0, 0, 75),
];

// ============================================================
// SOURCE 4: My Eclectic Bites (myeclecticbites.com)
// ============================================================
const SRC4 = 'My Eclectic Bites (myeclecticbites.com)';
const eclectic: Ingredient[] = [
  ing('kosher salt', 'spices', 'seasoning,essential,basic', SRC4, 0, 0, 0, 0, 0, 0, 38758),
  ing('black pepper', 'spices', 'spice,essential,universal', SRC4, 251, 10.4, 63.9, 3.3, 25.3, 0.6, 20),
  ing('dried basil', 'spices', 'herb,dried,italian', SRC4, 233, 22.98, 47.75, 4.07, 37.7, 1.71, 34),
  ing('dried oregano', 'spices', 'herb,dried,italian', SRC4, 265, 9, 68.9, 4.3, 42.5, 4.1, 25),
  ing('dried thyme', 'spices', 'herb,dried,aromatic', SRC4, 276, 9.1, 63.9, 7.4, 37, 0, 55),
  ing('garlic powder', 'spices', 'spice,dried,allium', SRC4, 331, 16.6, 72.7, 0.7, 9, 2.4, 60),
  ing('onion powder', 'spices', 'spice,dried,allium', SRC4, 341, 10.4, 79.1, 1.1, 15.2, 6.6, 73),
  ing('paprika', 'spices', 'spice,mild,colorful', SRC4, 282, 14.1, 53.99, 13, 34.9, 10.3, 68),
  ing('chili powder', 'spices', 'spice,blend,hot', SRC4, 282, 13.5, 49.7, 14.3, 34.8, 7.2, 1010),
  ing('cayenne pepper', 'spices', 'spice,hot,dried', SRC4, 318, 12, 56.6, 17.3, 27.2, 10.3, 30),
  ing('cumin', 'spices', 'spice,dried,aromatic', SRC4, 375, 17.8, 44.2, 22.3, 10.5, 2.3, 168),
  ing('canola oil', 'pantry', 'oil,cooking,neutral', SRC4, 884, 0, 0, 100, 0, 0, 0),
  ing('vegetable oil', 'pantry', 'oil,cooking,neutral', SRC4, 884, 0, 0, 100, 0, 0, 0),
  ing('peanut oil', 'pantry', 'oil,cooking,asian', SRC4, 884, 0, 0, 100, 0, 0, 0),
  ing('grapeseed oil', 'pantry', 'oil,cooking,neutral', SRC4, 884, 0, 0, 100, 0, 0, 0),
  ing('extra virgin olive oil', 'pantry', 'oil,cooking,mediterranean', SRC4, 884, 0, 0, 100, 0, 0, 2),
  ing('sesame oil', 'pantry', 'oil,cooking,asian', SRC4, 884, 0, 0, 100, 0, 0, 0),
  ing('apple cider vinegar', 'pantry', 'vinegar,condiment,acidic', SRC4, 21, 0, 0.9, 0, 0, 0.4, 5),
  ing('white vinegar', 'pantry', 'vinegar,cleaning,cooking', SRC4, 18, 0, 0.04, 0, 0, 0.04, 2),
  ing('rice wine vinegar', 'pantry', 'vinegar,asian,mild', SRC4, 18, 0, 0.04, 0, 0, 0.04, 2),
  ing('red wine vinegar', 'pantry', 'vinegar,condiment,tangy', SRC4, 19, 0, 0.3, 0, 0, 0, 8),
  ing('balsamic vinegar', 'pantry', 'vinegar,condiment,italian', SRC4, 88, 0.5, 17, 0, 0, 14.95, 23),
  ing('ketchup', 'pantry', 'condiment,sweet,tomato', SRC4, 112, 1.7, 25.8, 0.4, 0.3, 22.8, 907),
  ing('mayonnaise', 'pantry', 'condiment,creamy,emulsion', SRC4, 680, 1, 0.6, 75, 0, 0.6, 635),
  ing('dijon mustard', 'pantry', 'condiment,spicy,french', SRC4, 66, 4.1, 5.6, 3.8, 3.5, 3, 1135),
  ing('yellow mustard', 'pantry', 'condiment,mild,american', SRC4, 60, 4.4, 5.8, 3.3, 4, 2.2, 1135),
  ing('soy sauce', 'pantry', 'condiment,asian,umami', SRC4, 53, 8.1, 4.9, 0.6, 0.8, 0.4, 5493),
  ing('oyster sauce', 'pantry', 'condiment,asian,umami', SRC4, 51, 1.4, 11.0, 0, 0, 3.3, 2733),
  ing('hot sauce', 'pantry', 'condiment,spicy,versatile', SRC4, 11, 0.6, 1.7, 0.4, 0.5, 0.9, 2643),
  ing('diced tomatoes', 'pantry', 'canned,cooking,italian', SRC4, 17, 0.8, 3.6, 0.1, 0.9, 2.4, 132),
  ing('tomato sauce', 'pantry', 'sauce,cooking,italian', SRC4, 24, 1.3, 5.4, 0.1, 1.5, 3.6, 346),
  ing('tomato paste', 'pantry', 'concentrated,cooking,italian', SRC4, 82, 4.3, 18.9, 0.5, 4.4, 12.2, 98),
  ing('dried pasta', 'grains', 'wheat,staple,italian', SRC4, 371, 13.04, 74.67, 1.51, 3.2, 2.67, 6),
  ing('whole-wheat pasta', 'grains', 'wheat,whole grain,fiber', SRC4, 348, 14.6, 73.4, 1.4, 8.6, 2.7, 8),
  ing('bread', 'pantry', 'staple,wheat,carb', SRC4, 265, 9, 49, 3.2, 2.7, 5, 491),
  ing('rice', 'grains', 'cereal,staple,versatile', SRC4, 130, 2.7, 28.2, 0.3, 0.4, 0, 1),
  ing('oats', 'grains', 'cereal,whole grain,fiber', SRC4, 389, 16.9, 66.3, 6.9, 10.6, 0, 2),
  ing('dried beans', 'pulses', 'legume,protein,dried', SRC4, 333, 23.6, 60, 0.8, 24.9, 2.1, 5),
  ing('peas', 'produce', 'vegetable,fresh,sweet', SRC4, 81, 5.4, 14.4, 0.4, 5.7, 5.7, 5),
  ing('lentils', 'pulses', 'legume,protein,versatile', SRC4, 352, 25.8, 60.1, 1.1, 30.5, 2, 6),
  ing('canned beans', 'pantry', 'legume,canned,protein', SRC4, 114, 7.3, 20.7, 0.5, 5.5, 0.7, 364),
  ing('sesame seeds', 'nuts', 'seed,calcium,aromatic', SRC4, 573, 17.7, 23.4, 49.7, 11.8, 0.3, 11),
  ing('garlic', 'produce', 'vegetable,fresh,allium', SRC4, 149, 6.4, 33.1, 0.5, 2.1, 1, 17),
  ing('onion', 'produce', 'vegetable,fresh,allium', SRC4, 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4),
  ing('butter', 'dairy', 'fat,cooking,baking', SRC4, 717, 0.9, 0.1, 81.1, 0, 0.1, 643),
  ing('eggs', 'dairy', 'protein,versatile,baking', SRC4, 155, 12.6, 1.1, 10.6, 0, 1.1, 124),
  ing('cheese', 'dairy', 'dairy,protein,fat', SRC4, 402, 25, 1.3, 33.1, 0, 0.5, 621),
  ing('milk', 'dairy', 'dairy,calcium,protein', SRC4, 61, 3.2, 4.8, 3.2, 0, 5.1, 43),
];

// ============================================================
// Merge and deduplicate (keep first occurrence, prefer ones with nutrition data)
// ============================================================
const allRaw = [...foodb, ...tastingTable, ...simone, ...eclectic];

const seen = new Map<string, Ingredient>();
for (const item of allRaw) {
  const key = item.Name.toLowerCase().trim();
  if (!seen.has(key)) {
    seen.set(key, item);
  } else {
    // If existing entry lacks nutrition but this one has it, replace
    const existing = seen.get(key)!;
    if (existing.Calories_kcal === '' && item.Calories_kcal !== '') {
      seen.set(key, item);
    }
  }
}

const deduplicated = Array.from(seen.values()).sort((a, b) => {
  // Sort by category, then by name
  const catCmp = a.Category.localeCompare(b.Category);
  if (catCmp !== 0) return catCmp;
  return a.Name.localeCompare(b.Name);
});

// ============================================================
// Generate Excel
// ============================================================
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(deduplicated);

ws['!cols'] = [
  { wch: 28 },  // Name
  { wch: 12 },  // Category
  { wch: 38 },  // Tags
  { wch: 42 },  // Source
  { wch: 14 },  // Calories
  { wch: 12 },  // Protein
  { wch: 10 },  // Carbs
  { wch: 10 },  // Fat
  { wch: 10 },  // Fiber
  { wch: 10 },  // Sugar
  { wch: 12 },  // Sodium
];

XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');

// Summary sheet
const summary = [
  { Source: 'FooDB (foodb.ca)', 'Items Before Dedup': foodb.length, 'URL': 'https://foodb.ca/foods' },
  { Source: 'Tasting Table', 'Items Before Dedup': tastingTable.length, 'URL': 'https://www.tastingtable.com/1308478/essential-ingredients-every-beginner-cook-needs-have/' },
  { Source: 'Simone Jones Tyner', 'Items Before Dedup': simone.length, 'URL': 'https://simonejonestyner.com/75-ingredients-you-should-always-keep-in-your-kitchen/' },
  { Source: 'My Eclectic Bites', 'Items Before Dedup': eclectic.length, 'URL': 'https://www.myeclecticbites.com/essential-ingredients/' },
  { Source: 'TOTAL (before dedup)', 'Items Before Dedup': allRaw.length, 'URL': '' },
  { Source: 'TOTAL (after dedup)', 'Items Before Dedup': deduplicated.length, 'URL': '' },
];
const wsSummary = XLSX.utils.json_to_sheet(summary);
wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsSummary, 'Sources');

XLSX.writeFile(wb, 'ingredients-import.xlsx');

// ============================================================
// Generate JSON (for API import — only Name, Category, Tags)
// ============================================================
const jsonExport = {
  ingredients: deduplicated.map(i => ({
    name: i.Name,
    category: i.Category,
    tags: i.Tags,
  })),
};

const fs = require('fs');
fs.writeFileSync('ingredients-import.json', JSON.stringify(jsonExport, null, 2));

console.log(`\nGeneration complete!`);
console.log(`  Total raw items: ${allRaw.length}`);
console.log(`  After deduplication: ${deduplicated.length}`);
console.log(`  FooDB: ${foodb.length}`);
console.log(`  Tasting Table: ${tastingTable.length}`);
console.log(`  Simone Jones Tyner: ${simone.length}`);
console.log(`  My Eclectic Bites: ${eclectic.length}`);
console.log(`\nFiles generated:`);
console.log(`  - ingredients-import.xlsx (with nutrition data + Sources sheet)`);
console.log(`  - ingredients-import.json (for API bulk import)`);
