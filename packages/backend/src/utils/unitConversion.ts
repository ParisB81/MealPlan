// Unit conversion utility for shopping list aggregation
// Merges metric + imperial into unified weight (base: g) and volume (base: ml) systems
// so that shopping lists always display in metric units

// ─── Ingredient-specific unit overrides ──────────────────────────────────────
// After normal aggregation, certain ingredients are re-expressed in a more
// practical unit for shopping (e.g. garlic always shown in cloves, herbs in
// bunches, vegetables in pieces). Each entry defines:
//   - toUnit:   the preferred display unit
//   - fromVolume_ml: ml → toUnit factor (optional; for volume→count/weight conversions)
//   - fromWeight_g:  g  → toUnit factor (optional; for weight→count/weight conversions)
//   - fromSize:      treat large/medium/small/unit/piece all as N × toUnit (optional)
//   - round:         round to nearest integer (default true for pieces/bunches)
//
// Conversion factors:
//   Garlic:   1 clove ≈ 1 tsp = 4.93 ml;  1 head ≈ 10 cloves
//   Onion:    1 medium ≈ 1 cup chopped = 236.59 ml ≈ 150g
//   Carrot:   1 medium ≈ 0.5 cup sliced = 118 ml ≈ 80g
//   Bell pepper: 1 medium ≈ 0.75 cup = 177 ml ≈ 120g
//   Zucchini: 1 medium ≈ 1 cup = 236.59 ml ≈ 200g
//   Eggplant: 1 medium ≈ 4 cups = 946 ml ≈ 500g
//   Cucumber: 1 medium ≈ 1.5 cups = 355 ml ≈ 200g
//   Butter:   1 tbsp = 14.79 ml → 14.2g; just unify everything to g
//   Parmesan: 1 cup grated ≈ 100g; 1 tbsp ≈ 6g
//   Feta:     1 cup ≈ 150g; 1 oz = 28.35g; 1 tbsp ≈ 15g
//   Herbs (parsley/cilantro/mint/dill/basil): 1 bunch ≈ 236.59 ml (1 cup packed)

export interface IngredientOverride {
  toUnit: string;
  fromVolume_ml?: number;   // how many ml = 1 toUnit
  fromWeight_g?: number;    // how many g = 1 toUnit
  fromSize?: number;        // how many toUnits = 1 large/medium/small/piece/unit
  round?: boolean;          // round result to nearest integer (default: true)
}

export const INGREDIENT_UNIT_OVERRIDES: Record<string, IngredientOverride> = {
  // ── Produce: volume/weight/size → piece ─────────────────────────────────
  'garlic':           { toUnit: 'clove', fromVolume_ml: 4.93,  fromWeight_g: 4,    fromSize: 10,  round: true },
  'onion':            { toUnit: 'piece', fromVolume_ml: 236.59, fromWeight_g: 150,  fromSize: 1,   round: true },
  'carrot':           { toUnit: 'piece', fromVolume_ml: 118,    fromWeight_g: 80,   fromSize: 1,   round: true },
  'bell pepper':      { toUnit: 'piece', fromVolume_ml: 177,    fromWeight_g: 120,  fromSize: 1,   round: true },
  'green bell pepper':{ toUnit: 'piece', fromVolume_ml: 177,    fromWeight_g: 120,  fromSize: 1,   round: true },
  'red bell pepper':  { toUnit: 'piece', fromVolume_ml: 177,    fromWeight_g: 120,  fromSize: 1,   round: true },
  'yellow bell pepper':{ toUnit: 'piece', fromVolume_ml: 177,   fromWeight_g: 120,  fromSize: 1,   round: true },
  'zucchini':         { toUnit: 'piece', fromVolume_ml: 236.59, fromWeight_g: 200,  fromSize: 1,   round: true },
  'eggplant':         { toUnit: 'piece', fromVolume_ml: 946,    fromWeight_g: 500,  fromSize: 1,   round: true },
  'cucumber':         { toUnit: 'piece', fromVolume_ml: 355,    fromWeight_g: 200,  fromSize: 1,   round: true },
  // ── Dairy / fats: volume/count → grams ──────────────────────────────────
  'butter':           { toUnit: 'g',     fromVolume_ml: 1/0.96, fromWeight_g: 1,    round: false },
  'parmesan cheese':  { toUnit: 'g',     fromVolume_ml: 1/0.42, fromWeight_g: 1,    round: false },
  'feta cheese':      { toUnit: 'g',     fromVolume_ml: 1/0.63, fromWeight_g: 1,    round: false },
  // ── Herbs: volume/weight → bunch ────────────────────────────────────────
  'parsley':          { toUnit: 'bunch', fromVolume_ml: 236.59, fromWeight_g: 60,   round: true },
  'cilantro':         { toUnit: 'bunch', fromVolume_ml: 236.59, fromWeight_g: 60,   round: true },
  'mint':             { toUnit: 'bunch', fromVolume_ml: 236.59, fromWeight_g: 60,   round: true },
  'dill':             { toUnit: 'bunch', fromVolume_ml: 236.59, fromWeight_g: 60,   round: true },
  'basil':            { toUnit: 'bunch', fromVolume_ml: 236.59, fromWeight_g: 60,   round: true },
};

