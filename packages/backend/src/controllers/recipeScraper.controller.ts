import { Request, Response } from 'express';
import { recipeScraperService, ScrapedRecipe } from '../services/recipeScraper.service';

// URL limits to prevent server freezing
// Puppeteer-based sites (Akis, Argiro) are scraped in isolated child processes (one at a time)
const MAX_TOTAL_URLS = 25;
const MAX_PUPPETEER_URLS = 5; // Each scraped in isolated child process, Chrome killed between each
const PUPPETEER_HOSTS = ['akispetretzikis.com', 'argiro.gr'];

/**
 * Count how many URLs are from Puppeteer-based sites
 */
function countPuppeteerUrls(urls: string[]): number {
  return urls.filter((url) => {
    try {
      const hostname = new URL(url).hostname;
      return PUPPETEER_HOSTS.some((host) => hostname.includes(host));
    } catch {
      return false;
    }
  }).length;
}

export class RecipeScraperController {
  /**
   * Scrape a single recipe from a URL
   * POST /api/scraper/recipe
   * Body: { url: string }
   */
  async scrapeRecipe(req: Request, res: Response) {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required',
      });
    }

    try {
      const recipe = await recipeScraperService.scrapeRecipe(url);

      if (recipe.error) {
        return res.status(400).json({
          status: 'error',
          message: recipe.error,
          data: recipe,
        });
      }

      return res.json({
        status: 'success',
        data: recipe,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to scrape recipe',
      });
    }
  }

  /**
   * Scrape multiple recipes from URLs
   * POST /api/scraper/recipes
   * Body: { urls: string[] }
   */
  async scrapeMultiple(req: Request, res: Response) {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'URLs array is required',
      });
    }

    if (urls.length > MAX_TOTAL_URLS) {
      return res.status(400).json({
        status: 'error',
        message: `Maximum ${MAX_TOTAL_URLS} URLs allowed per request`,
      });
    }

    const puppeteerUrlCount = countPuppeteerUrls(urls);
    if (puppeteerUrlCount > MAX_PUPPETEER_URLS) {
      return res.status(400).json({
        status: 'error',
        message: `Maximum ${MAX_PUPPETEER_URLS} URLs from Akis/Argiro allowed per request (you have ${puppeteerUrlCount}). These sites require headless browser which can cause server issues.`,
      });
    }

    try {
      const recipes = await recipeScraperService.scrapeMultiple(urls);

      const successful = recipes.filter((r) => !r.error);
      const failed = recipes.filter((r) => r.error);

      return res.json({
        status: 'success',
        data: {
          recipes,
          summary: {
            total: recipes.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to scrape recipes',
      });
    }
  }

  /**
   * Generate Excel template from scraped recipes
   * POST /api/scraper/generate-template
   * Body: { urls: string[] }
   * Returns: Excel file download
   */
  async generateTemplate(req: Request, res: Response) {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'URLs array is required',
      });
    }

    if (urls.length > MAX_TOTAL_URLS) {
      return res.status(400).json({
        status: 'error',
        message: `Maximum ${MAX_TOTAL_URLS} URLs allowed per request`,
      });
    }

    const puppeteerUrlCount = countPuppeteerUrls(urls);
    if (puppeteerUrlCount > MAX_PUPPETEER_URLS) {
      return res.status(400).json({
        status: 'error',
        message: `Maximum ${MAX_PUPPETEER_URLS} URLs from Akis/Argiro allowed per request (you have ${puppeteerUrlCount}). These sites require headless browser which can cause server issues.`,
      });
    }

    try {
      const recipes = await recipeScraperService.scrapeMultiple(urls);

      // We'll return the recipes as JSON and let the frontend generate the Excel
      // This avoids adding xlsx as a backend dependency (it's already in frontend)
      return res.json({
        status: 'success',
        data: {
          recipes: recipes.map((r) => ({
            Title: r.title,
            Description: r.description,
            Servings: r.servings,
            PrepTime: r.prepTime,
            CookTime: r.cookTime,
            ImageUrl: r.imageUrl,
            Instructions: r.instructions,
            Tags: r.tags,
            Ingredients: r.ingredients,
            Calories: r.calories || '',
            Protein: r.protein || '',
            Carbs: r.carbs || '',
            Fat: r.fat || '',
            Fiber: r.fiber || '',
            Sugar: r.sugar || '',
            Sodium: r.sodium || '',
            SourceUrl: r.sourceUrl,
            Error: r.error || '',
          })),
          summary: {
            total: recipes.length,
            successful: recipes.filter((r) => !r.error).length,
            failed: recipes.filter((r) => r.error).length,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to generate template',
      });
    }
  }
}

export const recipeScraperController = new RecipeScraperController();
