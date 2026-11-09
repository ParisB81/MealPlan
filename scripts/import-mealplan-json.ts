/**
 * Idempotent importer for mealplan-recipes-import.json (recipes + collections + meal plan).
 *
 * - Recipes are matched by title (case-insensitive, any status) → existing ones are skipped.
 * - Collections are matched by name (active) → created if missing; links upserted.
 * - The meal plan is matched by name → created if missing; only missing
 *   (date, mealType, recipe) entries are added.
 * Safe to run any number of times.
 *
 * Usage (from packages/backend so Prisma resolves):
 *   Dry run (default — prints the full parse, writes nothing):
 *     "C:\Program Files\nodejs\node.exe" "../../node_modules/tsx/dist/cli.mjs" "../../scripts/import-mealplan-json.ts"
 *   Apply:
 *     ... same command ... -- --apply
 *   Another file:
 *     ... -- --file "C:/path/to/file.json"
 *   Production: set $env:DATABASE_URL to the Railway public URL first.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const fileArg = process.argv.indexOf('--file');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = fileArg > -1 ? process.argv[fileArg + 1] : path.join(__dirname, '..', 'mealplan-recipes-import.json');
const USER_ID = 'temp-user-1';
const PLAN_NAME = 'Nov–Dec 2026 · 1,600 kcal';
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

// ── Types ──────────────────────────────────────────────────────────────────
interface JsonRecipe {
  id: string; name: string; mealType: string; collection?: string; servings: number;
  kcal: number | null; protein_g: number | null; ingredients: string[]; method: string;
  trainingDayTopUp: string | null; tags: string[];
}
interface JsonCollection { name: string; description?: string; recipeIds: string[] }
interface JsonDay {
  date: string; breakfast?: string | null; lunch?: string | null; snack?: string | null;
  dinner?: string | null; extra?: string | null;
}
interface ParsedIng { name: string; quantity: number; unit: string; notes?: string }

// ── Tag mapping ────────────────────────────────────────────────────────────
const MEAL_TAG: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Main Dishes', dinner: 'Main Dishes', snack: 'Snacks',
};

// ── Ingredient name aliases: cleaned JSON name → master ingredient name ───
// Qualifiers removed here (fat %, "dry", "cooked") are kept in RecipeIngredient.notes.
const ALIASES: Record<string, string> = {
  'feta': 'feta cheese',
  'wholegrain bread': 'whole wheat bread',
  'egg whites': 'egg white',
  'pomegranate seeds': 'pomegranate',
  'skimmed milk': 'milk',
  'brown lentils': 'lentils', 'green lentils': 'lentils',
  'tuna in water': 'tuna', 'tinned tuna': 'tuna',
  'chicken breast strips': 'chicken breast', 'chicken breast cubes': 'chicken breast',
  'grilled chicken breast': 'chicken breast',
  'garlic cloves': 'garlic', 'garlic clove': 'garlic',
  'chilli flakes': 'red pepper flakes',
  'red-wine vinegar': 'red wine vinegar',
  'courgette': 'zucchini',
  'potato wedges': 'potato',
  'pumpkin cubes': 'pumpkin',
  'skinless chicken thigh': 'chicken thigh',
  'lean turkey mince': 'ground turkey',
  '5%-fat beef mince': 'ground beef',
  'lean beef': 'beef',
  'raw peeled prawns': 'shrimp',
  'dry orzo': 'orzo',
  'wholewheat pasta': 'whole wheat pasta',
  'grated kefalotyri': 'kefalotyri',
  'cleaned fresh sardines': 'sardines', 'tinned sardines': 'sardines',
  'sliced turkey breast': 'turkey breast',
  'turkey breast steak': 'turkey breast',
  'light cheese': 'cheese',
  'lettuce': 'lettuce',
  'rocket': 'arugula',
  'spring onion': 'green onion', 'spring onions': 'green onion',
  'red pepper': 'red bell pepper', 'green pepper': 'green bell pepper',
  'pepper': 'bell pepper', 'peppers': 'bell pepper', 'roasted pepper': 'roasted red pepper',
  'large peppers': 'bell pepper',
  'olives': 'olive',
  'cherry tomatoes': 'cherry tomato',
  'eggs': 'egg',
  'pearl or small onions': 'pearl onion',
  'leeks': 'leek',
  'dried figs': 'dried fig', 'dates': 'date', 'mandarins': 'mandarin',
  'rice cakes': 'rice cake',
  'peeled roasted chestnuts': 'chestnut', 'roasted chestnuts': 'chestnut',
  'poached quince': 'quince',
  'roast beetroot': 'beet',
  'cabbage leaves': 'cabbage',
  'mackerel (kolios) fillet': 'mackerel', 'mackerel fillet': 'mackerel',
  'cod fillet': 'cod', 'sea bream fillet': 'sea bream', 'salmon fillet': 'salmon fillet',
  'mushrooms': 'mushroom',
  'fresh ginger': 'ginger',
  'mixed leaves': 'mixed salad greens', 'green salad': 'mixed salad greens',
  'side salad': 'mixed salad greens',
  'balsamic': 'balsamic vinegar',
  'cinnamon stick': 'cinnamon',
  'clove': 'cloves',
  'wine': 'white wine',
  'smoked salmon': 'smoked salmon',
  'low-fat cottage cheese': 'cottage cheese',
  'sweetcorn': 'corn',
  'wholegrain tortilla': 'whole wheat tortilla',
  'pumpkin purée': 'pumpkin',
  'pork tenderloin': 'pork tenderloin',
  'pearl barley': 'barley',
};

// Shopping-list category for master ingredients this import creates.
const NEW_CATEGORY: Record<string, string> = {
  'skyr': 'dairy', 'kefalotyri': 'dairy',
  'bulgur': 'grains', 'whole wheat pasta': 'grains', 'whole wheat tortilla': 'grains', 'rice cake': 'grains',
  'black-eyed peas': 'pulses', 'chestnut': 'nuts',
  'date': 'produce', 'mandarin': 'produce', 'mixed salad greens': 'produce', 'pearl onion': 'produce',
  'passata': 'pantry', 'turkey breast': 'meat',
};

// Words stripped off the front of a name and moved into notes.
const QUALIFIER_PREFIXES = [
  /^(0|2|5)%(-fat)?\s+/, /^dry\s+/, /^cooked\s+/, /^boiled\s+/, /^grated\s+/, /^raw\s+/,
  /^cleaned\s+/, /^peeled\s+/, /^tinned\s+/, /^fresh\s+/, /^ripe\s+/,
];
// Trailing comma parts that describe prep rather than another ingredient.
const PREP_WORDS = /^(grated|diced|drained|split|blanched|sliced|sliced thin|shredded|cubed|halved|toasted|in wedges|finely sliced|thin slices|diced small|cubed or mince|baked with cinnamon|to top|sliced thin)$/i;

// No-quantity items: dried spices / fresh herbs → pinch; leaves → handful; liquids → dash.
const PINCH = new Set(['cinnamon', 'oregano', 'cumin', 'paprika', 'nutmeg', 'thyme', 'chilli', 'red pepper flakes',
  'dill', 'parsley', 'mint', 'black pepper', 'coarse salt', 'salt', 'cloves', 'bay leaf']);
const HANDFUL = new Set(['arugula', 'lettuce', 'mixed salad greens', 'spinach', 'cabbage', 'celery', 'capers']);
const DASH = new Set(['vinegar', 'red wine vinegar', 'balsamic vinegar', 'soy sauce', 'white wine']);
const TSP = new Set(['mustard']);

// Lines the generic parser can't express well → explicit result.
const LINE_OVERRIDES: Record<string, ParsedIng[]> = {
  '1 can tuna in water (120 g drained)': [{ name: 'tuna', quantity: 120, unit: 'g', notes: 'canned in water, drained (1 can)' }],
  '1 can tuna in water (120 g)': [{ name: 'tuna', quantity: 120, unit: 'g', notes: 'canned in water, drained (1 can)' }],
  '1 wholegrain tortilla (60 g)': [{ name: 'whole wheat tortilla', quantity: 1, unit: 'piece', notes: '60 g' }],
  '1 pita (60 g)': [{ name: 'pita bread', quantity: 1, unit: 'piece', notes: '60 g' }],
  '80 g tzatziki (2% yogurt, cucumber, garlic, dill, ½ tsp oil)': [{ name: 'tzatziki', quantity: 80, unit: 'g', notes: '2% yogurt, cucumber, garlic, dill, ½ tsp oil' }],
  '150 g sea bream fillet (or a 300 g whole fish)': [{ name: 'sea bream', quantity: 150, unit: 'g', notes: 'fillet (or a 300 g whole fish)' }],
  '200 g horta (vlita or radikia)': [{ name: 'horta', quantity: 200, unit: 'g', notes: 'vlita or radikia' }],
  'Splash of red-wine vinegar': [{ name: 'red wine vinegar', quantity: 1, unit: 'dash' }],
  'Handful of spinach': [{ name: 'spinach', quantity: 1, unit: 'handful' }],
  'Juice of 1 lemon': [{ name: 'lemon', quantity: 1, unit: 'piece', notes: 'juice' }],
  '1 egg + juice of 1 lemon': [{ name: 'egg', quantity: 1, unit: 'piece' }, { name: 'lemon', quantity: 1, unit: 'piece', notes: 'juice' }],
  'Lemon, oregano, garlic marinade': [{ name: 'lemon', quantity: 1, unit: 'piece', notes: 'marinade' }, { name: 'oregano', quantity: 1, unit: 'pinch' }, { name: 'garlic', quantity: 1, unit: 'clove' }],
  'Tomato-onion salad': [{ name: 'tomato', quantity: 1, unit: 'piece', notes: 'salad' }, { name: 'onion', quantity: 0.5, unit: 'piece', notes: 'salad' }],
  'Side salad with 1 tsp olive oil': [{ name: 'mixed salad greens', quantity: 1, unit: 'handful', notes: 'side salad' }, { name: 'olive oil', quantity: 1, unit: 'tsp' }],
  'Cabbage-carrot salad with lemon': [{ name: 'cabbage', quantity: 1, unit: 'handful', notes: 'salad' }, { name: 'carrot', quantity: 1, unit: 'piece', notes: 'salad' }, { name: 'lemon', quantity: 1, unit: 'piece' }],
  '6–8 cabbage leaves, blanched': [{ name: 'cabbage', quantity: 7, unit: 'leaf', notes: '6–8 leaves, blanched' }],
  '50 g Greek yogurt + mustard dressing': [{ name: 'greek yogurt', quantity: 50, unit: 'g', notes: 'with mustard, as dressing' }, { name: 'mustard', quantity: 1, unit: 'tsp' }],
  'Splash of wine or stock, cinnamon stick, bay leaf': [{ name: 'white wine', quantity: 1, unit: 'dash', notes: 'or stock' }, { name: 'cinnamon', quantity: 1, unit: 'stick' }, { name: 'bay leaf', quantity: 1, unit: 'leaf' }],
  '1 bay leaf': [{ name: 'bay leaf', quantity: 1, unit: 'leaf' }],
  '3 dried figs (45 g)': [{ name: 'dried fig', quantity: 3, unit: 'piece', notes: '45 g' }],
  '90 g tinned sardines in water or grilled fresh': [{ name: 'sardines', quantity: 90, unit: 'g', notes: 'tinned in water, or grilled fresh' }],
  '150 g cleaned fresh sardines (or tinned in water)': [{ name: 'sardines', quantity: 150, unit: 'g', notes: 'cleaned fresh (or tinned in water)' }],
  '1 leek or spring onions': [{ name: 'leek', quantity: 1, unit: 'piece', notes: 'or spring onions' }],
  '100 g broccoli or cauliflower': [{ name: 'broccoli', quantity: 100, unit: 'g', notes: 'or cauliflower' }],
  '200 g cauliflower and broccoli florets': [{ name: 'cauliflower', quantity: 100, unit: 'g', notes: 'florets' }, { name: 'broccoli', quantity: 100, unit: 'g', notes: 'florets' }],
  '200 g broccoli, red pepper and carrot': [{ name: 'broccoli', quantity: 100, unit: 'g' }, { name: 'red bell pepper', quantity: 50, unit: 'g' }, { name: 'carrot', quantity: 50, unit: 'g' }],
  '150 g courgette, pepper, spinach and leek': [{ name: 'zucchini', quantity: 50, unit: 'g' }, { name: 'bell pepper', quantity: 40, unit: 'g' }, { name: 'spinach', quantity: 30, unit: 'g' }, { name: 'leek', quantity: 30, unit: 'g' }],
  '150 g tomato, onion and pepper': [{ name: 'tomato', quantity: 70, unit: 'g' }, { name: 'onion', quantity: 40, unit: 'g' }, { name: 'bell pepper', quantity: 40, unit: 'g' }],
  'Tomato and cucumber': [{ name: 'tomato', quantity: 1, unit: 'piece' }, { name: 'cucumber', quantity: 0.5, unit: 'piece' }],
  '10 g tahini + 50 g Greek yogurt + lemon': [{ name: 'tahini', quantity: 10, unit: 'g' }, { name: 'greek yogurt', quantity: 50, unit: 'g' }, { name: 'lemon', quantity: 1, unit: 'piece' }],
  '100 g low-fat cottage cheese or anthotyro': [{ name: 'cottage cheese', quantity: 100, unit: 'g', notes: 'low-fat, or anthotyro' }],
  '200 g low-fat cottage cheese (or anthotyro)': [{ name: 'cottage cheese', quantity: 200, unit: 'g', notes: 'low-fat, or anthotyro' }],
  '180 g cod fillet (fresh or frozen)': [{ name: 'cod', quantity: 180, unit: 'g', notes: 'fillet, fresh or frozen' }],
  '70 g dry white beans (soaked overnight)': [{ name: 'white beans', quantity: 70, unit: 'g', notes: 'dry, soaked overnight' }],
  '80 g pumpkin purée (roasted, mashed)': [{ name: 'pumpkin', quantity: 80, unit: 'g', notes: 'purée (roasted, mashed)' }],
  '80 g poached quince (no sugar)': [{ name: 'quince', quantity: 80, unit: 'g', notes: 'poached, no sugar' }],
  '130 g mackerel (kolios) fillet': [{ name: 'mackerel', quantity: 130, unit: 'g', notes: 'kolios, fillet' }],
  '120 g lean beef (5%), cubed or mince': [{ name: 'beef', quantity: 120, unit: 'g', notes: 'lean (5%), cubed or mince' }],
  '150 g grated tomato or passata': [{ name: 'tomato', quantity: 150, unit: 'g', notes: 'grated, or passata' }],
  '1 apple, baked with cinnamon': [{ name: 'apple', quantity: 1, unit: 'piece', notes: 'baked with cinnamon' }],
  'Lemon, coarse salt': [{ name: 'lemon', quantity: 1, unit: 'piece' }, { name: 'salt', quantity: 1, unit: 'pinch', notes: 'coarse' }],
  'Cumin, paprika, chilli': [{ name: 'cumin', quantity: 1, unit: 'pinch' }, { name: 'paprika', quantity: 1, unit: 'pinch' }, { name: 'red pepper flakes', quantity: 1, unit: 'pinch', notes: 'chilli' }],
  'Dill, pepper': [{ name: 'dill', quantity: 1, unit: 'pinch' }, { name: 'black pepper', quantity: 1, unit: 'pinch' }],
  '1 tbsp olive oil, split': [{ name: 'olive oil', quantity: 1, unit: 'tbsp', notes: 'split' }],
  '2 tsp olive oil, split; lemon': [{ name: 'olive oil', quantity: 2, unit: 'tsp', notes: 'split' }, { name: 'lemon', quantity: 1, unit: 'piece' }],
};

// ── Parsing ────────────────────────────────────────────────────────────────
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const UNIT_WORDS: Record<string, string> = {
  g: 'g', kg: 'kg', ml: 'ml', l: 'l', tsp: 'tsp', tbsp: 'tbsp',
  slice: 'slice', slices: 'slice', clove: 'clove', cloves: 'clove', leaf: 'leaf', leaves: 'leaf',
};

function parseQty(s: string): number | null {
  if (FRACTIONS[s] !== undefined) return FRACTIONS[s];
  const range = s.match(/^(\d+)[–-](\d+)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanName(raw: string): { name: string; notes: string[] } {
  let name = raw.trim().toLowerCase();
  const notes: string[] = [];
  // "(...)" → notes
  name = name.replace(/\s*\(([^)]*)\)\s*/g, (_m, inner) => { notes.push(inner.trim()); return ' '; }).trim();
  // Trailing serving phrases → notes ("skyr to top", "skyr on the side", "skyr with cinnamon")
  name = name.replace(/\s+(on the side|to top|with cinnamon)$/, (_m, p) => { notes.push(p); return ''; });
  if (ALIASES[name]) return { name: ALIASES[name], notes };
  for (const re of QUALIFIER_PREFIXES) {
    const m = name.match(re);
    if (m) { notes.push(m[0].trim()); name = name.slice(m[0].length); }
  }
  // "X garlic cloves" handled by unit detection; strip trailing "cloves" here as a fallback
  return { name: ALIASES[name] ?? name, notes };
}

