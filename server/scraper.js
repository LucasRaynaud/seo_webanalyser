// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

// Fonction pour extraire les métriques de base avec Cheerio (plus rapide, sans navigateur)
async function extractBasicMetrics(url) {
  try {
    const startTime = performance.now();
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'fr,en;q=0.9',
      },
      timeout: 15000, // 15 secondes timeout
    });
    
    const loadTime = (performance.now() - startTime) / 1000; // en secondes
    
    const $ = cheerio.load(response.data);
    
    // Extraction des métriques
    const metaTitle = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Comptage des balises h1 et h2
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    
    // Récupération du premier h1 et des h2
    const h1Text = $('h1').first().text().trim();
    const h2Texts = [];
    $('h2').each((index, element) => {
      if (index < 10) { // Limite à 10 h2 pour éviter une trop grande taille de réponse
        h2Texts.push($(element).text().trim());
      }
    });
    
    return {
      url,
      loadTime,
      metaTitle,
      metaTitleLength: metaTitle.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      h1Count,
      h1Text,
      h2Count,
      h2Texts,
      hasMultipleH1: h1Count > 1,
      hasTooLongTitle: metaTitle.length > 60,
      hasTooLongDescription: metaDescription.length > 160,
      missingH1: h1Count === 0,
      missingTitle: metaTitle.length === 0,
      missingDescription: metaDescription.length === 0,
      statusCode: response.status,
      contentType: response.headers['content-type'],
    };
  } catch (error) {
    return {
      url,
      error: error.message,
      statusCode: error.response ? error.response.status : 500,
    };
  }
}

// Fonction pour extraire les métriques de performance avec Puppeteer (plus lent, mais plus précis)
async function extractPerformanceMetrics(url) {
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Collecte des métriques de performance
    await page.setRequestInterception(true);
    
    // Nombre total de requêtes
    let totalRequests = 0;
    let failedRequests = 0;
    
    page.on('request', request => {
      totalRequests++;
      request.continue();
    });
    
    page.on('requestfailed', request => {
      failedRequests++;
    });
    
    // Mesure du temps de chargement
    const startTime = performance.now();
    
    // Naviguer vers l'URL avec un timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const loadTime = (performance.now() - startTime) / 1000; // en secondes
    
    // Obtenir le FCP (First Contentful Paint)
    const fcpMetric = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('paint');
      const fcpEntry = perfEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    });
    
    // Évaluer le poids de la page (taille totale)
    const pageSize = await page.evaluate(() => {
      return document.documentElement.outerHTML.length;
    });
    
    // Récupérer le nombre d'images et leur attribut alt
    const imagesInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        hasAlt: img.hasAttribute('alt'),
        altText: img.getAttribute('alt') || '',
      })).slice(0, 20); // Limiter à 20 images
    });
    
    // Récupérer les éléments de schéma structuré
    const structuredData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.map(script => {
        try {
          return JSON.parse(script.textContent);
        } catch (e) {
          return { error: 'Invalid JSON' };
        }
      });
    });
    
    await browser.close();
    browser = null;
    
    return {
      url,
      loadTime,
      fcp: fcpMetric ? fcpMetric / 1000 : null, // en secondes
      pageSize: Math.round(pageSize / 1024), // en Ko
      totalRequests,
      failedRequests,
      imagesCount: imagesInfo.length,
      imagesWithoutAlt: imagesInfo.filter(img => !img.hasAlt).length,
      hasStructuredData: structuredData.length > 0,
    };
  } catch (error) {
    console.error(`Erreur lors de l'analyse de ${url} avec Puppeteer:`, error);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      url,
      error: error.message,
    };
  }
}

// Fonction principale pour analyser une page avec les deux méthodes
async function analyzePage(url) {
  try {
    // Extraction basique avec Cheerio (plus rapide)
    const basicMetrics = await extractBasicMetrics(url);
    
    // Si l'extraction basique a échoué, on retourne uniquement l'erreur
    if (basicMetrics.error) {
      return basicMetrics;
    }
    
    // Extraction des métriques de performance avec Puppeteer (plus lent mais plus précis)
    const performanceMetrics = await extractPerformanceMetrics(url);
    
    // Combinaison des résultats
    return {
      ...basicMetrics,
      ...performanceMetrics,
      // Calcul des scores SEO basés sur les métriques
      seoScore: calculateSEOScore(basicMetrics, performanceMetrics),
    };
  } catch (error) {
    console.error(`Erreur lors de l'analyse de ${url}:`, error);
    return {
      url,
      error: error.message,
    };
  }
}

// Fonction pour calculer un score SEO simple basé sur les métriques
function calculateSEOScore(basicMetrics, performanceMetrics) {
  let score = 100;
  
  // Pénalités pour les problèmes de contenu
  if (basicMetrics.missingTitle) score -= 15;
  if (basicMetrics.missingDescription) score -= 10;
  if (basicMetrics.missingH1) score -= 10;
  if (basicMetrics.hasMultipleH1) score -= 5;
  if (basicMetrics.hasTooLongTitle) score -= 5;
  if (basicMetrics.hasTooLongDescription) score -= 5;
  if (basicMetrics.h2Count === 0) score -= 5;
  
  // Pénalités pour les problèmes de performance
  if (performanceMetrics.loadTime > 3) score -= 10;
  if (performanceMetrics.loadTime > 5) score -= 15;
  if (performanceMetrics.fcp > 1.5) score -= 5;
  if (performanceMetrics.fcp > 3) score -= 10;
  if (performanceMetrics.imagesWithoutAlt > 0) {
    score -= Math.min(10, performanceMetrics.imagesWithoutAlt * 2);
  }
  if (!performanceMetrics.hasStructuredData) score -= 5;
  
  // Limiter le score entre 0 et 100
  return Math.max(0, Math.min(100, score));
}

module.exports = {
  analyzePage,
  extractBasicMetrics,
  extractPerformanceMetrics,
};