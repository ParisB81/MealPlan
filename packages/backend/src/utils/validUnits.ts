// Valid units of measurement based on unit_validation.xlsx
export const VALID_UNITS = [
  // Weight
  'g', 'kg', 'mg', 'oz', 'lb', 't',
  // Volume
  'ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal',
  'wineglass', 'coffee cup', 'tea cup',
  // Count
  'piece', 'pcs', 'unit', 'item', 'clove', 'head', 'bulb', 'stalk', 'stick',
  'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip',
  // Small Quantity
  'pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop',
  // Size
  'small', 'medium', 'large', 'extra-large',
  // Package
  'pack', 'packet',
];

export const UNIT_TYPES = {
  weight: ['g', 'kg', 'mg', 'oz', 'lb', 't'],
  volume: ['ml', 'l', 'dl', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal', 'wineglass', 'coffee cup', 'tea cup'],
  count: ['piece', 'pcs', 'unit', 'item', 'clove', 'head', 'bulb', 'stalk', 'stick', 'slice', 'leaf', 'sprig', 'bunch', 'ear', 'fillet', 'strip'],
  small_quantity: ['pinch', 'dash', 'drop', 'smidgen', 'handful', 'scoop'],
  size: ['small', 'medium', 'large', 'extra-large'],
  package: ['pack', 'packet'],
};

export function isValidUnit(unit: string): boolean {
  return VALID_UNITS.includes(unit.toLowerCase());
}