/**
 * Apply ingredient-specific unit override to an aggregated quantity.
 * Called after normal base-unit aggregation.
 * @param ingredientName  lowercase ingredient name
 * @param baseQuantity    quantity in base units (ml for volume, g for weight, 1 for count/size)
 * @param system          measurement system of the aggregated value
 * @param originalUnits   original units seen across recipes
 * @returns { quantity, unit } in the override unit, or null if no override applies
 */
export function applyIngredientOverride(
  ingredientName: string,
  baseQuantity: number,
  system: MeasurementSystem,
  _originalUnits: string[],
): { quantity: number; unit: string } | null {
  const override = INGREDIENT_UNIT_OVERRIDES[ingredientName.toLowerCase().trim()];
  if (!override) return null;

  const { toUnit, fromVolume_ml, fromWeight_g, fromSize, round = true } = override;

  let rawQuantity: number | null = null;

  if (system === 'volume' && fromVolume_ml) {
    // baseQuantity is in ml
    rawQuantity = baseQuantity / fromVolume_ml;
  } else if (system === 'weight' && fromWeight_g) {
    // baseQuantity is in g
    rawQuantity = baseQuantity / fromWeight_g;
  } else if ((system === 'count' || system === 'size') && fromSize !== undefined) {
    // Check if ALL original units are already the target unit (e.g. only "clove"s)
    // If so, don't multiply by fromSize — just pass through as-is.
    // IMPORTANT: This check uses _originalUnits which is set per aggregation bucket.
    // The aggregation function must separate target-unit entries from non-target-unit
    // entries using getCountSubKey() to prevent mixing clove + head in the same bucket.
    const targetUnitLower = toUnit.toLowerCase();
    const allAreTargetUnit = _originalUnits.every(u =>
      u.toLowerCase().trim() === targetUnitLower ||
      u.toLowerCase().trim() === targetUnitLower + 's'
    );
    if (allAreTargetUnit) {
      // Already in the target unit — just relabel (e.g. 4 clove garlic → 4 clove)
      rawQuantity = baseQuantity;
    } else {
      // Converting from a generic count (head, piece, unit) — multiply by fromSize
      // e.g. 1 head garlic → 10 cloves
      rawQuantity = baseQuantity * fromSize;
    }
  } else if (system === 'count' || system === 'size') {
    // No fromSize defined but it's already a count — just relabel
    rawQuantity = baseQuantity;
  }

  if (rawQuantity === null) return null;

  const quantity = round
    ? Math.max(1, Math.round(rawQuantity))
    : Math.round(rawQuantity * 100) / 100;

  return { quantity, unit: toUnit };
}