function parsePart(part: string): ParsedIng {
  const p = part.trim();
  // <qty> [unit] <name>
  const m = p.match(/^([\d.,]+(?:[–-]\d+)?|[½¼¾⅓⅔])\s+(.+)$/);
  if (m) {
    const qty = parseQty(m[1]) ?? 1;
    let rest = m[2];
    let unit = 'piece';
    const first = rest.split(/\s+/)[0].toLowerCase();
    if (UNIT_WORDS[first]) {
      unit = UNIT_WORDS[first];
      rest = rest.slice(first.length).trim().replace(/^of\s+/, '');
    } else {
      // "2 garlic cloves" → clove of garlic
      const cl = rest.match(/^(.+?)\s+(cloves?|sticks?)$/i);
      if (cl) { unit = cl[2].toLowerCase().startsWith('clove') ? 'clove' : 'stalk'; rest = cl[1]; }
      // size words "1 medium banana", "1 small leek", "2 large peppers"
      const sz = rest.match(/^(small|medium|large)\s+(.+)$/i);
      if (sz) { unit = 'piece'; rest = sz[2]; const { name, notes } = cleanName(rest); return { name, quantity: qty, unit, notes: [sz[1].toLowerCase(), ...notes].join(', ') || undefined }; }
    }
    const { name, notes } = cleanName(rest);
    return { name, quantity: qty, unit, notes: notes.join(', ') || undefined };
  }
  // No quantity → seasoning / leaves / produce default
  const { name, notes } = cleanName(p);
  let unit = 'piece';
  if (PINCH.has(name)) unit = 'pinch';
  else if (HANDFUL.has(name)) unit = 'handful';
  else if (DASH.has(name)) unit = 'dash';
  else if (TSP.has(name)) unit = 'tsp';
  if (name === 'garlic') unit = 'clove';
  if (name === 'bay leaf') unit = 'leaf';
  if (name === 'capers') unit = 'tsp';
  // "to taste" only for seasonings; plain produce keeps just its qualifiers
  const toTaste = ['pinch', 'dash', 'tsp'].includes(unit) || name === 'lemon';
  return { name, quantity: 1, unit, notes: [...notes, ...(toTaste ? ['to taste'] : [])].join(', ') || undefined };
}

