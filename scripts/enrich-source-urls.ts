/**
 * Script to enrich existing recipes with sourceUrl by:
 * 1. Reading URLs from an Excel file
 * 2. For Akis URLs: extract slug from URL and match with DB recipes using greeklish-to-English mapping
 * 3. For other URLs: scrape to get title and match exactly
 * 4. Update matched recipes with their sourceUrl
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';

const API_BASE = 'http://localhost:3000/api';

interface Recipe {
  id: string;
  title: string;
  sourceUrl: string | null;
}

interface MatchResult {
  url: string;
  recipeId: string;
  recipeTitle: string;
  matchMethod: 'slug' | 'scrape';
  confidence: number;
}

// Map greeklish slug keywords to their expected English title keywords
// Key = greeklish word that appears in URL slug
// Value = array of English words that should appear in the recipe title
const SLUG_TO_TITLE_MAP: Record<string, string[]> = {
  // Fruits
  'froytosalata': ['fruit salad'],
  'cheimwniatikh-froytosalata': ['winter fruit salad'],

  // Kebabs / Grilled meats
  'giaoyrtloy-kempap': ['lamb kebab', 'giaourtlou'],
  'doner-kebab': ['doner kebab', 'doner'],
  'kebab-kotopoulou': ['chicken kebab'],
  'souvlakia-kotopoulou': ['chicken skewers', 'souvlaki'],

  // Legumes
  'fakes': ['lentil'],
  'salata-me-fakes': ['lentil salad'],
  'fasolakia-ladera': ['green bean'],
  'gigantes-foyrnoy': ['giant beans', 'gigantes'],
  'fasolada': ['bean soup', 'fasolada'],
  'revithada': ['chickpea stew', 'revithada'],
  'salata-me-revithia': ['chickpea salad'],
  'revithia-me-spanaki': ['chickpea', 'spinach'],
  'salata-me-mayromatika-fasolia': ['black eyed peas', 'black-eyed'],
  'arakas-kokkinistos': ['pea stew', 'tomato pea'],
  'fava': ['fava', 'split pea'],
  'hummus': ['hummus'],

  // Vegetables
  'agkinares-ala-polita': ['artichoke'],
  'gemista': ['stuffed vegetables', 'gemista'],
  'gemista-me-kima': ['stuffed vegetables', 'ground meat'],
  'tourlou': ['vegetable stew', 'tourlou'],
  'pshta-lachanika': ['roasted vegetables', 'grilled vegetables'],
  'melitzanes': ['eggplant', 'aubergine'],
  'pshtes-melitzanes': ['eggplant', 'baked eggplant'],
  'imam-mpailnti': ['imam bayildi', 'imam'],
  'mpriam': ['briam'],
  'kolokythakia': ['zucchini'],
  'kolokythakia-gemista': ['stuffed zucchini'],

  // Meats
  'mpiftekia-ston-foyrno': ['burger', 'biftekia', 'patties'],
  'ta-mpiftekia-ths-mamas': ['burger', 'biftekia'],
  'ta-keftedakia-ths-giagias': ['meatballs', 'keftedes'],
  'xoirines-mprizoles': ['pork chops'],
  'kotopoylo-fileto': ['chicken fillet'],
  'arni-lemonato': ['lamb', 'lemon'],
  'moscharisies-mprizoles': ['beef steak', 'steak'],
  'elafry-kotopoylo-foyrnoy': ['roast chicken', 'baked chicken'],
  'snitsel-kotopoylo': ['chicken schnitzel'],
  'klasiko-snitsel': ['classic schnitzel', 'schnitzel'],
  'snitsel-choirino': ['pork schnitzel'],
  'moschari-kokkinisto': ['beef stew', 'tomato beef'],
  'kotopoylo-kokkinisto': ['chicken stew', 'tomato chicken'],
  'kotopoulo-me-kokkino-kari': ['red curry chicken', 'chicken curry'],
  'moscharaki-kari': ['beef curry'],

  // Rice dishes
  'spanakoryzo-kokkinisto': ['spinach rice', 'spanakorizo'],
  'kokkinisto-lachanoryzo': ['cabbage rice', 'lachanoryzo'],
  'prasoryzo': ['leek rice', 'prasorizo'],
  'atzem-pilafi': ['lamb', 'rice', 'pilaf', 'ajem'],
  'rizoto-me-manitaria': ['mushroom risotto'],

  // Soups
  'ntomatosoypa': ['tomato soup', 'tomato and bread'],
  'soypa-kolokythas': ['pumpkin soup'],
  'soypa-minestrone': ['minestrone'],
  'manitarosoupa': ['mushroom soup'],
  'kremmydosoupa': ['onion soup', 'french onion'],
  'kotosoupa': ['chicken soup'],
  'kreatosoypa-aygolemono': ['meat soup', 'avgolemono'],
  'trahanas-soypa': ['trahana soup', 'trahanosoupa'],

  // Pasta / Baked dishes
  'pastitsio': ['pastitsio'],
  'ntomatokeftedes': ['tomato fritters', 'tomatokeftedes'],
  'kolokythokeftedes': ['zucchini fritters'],
  'falafel': ['falafel'],
  'moysakas': ['moussaka'],
  'soyfle': ['souffle'],
  'gioyvetsi-keftedakia': ['meatball', 'orzo'],
  'gioyvetsi-moschari': ['beef', 'orzo', 'giouvetsi'],
  'karmponara': ['carbonara'],
  'makaronada-napolitana': ['napoletana', 'pasta'],
  'garidomakaronada': ['shrimp pasta'],
  'pesto-ala-genovese': ['pesto', 'genovese'],
  'rigkatoni-mpolonez': ['bolognese', 'rigatoni'],
  'kanelonia': ['cannelloni'],
  'lazania': ['lasagna', 'lasagne'],
  'gioyvarlakia-avgolemono': ['meatball soup', 'yuvarlakia'],
  'rigkatoni-me-ragoy-genovese': ['rigatoni', 'genovese', 'ragu'],

  // Eggs
  'ellhnika-scrambled-eggs': ['scrambled eggs', 'greek scrambled'],
  'omeleta-foyrnoy': ['omelet', 'omelette', 'baked'],

  // Other dishes
  'tyropita-koyroy': ['cheese pie', 'tyropita', 'kourou'],
  'goyakamole': ['guacamole'],
  'salata-kapreze': ['caprese'],
  'pantzarosalata': ['beetroot salad', 'beet salad'],
  'pitsa-margarita': ['pizza', 'margherita'],
  'patates-pshtes-ston-foyrno': ['roast potatoes', 'baked potatoes'],
  'paella': ['paella'],
  'patatosalata-me-avga': ['potato salad', 'eggs'],
  'chwriatikh-salata': ['greek salad', 'horiatiki'],
  'caesar-salad': ['caesar salad'],
  'fish-and-chips': ['fish and chips'],
  'giaoyrti-me-mhla': ['yogurt', 'apple', 'honey'],
  'cheeseburger': ['cheeseburger', 'burger'],
  'mpougiournti': ['bouyiourdi', 'baked feta', 'spicy feta'],
  'takos-me-kima': ['beef tacos', 'ground beef taco'],
  'tyrokauteri': ['cheese dip', 'tyrokafteri', 'spicy cheese'],
  'lachanontolmades': ['cabbage rolls'],
  'takos-me-kotopoylo': ['chicken tacos'],
  'tacos-me-moschari': ['beef tacos', 'fajita'],
  'lachmatzoyn': ['lahmacun'],
  'tampoyle': ['tabbouleh'],
  'poke-bowl': ['poke bowl', 'poke'],
  'poke-bowl-me-tartar-solomou': ['salmon', 'poke', 'tartare'],
};

// Normalize title for matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract slug from Akis URL
function extractAkisSlug(url: string): string | null {
  // URL format: https://akispetretzikis.com/en/recipe/1338/kolokythokeftedes
  const match = url.match(/akispetretzikis\.com(?:\/en)?\/recipe\/\d+\/([^\/\?]+)/);
  return match ? match[1] : null;
}

// Find best matching recipe for an Akis URL using the mapping table
function findBestMatchForAkis(slug: string, recipes: Recipe[]): { recipe: Recipe; score: number } | null {
  const titleLower = normalizeTitle(slug);

  // Try to find a mapping for this slug or any prefix of it
  let keywords: string[] | null = null;

  // First try exact slug match
  if (SLUG_TO_TITLE_MAP[slug]) {
    keywords = SLUG_TO_TITLE_MAP[slug];
  } else {
    // Try to find partial matches (e.g., "kolokythokeftedes" should match "kolokythokeftedes" key)
    for (const [key, values] of Object.entries(SLUG_TO_TITLE_MAP)) {
      if (slug.includes(key) || key.includes(slug)) {
        keywords = values;
        break;
      }
    }
  }

  if (!keywords) {
    return null;
  }

  // Find a recipe that contains any of the keywords
  let bestMatch: { recipe: Recipe; score: number } | null = null;

  for (const recipe of recipes) {
    const recipeTitleLower = normalizeTitle(recipe.title);

    // Check how many keywords match
    let matchCount = 0;
    for (const keyword of keywords) {
      if (recipeTitleLower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const score = matchCount / keywords.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { recipe, score };
      }
    }
  }

  return bestMatch;
}

// Fetch all recipes from the database
async function fetchAllRecipes(): Promise<Recipe[]> {
  const allRecipes: Recipe[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(`${API_BASE}/recipes?limit=${limit}&offset=${offset}&status=active`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) break;

    allRecipes.push(...data.data.map((r: any) => ({
      id: r.id,
      title: r.title,
      sourceUrl: r.sourceUrl,
    })));

    if (allRecipes.length >= data.pagination.total) break;
    offset += limit;
  }

  return allRecipes;
}

// Scrape a single URL to get the title (for non-Akis URLs)
async function scrapeUrl(url: string): Promise<{ title: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/scraper/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return { title: data.data.title || '' };
    }

    return { title: '', error: data.error || 'Unknown error' };
  } catch (error: any) {
    return { title: '', error: error.message };
  }
}

// Update a recipe with sourceUrl
async function updateRecipeSourceUrl(recipeId: string, sourceUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/recipes/${recipeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl }),
    });

    const data = await response.json();
    return data.status === 'success';
  } catch (error) {
    return false;
  }
}

async function main() {
  const excelPath = 'C:/Users/Kat/Desktop/recipe_urls.xlsx';

  console.log('Reading URLs from Excel file...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

  const urls = data.map(row => row[0]).filter(url => url && url.startsWith('http'));
  console.log(`Found ${urls.length} URLs`);

  // Separate Akis URLs from others
  const akisUrls = urls.filter(u => u.includes('akispetretzikis.com'));
  const otherUrls = urls.filter(u => !u.includes('akispetretzikis.com'));
  console.log(`  - Akis URLs: ${akisUrls.length}`);
  console.log(`  - Other URLs: ${otherUrls.length}`);

  console.log('\nFetching all recipes from database...');
  const recipes = await fetchAllRecipes();
  console.log(`Found ${recipes.length} recipes in database`);

  // Create a map for quick lookup by normalized title
  const recipesByTitle = new Map<string, Recipe[]>();
  for (const recipe of recipes) {
    const normalizedTitle = normalizeTitle(recipe.title);
    if (!recipesByTitle.has(normalizedTitle)) {
      recipesByTitle.set(normalizedTitle, []);
    }
    recipesByTitle.get(normalizedTitle)!.push(recipe);
  }

  const matches: MatchResult[] = [];
  const noMatch: { url: string; slug?: string; scrapedTitle?: string }[] = [];
  const errors: { url: string; error: string }[] = [];

  // Process Akis URLs using slug mapping
  console.log('\n--- Processing Akis URLs (slug mapping) ---');
  for (let i = 0; i < akisUrls.length; i++) {
    const url = akisUrls[i];
    const slug = extractAkisSlug(url);

    if (!slug) {
      console.log(`[${i + 1}/${akisUrls.length}] ❌ Could not extract slug from: ${url}`);
      errors.push({ url, error: 'Could not extract slug' });
      continue;
    }

    console.log(`[${i + 1}/${akisUrls.length}] Slug: ${slug}`);
    const result = findBestMatchForAkis(slug, recipes);

    if (result) {
      console.log(`  ✓ Matched (${(result.score * 100).toFixed(0)}%): "${result.recipe.title}"`);
      matches.push({
        url,
        recipeId: result.recipe.id,
        recipeTitle: result.recipe.title,
        matchMethod: 'slug',
        confidence: result.score,
      });
    } else {
      console.log(`  ⚠ No mapping found for slug`);
      noMatch.push({ url, slug });
    }
  }

  // Process other URLs using scraping
  console.log('\n--- Processing Other URLs (scraping) ---');
  for (let i = 0; i < otherUrls.length; i++) {
    const url = otherUrls[i];
    console.log(`[${i + 1}/${otherUrls.length}] Scraping: ${url.substring(0, 60)}...`);

    const result = await scrapeUrl(url);

    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
      errors.push({ url, error: result.error });
      continue;
    }

    if (!result.title) {
      console.log(`  ❌ No title found`);
      errors.push({ url, error: 'No title found' });
      continue;
    }

    const normalizedScrapedTitle = normalizeTitle(result.title);
    const matchedRecipes = recipesByTitle.get(normalizedScrapedTitle);

    if (matchedRecipes && matchedRecipes.length > 0) {
      const recipe = matchedRecipes[0];
      console.log(`  ✓ Matched: "${result.title}"`);
      matches.push({
        url,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        matchMethod: 'scrape',
        confidence: 1.0,
      });
    } else {
      console.log(`  ⚠ No match for: "${result.title}"`);
      noMatch.push({ url, scrapedTitle: result.title });
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n========== Summary ==========');
  console.log(`Total URLs: ${urls.length}`);
  console.log(`Matched: ${matches.length}`);
  console.log(`  - Via slug mapping: ${matches.filter(m => m.matchMethod === 'slug').length}`);
  console.log(`  - Via scrape: ${matches.filter(m => m.matchMethod === 'scrape').length}`);
  console.log(`No match: ${noMatch.length}`);
  console.log(`Errors: ${errors.length}`);

  if (matches.length > 0) {
    console.log('\n--- Updating recipes with sourceUrl ---');
    let updated = 0;
    let failed = 0;

    for (const match of matches) {
      const success = await updateRecipeSourceUrl(match.recipeId, match.url);
      if (success) {
        updated++;
        console.log(`  ✓ Updated: ${match.recipeTitle}`);
      } else {
        failed++;
        console.log(`  ❌ Failed: ${match.recipeTitle}`);
      }
    }

    console.log(`\nUpdated ${updated} recipes, ${failed} failed`);
  }

  // Save report
  const report = {
    matches,
    noMatch,
    errors,
    summary: {
      totalUrls: urls.length,
      matched: matches.length,
      matchedBySlug: matches.filter(m => m.matchMethod === 'slug').length,
      matchedByScrape: matches.filter(m => m.matchMethod === 'scrape').length,
      noMatch: noMatch.length,
      errors: errors.length,
    }
  };

  fs.writeFileSync('source-url-enrichment-report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to source-url-enrichment-report.json');

  // Also print unmatched URLs for manual review
  if (noMatch.length > 0) {
    console.log('\n--- Unmatched URLs (need manual review) ---');
    noMatch.forEach(n => {
      console.log(`  ${n.url}`);
      if (n.slug) console.log(`    Slug: ${n.slug}`);
      if (n.scrapedTitle) console.log(`    Title: ${n.scrapedTitle}`);
    });
  }
}

main().catch(console.error);