// Measurement systems
export type MeasurementSystem = 'weight' | 'volume' | 'count' | 'small_quantity' | 'size' | 'package' | 'unknown';

// Base units for each system (we convert everything to the base unit for aggregation)
const BASE_UNITS: Record<MeasurementSystem, string> = {
  weight: 'g',
  volume: 'ml',
  count: 'piece',
  small_quantity: 'pinch',
  size: 'medium',
  package: 'pack',
  unknown: 'unknown',
};

// Preferred display units (what we convert back to for display)
// Shopping lists always display in metric
const DISPLAY_THRESHOLDS: Record<MeasurementSystem, Array<{ threshold: number; unit: string }>> = {
  weight: [
    { threshold: 1000, unit: 'kg' },
    { threshold: 1, unit: 'g' },
    { threshold: 0, unit: 'mg' },
  ],
  volume: [
    { threshold: 1000, unit: 'l' },
    { threshold: 0, unit: 'ml' },
  ],
  count: [{ threshold: 0, unit: 'piece' }],
  small_quantity: [{ threshold: 0, unit: 'pinch' }],
  size: [{ threshold: 0, unit: 'medium' }],
  package: [{ threshold: 0, unit: 'pack' }],
  unknown: [{ threshold: 0, unit: 'unknown' }],
};