function parseLine(line: string): ParsedIng[] {
  if (LINE_OVERRIDES[line]) return LINE_OVERRIDES[line];
  const out: ParsedIng[] = [];
  // Split on "+" first, then commas/semicolons (outside parentheses)
  for (const plusPart of line.split(/\s+\+\s+/)) {
    const parts = plusPart.split(/[,;](?![^(]*\))/).map(s => s.trim()).filter(Boolean)
      .flatMap(s => (/\s+and\s+/.test(s) && !/\d/.test(s) ? s.split(/\s+and\s+/) : [s]));
    for (const part of parts) {
      if (PREP_WORDS.test(part) && out.length) {
        const prev = out[out.length - 1];
        prev.notes = [prev.notes, part.toLowerCase()].filter(Boolean).join(', ');
        continue;
      }
      out.push(parsePart(part));
    }
  }
  return out;
}

/** Merge rows that hit the same ingredient (unique recipeId+ingredientId). */
function mergeSameIngredient(rows: ParsedIng[]): ParsedIng[] {
  const byName = new Map<string, ParsedIng>();
  for (const r of rows) {
    const ex = byName.get(r.name);
    if (!ex) { byName.set(r.name, { ...r }); continue; }
    if (ex.unit === r.unit) ex.quantity += r.quantity;
    else ex.notes = [ex.notes, `+ ${r.quantity} ${r.unit}${r.notes ? ' ' + r.notes : ''}`].filter(Boolean).join('; ');
    if (ex.unit === r.unit && r.notes && r.notes !== ex.notes) ex.notes = [ex.notes, r.notes].filter(Boolean).join('; ');
  }
  return [...byName.values()];
}

