import { Router } from 'express';
import { recipeScraperController } from '../controllers/recipeScraper.controller';
import { exec } from 'child_process';
import { forceCleanupBrowser, startPuppeteerJob, getPuppeteerJobStatus } from '../services/recipeScraper.service';

const router = Router();

// Scrape a single recipe
router.post('/recipe', (req, res) => recipeScraperController.scrapeRecipe(req, res));

// Scrape multiple recipes
router.post('/recipes', (req, res) => recipeScraperController.scrapeMultiple(req, res));

// Generate template from URLs
router.post('/generate-template', (req, res) => recipeScraperController.generateTemplate(req, res));

// Health check for scraper - quick ping to verify the server is responsive
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Start an async Puppeteer scraping job (returns immediately with job ID)
router.post('/puppeteer-job', (req, res) => {
  const { url, siteType } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ status: 'error', message: 'URL is required' });
  }

  if (!siteType || !['akis', 'argiro'].includes(siteType)) {
    return res.status(400).json({ status: 'error', message: 'siteType must be "akis" or "argiro"' });
  }

  const job = startPuppeteerJob(url, siteType);

  res.json({
    status: 'success',
    data: {
      jobId: job.id,
      url: job.url,
      siteType: job.siteType,
      status: job.status,
    },
  });
});

// Check status of a Puppeteer scraping job
router.get('/puppeteer-job/:id', (req, res) => {
  const job = getPuppeteerJobStatus(req.params.id);

  if (!job) {
    return res.status(404).json({ status: 'error', message: 'Job not found' });
  }

  res.json({
    status: 'success',
    data: {
      jobId: job.id,
      url: job.url,
      siteType: job.siteType,
      status: job.status,
      result: job.result,
      error: job.error,
      elapsedMs: Date.now() - job.startedAt,
    },
  });
});

// Kill any zombie Chrome/Chromium processes that might be stuck
router.post('/cleanup', async (req, res) => {
  try {
    // First, cleanup tracked browser instance
    await forceCleanupBrowser();

    // Then kill any lingering chromium processes on Windows
    await new Promise<void>((resolve) => {
      exec('taskkill /F /IM chrome.exe /T 2>nul & taskkill /F /IM chromium.exe /T 2>nul', () => {
        resolve(); // Ignore errors - processes might not exist
      });
    });

    res.json({
      status: 'ok',
      message: 'Cleanup completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.json({
      status: 'ok',
      message: 'Cleanup attempted',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