// Conversion factors to base unit
// Weight: everything converts to grams (g)
// Volume: everything converts to milliliters (ml)
const CONVERSION_TO_BASE: Record<string, { system: MeasurementSystem; factor: number }> = {
  // Weight — metric (base: g)
  'mg': { system: 'weight', factor: 0.001 },
  'g': { system: 'weight', factor: 1 },
  'grams': { system: 'weight', factor: 1 },
  'gram': { system: 'weight', factor: 1 },
  'kg': { system: 'weight', factor: 1000 },
  'kilogram': { system: 'weight', factor: 1000 },
  'kilograms': { system: 'weight', factor: 1000 },

  // Weight — imperial (converted to grams)
  'oz': { system: 'weight', factor: 28.35 },
  'ounce': { system: 'weight', factor: 28.35 },
  'ounces': { system: 'weight', factor: 28.35 },
  'lb': { system: 'weight', factor: 453.59 },
  'lbs': { system: 'weight', factor: 453.59 },
  'pound': { system: 'weight', factor: 453.59 },
  'pounds': { system: 'weight', factor: 453.59 },

  // Volume — metric (base: ml)
  'ml': { system: 'volume', factor: 1 },
  'milliliter': { system: 'volume', factor: 1 },
  'milliliters': { system: 'volume', factor: 1 },
  'cl': { system: 'volume', factor: 10 },
  'centiliter': { system: 'volume', factor: 10 },
  'centiliters': { system: 'volume', factor: 10 },
  'dl': { system: 'volume', factor: 100 },
  'deciliter': { system: 'volume', factor: 100 },
  'deciliters': { system: 'volume', factor: 100 },
  'l': { system: 'volume', factor: 1000 },
  'liter': { system: 'volume', factor: 1000 },
  'liters': { system: 'volume', factor: 1000 },
  'litre': { system: 'volume', factor: 1000 },
  'litres': { system: 'volume', factor: 1000 },

  // Volume — imperial (converted to ml)
  'tsp': { system: 'volume', factor: 4.93 },
  'teaspoon': { system: 'volume', factor: 4.93 },
  'teaspoons': { system: 'volume', factor: 4.93 },
  'tbsp': { system: 'volume', factor: 14.79 },
  'tablespoon': { system: 'volume', factor: 14.79 },
  'tablespoons': { system: 'volume', factor: 14.79 },
  'fl oz': { system: 'volume', factor: 29.57 },
  'fluid ounce': { system: 'volume', factor: 29.57 },
  'fluid ounces': { system: 'volume', factor: 29.57 },
  'cup': { system: 'volume', factor: 236.59 },
  'cups': { system: 'volume', factor: 236.59 },
  'pt': { system: 'volume', factor: 473.18 },
  'pint': { system: 'volume', factor: 473.18 },
  'pints': { system: 'volume', factor: 473.18 },
  'qt': { system: 'volume', factor: 946.35 },
  'quart': { system: 'volume', factor: 946.35 },
  'quarts': { system: 'volume', factor: 946.35 },
  'gal': { system: 'volume', factor: 3785.41 },
  'gallon': { system: 'volume', factor: 3785.41 },
  'gallons': { system: 'volume', factor: 3785.41 },

  // Count units (base: piece) - no conversion, just grouping
  'piece': { system: 'count', factor: 1 },
  'pieces': { system: 'count', factor: 1 },
  'pcs': { system: 'count', factor: 1 },
  'unit': { system: 'count', factor: 1 },
  'units': { system: 'count', factor: 1 },
  'item': { system: 'count', factor: 1 },
  'items': { system: 'count', factor: 1 },
  'clove': { system: 'count', factor: 1 },
  'cloves': { system: 'count', factor: 1 },
  'head': { system: 'count', factor: 1 },
  'heads': { system: 'count', factor: 1 },
  'bulb': { system: 'count', factor: 1 },
  'bulbs': { system: 'count', factor: 1 },
  'stalk': { system: 'count', factor: 1 },
  'stalks': { system: 'count', factor: 1 },
  'stick': { system: 'count', factor: 1 },
  'sticks': { system: 'count', factor: 1 },
  'slice': { system: 'count', factor: 1 },
  'slices': { system: 'count', factor: 1 },
  'leaf': { system: 'count', factor: 1 },
  'leaves': { system: 'count', factor: 1 },
  'sprig': { system: 'count', factor: 1 },
  'sprigs': { system: 'count', factor: 1 },
  'bunch': { system: 'count', factor: 1 },
  'bunches': { system: 'count', factor: 1 },
  'ear': { system: 'count', factor: 1 },
  'ears': { system: 'count', factor: 1 },
  'fillet': { system: 'count', factor: 1 },
  'fillets': { system: 'count', factor: 1 },
  'strip': { system: 'count', factor: 1 },
  'strips': { system: 'count', factor: 1 },
  'whole': { system: 'count', factor: 1 },
  'large': { system: 'count', factor: 1 },  // e.g., "2 large eggs"
  'medium': { system: 'count', factor: 1 },
  'small': { system: 'count', factor: 1 },

  // Small quantity (base: pinch) - no conversion, just grouping
  'pinch': { system: 'small_quantity', factor: 1 },
  'pinches': { system: 'small_quantity', factor: 1 },
  'dash': { system: 'small_quantity', factor: 1 },
  'dashes': { system: 'small_quantity', factor: 1 },
  'drop': { system: 'small_quantity', factor: 1 },
  'drops': { system: 'small_quantity', factor: 1 },
  'smidgen': { system: 'small_quantity', factor: 1 },
  'handful': { system: 'small_quantity', factor: 1 },
  'handfuls': { system: 'small_quantity', factor: 1 },
  'scoop': { system: 'small_quantity', factor: 1 },
  'scoops': { system: 'small_quantity', factor: 1 },

  // Package units
  'pack': { system: 'package', factor: 1 },
  'packs': { system: 'package', factor: 1 },
  'packet': { system: 'package', factor: 1 },
  'packets': { system: 'package', factor: 1 },
  'can': { system: 'package', factor: 1 },
  'cans': { system: 'package', factor: 1 },
  'jar': { system: 'package', factor: 1 },
  'jars': { system: 'package', factor: 1 },
  'bottle': { system: 'package', factor: 1 },
  'bottles': { system: 'package', factor: 1 },
  'box': { system: 'package', factor: 1 },
  'boxes': { system: 'package', factor: 1 },
  'bag': { system: 'package', factor: 1 },
  'bags': { system: 'package', factor: 1 },
};

/**
 * Get the measurement system for a unit
 */
