import { api } from './api';

export interface ScrapedRecipeTemplate {
  Title: string;
  Description: string;
  Servings: number;
  PrepTime: number;
  CookTime: number;
  ImageUrl: string;
  Instructions: string;
  Tags: string;
  Ingredients: string;
  Calories: number | string;
  Protein: number | string;
  Carbs: number | string;
  Fat: number | string;
  Fiber: number | string;
  Sugar: number | string;
  Sodium: number | string;
  SourceUrl: string;
  Error: string;
}

export interface ScrapeResult {
  recipes: ScrapedRecipeTemplate[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface PuppeteerJobResponse {
  jobId: string;
  url: string;
  siteType: 'akis' | 'argiro';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  result?: any;
  error?: string;
  elapsedMs?: number;
}

export const scraperService = {
  /**
   * Scrape a single recipe from URL
   */
  async scrapeRecipe(url: string): Promise<ScrapedRecipeTemplate> {
    const response = await api.post('/scraper/recipe', { url }, { timeout: 60000 });
    return response.data.data;
  },

  /**
   * Scrape multiple recipes from URLs
   */
  async scrapeMultiple(urls: string[]): Promise<ScrapeResult> {
    const response = await api.post('/scraper/recipes', { urls }, { timeout: 600000 });
    return response.data.data;
  },

  /**
   * Generate template data from URLs
   * Timeout: 10 minutes (600 seconds) to allow for Puppeteer-based scraping
   */
  async generateTemplate(urls: string[]): Promise<ScrapeResult> {
    const response = await api.post('/scraper/generate-template', { urls }, { timeout: 600000 });
    return response.data.data;
  },

  /**
   * Check if scraper/backend is responsive
   * Quick 5-second timeout
   */
  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/scraper/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Cleanup any zombie browser processes
   */
  async cleanup(): Promise<void> {
    await api.post('/scraper/cleanup', {}, { timeout: 10000 });
  },

  /**
   * Start an async Puppeteer scraping job (returns immediately)
   */
  async startPuppeteerJob(url: string, siteType: 'akis' | 'argiro'): Promise<PuppeteerJobResponse> {
    const response = await api.post('/scraper/puppeteer-job', { url, siteType }, { timeout: 10000 });
    return response.data.data;
  },

  /**
   * Check status of a Puppeteer scraping job
   */
  async getPuppeteerJobStatus(jobId: string): Promise<PuppeteerJobResponse> {
    const response = await api.get(`/scraper/puppeteer-job/${jobId}`, { timeout: 5000 });
    return response.data.data;
  },
};