function splitMethod(method: string): string[] {
  const steps = method.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s => s.trim()).filter(Boolean);
  return steps.length ? steps : [method];
}

const utcDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8')) as {
    recipes: JsonRecipe[]; collections: JsonCollection[]; mealPlan?: JsonDay[];
  };
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${FILE}`);
  console.log(`DB: ${(process.env.DATABASE_URL || '').replace(/\/\/.*@/, '//***@')}\n`);

  await prisma.user.upsert({
    where: { id: USER_ID }, update: {},
    create: { id: USER_ID, email: 'demo@mealplan.app', name: 'Demo User' },
  });

  // Ingredient lookup (name → id), with simple plural fallback.
  const allIngs = await prisma.ingredient.findMany({ select: { id: true, name: true } });
  const ingByName = new Map(allIngs.map(i => [i.name, i.id]));
  // Per-database fallbacks (production's ingredient list was refined differently from local).
  const FALLBACKS: Record<string, string[]> = {
    'greek yogurt': ['greek yogurt (low fat)', 'greek yogurt (full fat)', 'strained yogurt'],
  };
  const resolveName = (n: string) => {
    if (ingByName.has(n)) return n;
    const fb = FALLBACKS[n]?.find(f => ingByName.has(f));
    if (fb) return fb;
    if (n.endsWith('es') && ingByName.has(n.slice(0, -2))) return n.slice(0, -2);
    if (n.endsWith('s') && ingByName.has(n.slice(0, -1))) return n.slice(0, -1);
    return n;
  };
  const newIngredients = new Set<string>();

  // ── 1. Recipes ──
  const jsonIdToDbId = new Map<string, string>();
  let created = 0, skipped = 0;
  for (const r of data.recipes) {
    const rows = mergeSameIngredient(r.ingredients.flatMap(parseLine).map(i => ({ ...i, name: resolveName(i.name) })));
    rows.forEach(i => { if (!ingByName.has(i.name)) newIngredients.add(i.name); });

    const existing = await prisma.recipe.findFirst({
      where: { title: { equals: r.name, mode: 'insensitive' } }, select: { id: true, status: true },
    });
    if (existing) {
      jsonIdToDbId.set(r.id, existing.id);
      skipped++;
      console.log(`= ${r.id.padEnd(4)} ${r.name}  (exists${existing.status !== 'active' ? `, ${existing.status}` : ''} — skipped)`);
      continue;
    }

    const tags = [...new Set([...r.tags, MEAL_TAG[r.mealType], 'AI'].filter(Boolean))];
    console.log(`+ ${r.id.padEnd(4)} ${r.name}  [${r.kcal} kcal, ${r.protein_g} g P]  tags: ${tags.join(', ')}`);
    r.ingredients.forEach(line => {
      const parsed = parseLine(line).map(i => `${i.quantity} ${i.unit} ${resolveName(i.name)}${ingByName.has(resolveName(i.name)) ? '' : ' (NEW)'}${i.notes ? ` — ${i.notes}` : ''}`);
      console.log(`      "${line}"  →  ${parsed.join('  |  ')}`);
    });

    if (!APPLY) { jsonIdToDbId.set(r.id, `dry-${r.id}`); created++; continue; }

    const ingredientCreates = [];
    for (const i of rows) {
      let id = ingByName.get(i.name);
      if (!id) {
        const ing = await prisma.ingredient.upsert({ where: { name: i.name }, update: {}, create: { name: i.name, category: NEW_CATEGORY[i.name] ?? null } });
        id = ing.id; ingByName.set(i.name, id);
      }
      ingredientCreates.push({ ingredientId: id, quantity: Math.round(i.quantity * 100) / 100, unit: i.unit, notes: i.notes ?? null });
    }
    const rec = await prisma.recipe.create({
      data: {
        userId: USER_ID,
        title: r.name,
        description: r.trainingDayTopUp ? `Training-day top-up: ${r.trainingDayTopUp}` : null,
        servings: r.servings || 1,
        instructions: JSON.stringify(splitMethod(r.method)),
        tags: tags.join(','),
        ingredients: { create: ingredientCreates },
        nutrition: (r.kcal != null || r.protein_g != null)
          ? { create: { calories: r.kcal ?? null, protein: r.protein_g ?? null } } : undefined,
      },
    });
    jsonIdToDbId.set(r.id, rec.id);
    created++;
  }
  console.log(`\nRecipes: ${created} to create, ${skipped} skipped (already exist)`);
  console.log(`New master ingredients (${newIngredients.size}): ${[...newIngredients].sort().join(', ')}\n`);

  // ── 2. Collections ──
  // Explicit "collections" list, plus any collection named only in a recipe's own
  // "collection" field (e.g. "Everyday"), so every recipe lands in its group.
  const collections: JsonCollection[] = [...data.collections];
  const listed = new Set(collections.map(c => c.name));
  const derived = new Map<string, string[]>();
  for (const r of data.recipes) {
    if (r.collection && !listed.has(r.collection)) derived.set(r.collection, [...(derived.get(r.collection) ?? []), r.id]);
  }
  for (const [name, recipeIds] of derived) {
    collections.push({ name, description: `${name} recipes from the Nov–Dec 2026 1,600 kcal plan.`, recipeIds });
  }
  for (const c of collections) {
    let col = await prisma.recipeCollection.findFirst({ where: { userId: USER_ID, name: c.name, status: 'active' } });
    const recipeDbIds = c.recipeIds.map(id => jsonIdToDbId.get(id)).filter((x): x is string => !!x);
    if (!APPLY) {
      console.log(`Collection "${c.name}": ${col ? 'exists' : 'create'}, ${recipeDbIds.length} recipes`);
      continue;
    }
    if (!col) col = await prisma.recipeCollection.create({ data: { userId: USER_ID, name: c.name, description: c.description ?? null } });
    const before = await prisma.recipeCollectionItem.count({ where: { collectionId: col.id } });
    await prisma.recipeCollectionItem.createMany({
      data: recipeDbIds.map(recipeId => ({ collectionId: col!.id, recipeId })), skipDuplicates: true,
    });
    const after = await prisma.recipeCollectionItem.count({ where: { collectionId: col.id } });
    console.log(`Collection "${c.name}": ${after - before} linked (${after} total)`);
  }

  // ── 3. Meal plan ──
  if (data.mealPlan?.length) {
    const days = data.mealPlan;
    const start = utcDate(days[0].date), end = utcDate(days[days.length - 1].date);
    let plan = await prisma.mealPlan.findFirst({ where: { userId: USER_ID, name: PLAN_NAME, status: { not: 'deleted' } } });
    const wanted: { date: Date; mealType: string; recipeId: string; notes: string | null }[] = [];
    for (const day of days) {
      for (const mt of MEAL_TYPES) {
        const jid = day[mt];
        if (!jid) continue;
        const recipeId = jsonIdToDbId.get(jid);
        if (!recipeId) { console.warn(`  ! ${day.date} ${mt}: unknown recipe ${jid}`); continue; }
        wanted.push({ date: utcDate(day.date), mealType: mt, recipeId, notes: mt === 'snack' && day.extra ? `Extra: ${day.extra}` : null });
      }
    }
    if (!APPLY) {
      console.log(`\nMeal plan "${PLAN_NAME}": ${plan ? 'exists' : 'create'} ${ymd(start)} → ${ymd(end)}, ${wanted.length} meals`);
    } else {
      if (!plan) plan = await prisma.mealPlan.create({ data: { userId: USER_ID, name: PLAN_NAME, startDate: start, endDate: end, numberOfPersons: 1 } });
      const existing = await prisma.mealPlanRecipe.findMany({ where: { mealPlanId: plan.id }, select: { date: true, mealType: true, recipeId: true } });
      const have = new Set(existing.map(e => `${ymd(e.date)}|${e.mealType}|${e.recipeId}`));
      const toAdd = wanted.filter(w => !have.has(`${ymd(w.date)}|${w.mealType}|${w.recipeId}`));
      if (toAdd.length) await prisma.mealPlanRecipe.createMany({ data: toAdd.map(w => ({ ...w, mealPlanId: plan!.id, servings: 1 })) });
      // Never shrink a plan the user may have extended
      if (plan.startDate > start || plan.endDate < end) {
        await prisma.mealPlan.update({ where: { id: plan.id }, data: {
          startDate: plan.startDate > start ? start : plan.startDate, endDate: plan.endDate < end ? end : plan.endDate } });
      }
      console.log(`\nMeal plan "${PLAN_NAME}" (${plan.id}): ${toAdd.length} meals added, ${wanted.length - toAdd.length} already present`);
    }
  }

  if (!APPLY) console.log('\nDry run only — re-run with --apply to write.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
