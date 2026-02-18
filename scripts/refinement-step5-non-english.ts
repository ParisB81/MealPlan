/**
 * Step 5: Find and Translate Non-English Names
 * Detects Greek characters and other non-ASCII ingredient names.
 * Translates and merges with English equivalents.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Greek -> English translations for common ingredients
const GREEK_TRANSLATIONS: Record<string, string> = {
  'αλάτι': 'salt',
  'πιπέρι': 'pepper',
  'ελαιόλαδο': 'olive oil',
  'σκόρδο': 'garlic',
  'κρεμμύδι': 'onion',
  'κρεμμύδια': 'onion',
  'ντομάτα': 'tomato',
  'ντομάτες': 'tomato',
  'πατάτα': 'potato',
  'πατάτες': 'potato',
  'αυγό': 'egg',
  'αυγά': 'egg',
  'γάλα': 'milk',
  'βούτυρο': 'butter',
  'ζάχαρη': 'sugar',
  'αλεύρι': 'all-purpose flour',
  'ρύζι': 'rice',
  'μακαρόνια': 'pasta',
  'τυρί': 'cheese',
  'φέτα': 'feta cheese',
  'λεμόνι': 'lemon',
  'πορτοκάλι': 'orange',
  'μαϊντανός': 'parsley',
  'δυόσμος': 'mint',
  'δυόσμο': 'mint',
  'ρίγανη': 'oregano',
  'θυμάρι': 'thyme',
  'δάφνη': 'bay leaf',
  'κανέλα': 'cinnamon',
  'γαρύφαλλο': 'clove',
  'μοσχοκάρυδο': 'nutmeg',
  'κύμινο': 'cumin',
  'πάπρικα': 'paprika',
  'κόλιανδρο': 'coriander',
  'σουσάμι': 'sesame seeds',
  'μέλι': 'honey',
  'ξύδι': 'vinegar',
  'κρέμα': 'cream',
  'γιαούρτι': 'yogurt',
  'κοτόπουλο': 'chicken',
  'μοσχάρι': 'beef',
  'αρνί': 'lamb',
  'χοιρινό': 'pork',
  'ψάρι': 'fish',
  'γαρίδες': 'shrimp',
  'μελιτζάνα': 'eggplant',
  'κολοκύθι': 'zucchini',
  'κολοκυθάκια': 'zucchini',
  'μπρόκολο': 'broccoli',
  'σπανάκι': 'spinach',
  'μαρούλι': 'lettuce',
  'πιπεριά': 'bell pepper',
  'σέλινο': 'celery',
  'καρότο': 'carrot',
  'καρότα': 'carrot',
  'μανιτάρια': 'mushroom',
  'φασόλια': 'beans',
  'ρεβίθια': 'chickpea',
  'φακές': 'lentils',
  'αμύγδαλα': 'almond',
  'καρύδια': 'walnut',
  'φιστίκια': 'pistachios',
  'σταφίδες': 'raisin',
  'ελιές': 'olive',
  'κάπαρη': 'caper',
  'αντζούγιες': 'anchovies',
  'σόδα': 'baking soda',
  'μπέικιν πάουντερ': 'baking powder',
  'κρέμα γάλακτος': 'cream',
  'ζωμός κοτόπουλου': 'chicken broth',
  'ζωμός': 'broth',
};

async function mergeIngredient(oldId: string, oldName: string, newId: string, newName: string) {
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId: oldId }
  });

  for (const ri of recipeIngredients) {
    const existing = await prisma.recipeIngredient.findUnique({
      where: {
        recipeId_ingredientId: {
          recipeId: ri.recipeId,
          ingredientId: newId
        }
      }
    });

    if (existing) {
      if (existing.unit === ri.unit) {
        const newQty = Math.round((existing.quantity + ri.quantity) * 100) / 100;
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { quantity: newQty, notes: [existing.notes, ri.notes].filter(Boolean).join('; ') || null }
        });
      } else {
        const combinedNotes = [existing.notes, `Also: ${ri.quantity} ${ri.unit}`, ri.notes].filter(Boolean).join('; ');
        await prisma.recipeIngredient.update({
          where: { id: existing.id },
          data: { notes: combinedNotes || null }
        });
      }
      await prisma.recipeIngredient.delete({ where: { id: ri.id } });
    } else {
      await prisma.recipeIngredient.update({
        where: { id: ri.id },
        data: { ingredientId: newId }
      });
    }
  }

  const shopItems = await prisma.shoppingListItem.findMany({
    where: { ingredientId: oldId }
  });
  for (const si of shopItems) {
    await prisma.shoppingListItem.update({
      where: { id: si.id },
      data: { ingredientId: newId }
    });
  }

  await prisma.ingredient.delete({ where: { id: oldId } });
}

async function main() {
  const before = await prisma.ingredient.count();
  console.log(`\n=== Step 5: Translate Non-English Names ===`);
  console.log(`Ingredients before: ${before}\n`);

  const all = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });

  let translations = 0;
  let skipped = 0;

  // Find ingredients with non-ASCII characters
  const nonAscii = all.filter(ing => /[^\x00-\x7F]/.test(ing.name));
  console.log(`Found ${nonAscii.length} ingredients with non-ASCII characters:\n`);

  for (const ing of nonAscii) {
    const stillExists = await prisma.ingredient.findUnique({ where: { id: ing.id } });
    if (!stillExists) continue;

    // Check if name matches any known Greek translation
    const lowerName = ing.name.toLowerCase().trim();
    let translated: string | null = null;

    // Direct match
    if (GREEK_TRANSLATIONS[lowerName]) {
      translated = GREEK_TRANSLATIONS[lowerName];
    }

    // Try matching the main part (before any comma or space modifier)
    if (!translated) {
      const mainPart = lowerName.split(/[,\s]/)[0];
      if (GREEK_TRANSLATIONS[mainPart]) {
        translated = GREEK_TRANSLATIONS[mainPart];
      }
    }

    // Handle special characters like ® (registered trademark)
    if (!translated && /[®™©]/.test(ing.name)) {
      // Strip the trademark symbols
      const cleaned = ing.name.replace(/[®™©]/g, '').trim().toLowerCase();
      console.log(`  RENAME (strip trademark): "${ing.name}" -> "${cleaned}"`);
      try {
        const existing = await prisma.ingredient.findUnique({ where: { name: cleaned } });
        if (existing) {
          await mergeIngredient(ing.id, ing.name, existing.id, cleaned);
          translations++;
        } else {
          await prisma.ingredient.update({ where: { id: ing.id }, data: { name: cleaned } });
          translations++;
        }
      } catch (e) {
        console.log(`    -> Error: ${e}`);
        skipped++;
      }
      continue;
    }

    // Handle crème fraîche -> creme fraiche (already fine as-is, it's a recognized name)
    if (!translated && ing.name === 'crème fraîche') {
      console.log(`  KEEP: "${ing.name}" (recognized French culinary term)`);
      continue;
    }

    // Handle za'atar - it's a recognized spice name
    if (!translated && ing.name === "za'atar") {
      console.log(`  KEEP: "${ing.name}" (recognized spice name)`);
      continue;
    }

    if (translated) {
      const target = await prisma.ingredient.findUnique({ where: { name: translated } });
      if (target) {
        console.log(`  TRANSLATE+MERGE: "${ing.name}" -> "${translated}"`);
        await mergeIngredient(ing.id, ing.name, target.id, translated);
      } else {
        console.log(`  TRANSLATE: "${ing.name}" -> "${translated}"`);
        await prisma.ingredient.update({ where: { id: ing.id }, data: { name: translated } });
      }
      translations++;
    } else {
      const usage = await prisma.recipeIngredient.count({ where: { ingredientId: ing.id } });
      console.log(`  SKIP (no translation found): "${ing.name}" (${usage} recipes)`);
      skipped++;
    }
  }

  const after = await prisma.ingredient.count();
  console.log(`\nTranslations/fixes: ${translations}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Ingredients after: ${after}`);
  console.log(`Net reduction: ${before - after}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