export function getMeasurementSystem(unit: string): MeasurementSystem {
  const normalized = unit.toLowerCase().trim();
  const conversion = CONVERSION_TO_BASE[normalized];
  return conversion?.system || 'unknown';
}

/**
 * Convert a quantity from one unit to the base unit of its measurement system
 */
export function convertToBase(quantity: number, unit: string): { quantity: number; system: MeasurementSystem; originalUnit: string } {
  const normalized = unit.toLowerCase().trim();
  const conversion = CONVERSION_TO_BASE[normalized];

  if (!conversion) {
    return { quantity, system: 'unknown', originalUnit: unit };
  }

  return {
    quantity: quantity * conversion.factor,
    system: conversion.system,
    originalUnit: unit,
  };
}

/**
 * Convert a quantity from base unit to a display-friendly unit
 */
export function convertFromBase(quantity: number, system: MeasurementSystem, originalUnit: string): { quantity: number; unit: string } {
  // For count, small_quantity, size, and package systems, keep the original unit
  if (['count', 'small_quantity', 'size', 'package', 'unknown'].includes(system)) {
    return { quantity: Math.round(quantity * 100) / 100, unit: originalUnit };
  }

  const thresholds = DISPLAY_THRESHOLDS[system];
  const baseUnit = BASE_UNITS[system];

  // Find the appropriate display unit based on quantity
  for (const { threshold, unit } of thresholds) {
    if (quantity >= threshold) {
      const conversion = CONVERSION_TO_BASE[unit];
      if (conversion) {
        const convertedQuantity = quantity / conversion.factor;
        return {
          quantity: Math.round(convertedQuantity * 100) / 100,
          unit,
        };
      }
    }
  }

  // Fallback to base unit
  return { quantity: Math.round(quantity * 100) / 100, unit: baseUnit };
}

/**
 * Check if two units can be combined (same measurement system)
 */
export function canCombineUnits(unit1: string, unit2: string): boolean {
  const system1 = getMeasurementSystem(unit1);
  const system2 = getMeasurementSystem(unit2);

  // Can't combine unknown units or units from different systems
  if (system1 === 'unknown' || system2 === 'unknown') {
    return false;
  }

  return system1 === system2;
}

/**
 * Create an aggregation key for an ingredient
 * Same ingredient + same measurement system = can be combined
 */
export function getAggregationKey(ingredientId: string, unit: string): string {
  const system = getMeasurementSystem(unit);
  return `${ingredientId}-${system}`;
}

/**
 * For count-system units of overridden ingredients, return a sub-key that
 * separates units already in the target unit (e.g. "clove" for garlic) from
 * units that need fromSize multiplication (e.g. "head", "piece").
 * This prevents 4 clove + 1 head from being summed as 5 pieces.
 *
 * Returns 'target' if the unit matches the override's toUnit, 'other' if not,
 * or null if no override applies or the system isn't count/size.
 */
export function getCountSubKey(ingredientName: string, unit: string, system: MeasurementSystem): string | null {
  if (system !== 'count' && system !== 'size') return null;

  const override = INGREDIENT_UNIT_OVERRIDES[ingredientName.toLowerCase().trim()];
  if (!override || override.fromSize === undefined) return null;

  const unitLower = unit.toLowerCase().trim();
  const targetLower = override.toUnit.toLowerCase();

  if (unitLower === targetLower || unitLower === targetLower + 's') {
    return 'target';
  }
  return 'other';
}

/**
 * Get the preferred unit for displaying a combined quantity
 * Tries to use the most common/practical unit for the quantity
 */
export function getPreferredDisplayUnit(quantity: number, system: MeasurementSystem, originalUnits: string[]): string {
  // For non-convertible systems, use the first original unit
  if (['count', 'small_quantity', 'size', 'package', 'unknown'].includes(system)) {
    return originalUnits[0] || 'unit';
  }

  // For weight and volume, pick appropriate unit based on quantity
  const result = convertFromBase(quantity, system, originalUnits[0]);
  return result.unit;
}
