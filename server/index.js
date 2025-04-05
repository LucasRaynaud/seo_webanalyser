// server/index.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ajoutez ces lignes en haut du fichier server/index.js
const { analyzePage, extractBasicMetrics } = require('./scraper');

// Ajoutez ces routes après la route de crawl

// Route pour analyser une seule page
app.post('/api/analyze-page', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }
  
  try {
    const analysis = await analyzePage(url);
    res.json(analysis);
  } catch (error) {
    console.error('Erreur d\'analyse:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de la page' });
  }
});

// Route pour analyser toutes les pages d'un crawl
app.post('/api/analyze-site', async (req, res) => {
  const { pages, fullAnalysis = false } = req.body;
  
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Liste de pages requise' });
  }
  
  try {
    // Limiter le nombre de pages à analyser pour éviter une surcharge
    const pagesToAnalyze = pages.slice(0, 50).map(page => page.url);
    const startTime = Date.now();
    
    // Analyser les pages en parallèle, mais limiter le nombre de requêtes simultanées
    const results = [];
    const batchSize = 5; // Nombre de pages à analyser simultanément
    
    for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
      const batch = pagesToAnalyze.slice(i, i + batchSize);
      
      // Choisir la méthode d'analyse en fonction du paramètre fullAnalysis
      const analysisPromises = batch.map(url => 
        fullAnalysis ? analyzePage(url) : extractBasicMetrics(url)
      );
      
      // Attendre que toutes les analyses du lot soient terminées
      const batchResults = await Promise.all(analysisPromises);
      results.push(...batchResults);
      
      // Informer le client de la progression
      const progress = Math.min(100, Math.round((i + batchSize) / pagesToAnalyze.length * 100));
      console.log(`Progression de l'analyse: ${progress}%`);
    }
    
    const totalTime = (Date.now() - startTime) / 1000; // en secondes
    
    // Calcul des statistiques globales
    const stats = calculateSiteStats(results);
    
    res.json({
      results,
      stats,
      totalPages: results.length,
      totalTime,
    });
  } catch (error) {
    console.error('Erreur d\'analyse du site:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse du site' });
  }
});

// Fonction pour calculer les statistiques globales du site
function calculateSiteStats(results) {
  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    return { error: 'Aucune page analysée avec succès' };
  }
  
  // Calcul des moyennes et des pourcentages
  const stats = {
    averageLoadTime: average(validResults.map(r => r.loadTime || 0)),
    averageFCP: average(validResults.filter(r => r.fcp).map(r => r.fcp)),
    averageTitleLength: average(validResults.map(r => r.metaTitleLength || 0)),
    averageDescriptionLength: average(validResults.map(r => r.metaDescriptionLength || 0)),
    
    pagesWithTitle: percentage(validResults, r => !r.missingTitle),
    pagesWithDescription: percentage(validResults, r => !r.missingDescription),
    pagesWithH1: percentage(validResults, r => !r.missingH1),
    pagesWithMultipleH1: percentage(validResults, r => r.hasMultipleH1),
    pagesWithH2: percentage(validResults, r => r.h2Count > 0),
    
    // Statistiques de performance (si disponibles)
    averagePageSize: average(validResults.filter(r => r.pageSize).map(r => r.pageSize)),
    averageSEOScore: average(validResults.filter(r => r.seoScore).map(r => r.seoScore)),
    
    // Pages avec problèmes
    pagesWithErrors: results.filter(r => r.error).length,
    pagesWithPerformanceIssues: validResults.filter(r => r.loadTime > 3).length,
    
    // Totaux
    totalPages: results.length,
    successfullyAnalyzed: validResults.length,
  };
  
  return stats;
}

// Fonctions utilitaires pour les statistiques
function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function percentage(results, predicate) {
  if (results.length === 0) return 0;
  return (results.filter(predicate).length / results.length) * 100;
}

// Fonction pour normaliser les URLs et supprimer les ancres (#)
function normalizeURL(baseURL, url) {
  try {
    const parsedURL = new URL(url, baseURL);
    
    // Supprimer le hash (ancre) de l'URL
    parsedURL.hash = '';
    
    // Vérifier si l'URL doit être exclue
    if (shouldExcludeURL(parsedURL.href)) {
      return null;
    }
    
    return parsedURL.href;
  } catch (error) {
    return null;
  }
}

// Fonction pour extraire le domaine de l'URL
function extractDomain(url) {
  try {
    const parsedURL = new URL(url);
    return parsedURL.hostname;
  } catch (error) {
    return null;
  }
}

// Fonction pour vérifier si une URL doit être exclue du crawl
function shouldExcludeURL(url) {
  try {
    const parsedURL = new URL(url);
    
    // Extensions à exclure
    const excludedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', 
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.rar', '.tar', '.gz', '.mp4', '.mp3', '.avi', '.mov'
    ];
    
    const pathname = parsedURL.pathname.toLowerCase();
    
    // Vérifier les extensions
    for (const ext of excludedExtensions) {
      if (pathname.endsWith(ext)) {
        console.log(`Exclu (extension): ${url}`);
        return true;
      }
    }
    
    // Vérifier la présence de paramètres dans l'URL
    if (parsedURL.search && parsedURL.search.length > 0) {
      console.log(`Exclu (paramètres): ${url}`);
      return true;
    }
    
    return false;
  } catch (error) {
    return true; // En cas d'erreur, exclure l'URL
  }
}

// Fonction pour crawler une page
async function crawlPage(url, baseURL, baseDomain, visitedUrls = new Set(), maxPages = 100, excludedUrls = new Set()) {
  // Normaliser l'URL pour éviter les duplications
  const normalizedURL = normalizeURL(url, url);
  
  // Si l'URL est à exclure, l'ajouter à la liste des URLs exclues et retourner un tableau vide
  if (!normalizedURL || shouldExcludeURL(normalizedURL)) {
    if (url) {
      excludedUrls.add(url);
    }
    return [];
  }
  
  // Si on a atteint le nombre maximum de pages ou si l'URL a déjà été visitée
  if (visitedUrls.size >= maxPages || visitedUrls.has(normalizedURL)) {
    return [];
  }

  // Marquer l'URL comme visitée
  visitedUrls.add(normalizedURL);

  try {
    console.log(`Crawling: ${normalizedURL} [${visitedUrls.size}/${maxPages}]`);
    const response = await axios.get(normalizedURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'fr,en;q=0.9',
      },
      timeout: 15000, // 15 secondes timeout
      maxRedirects: 5, // Limiter le nombre de redirections
    });

    const $ = cheerio.load(response.data);
    const pageInfo = {
      url: normalizedURL,
      title: $('title').text().trim(),
      status: response.status,
      contentType: response.headers['content-type'],
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text().trim(),
      canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
      links: [],
      internalLinksCount: 0,
      externalLinksCount: 0,
      hasHreflang: $('link[rel="alternate"][hreflang]').length > 0,
      responseTime: response.headers['x-response-time'] || null,
    };

    // Extraire tous les liens de la page
    const links = [];
    const uniqueLinks = new Set(); // Pour éviter les doublons immédiatement
    let internalLinksCount = 0;
    let externalLinksCount = 0;
    
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        // Ignorer les liens vides ou javascript:
        if (!href || href.startsWith('javascript:') || href === '#') {
          return;
        }
        
        // Ignorer les liens qui sont purement des ancres
        if (href.startsWith('#')) {
          return;
        }
        
        const normalizedURL = normalizeURL(url, href);
        if (normalizedURL && !shouldExcludeURL(normalizedURL)) {
          const linkDomain = extractDomain(normalizedURL);
          
          // Vérifier si c'est un lien interne ou externe
          if (linkDomain === baseDomain) {
            internalLinksCount++;
            
            // Ne suivre que les liens internes non visités
            if (!uniqueLinks.has(normalizedURL)) {
              uniqueLinks.add(normalizedURL);
              links.push(normalizedURL);
              pageInfo.links.push({
                url: normalizedURL,
                text: $(element).text().trim() || $(element).attr('title') || '',
                isInternal: true
              });
            }
          } else if (linkDomain) {
            // C'est un lien externe
            externalLinksCount++;
            pageInfo.links.push({
              url: normalizedURL, 
              text: $(element).text().trim() || $(element).attr('title') || '',
              isInternal: false
            });
          }
        } else if (href) {
          // Si c'est un lien à exclure, l'ajouter aux URLs exclues
          excludedUrls.add(href);
        }
      }
    });
    
    // Mettre à jour les compteurs
    pageInfo.internalLinksCount = internalLinksCount;
    pageInfo.externalLinksCount = externalLinksCount;

    // Récursivement crawler les liens trouvés
    const results = [pageInfo];
    for (const link of links) {
      if (!visitedUrls.has(link) && visitedUrls.size < maxPages) {
        const childResults = await crawlPage(link, baseURL, baseDomain, visitedUrls, maxPages, excludedUrls);
        results.push(...childResults);
      }
    }

    return results;
  } catch (error) {
    console.error(`Erreur en crawlant ${url}:`, error.message);
    return [{
      url,
      status: error.response ? error.response.status : 500,
      error: error.message,
    }];
  }
}

// Route pour lancer le crawl
app.post('/api/crawl', async (req, res) => {
  const { url, maxPages = 50 } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }

  try {
    const startTime = Date.now();
    // Normaliser l'URL de base et supprimer les ancres (#)
    const normalizedBaseURL = normalizeURL(url, url);
    
    if (!normalizedBaseURL) {
      return res.status(400).json({ error: 'URL non supportée (peut contenir des paramètres ou être un fichier non HTML)' });
    }
    
    const baseURL = normalizedBaseURL;
    const baseDomain = extractDomain(baseURL);
    
    if (!baseDomain) {
      return res.status(400).json({ error: 'URL invalide' });
    }

    console.log(`Démarrage du crawl pour le domaine: ${baseDomain}`);
    console.log(`URL de base normalisée: ${baseURL}`);
    
    const visitedUrls = new Set();
    const excludedUrls = new Set();
    const pages = await crawlPage(baseURL, baseURL, baseDomain, visitedUrls, maxPages, excludedUrls);
    
    const totalTime = (Date.now() - startTime) / 1000; // en secondes

    res.json({
      baseURL,
      pages,
      pageCount: pages.length,
      excludedCount: excludedUrls.size,
      excludedUrls: Array.from(excludedUrls).slice(0, 100), // Limiter à 100 URLs exclues pour ne pas surcharger la réponse
      totalTime,
    });
  } catch (error) {
    console.error('Erreur de crawl:', error);
    res.status(500).json({ error: 'Erreur lors du crawl du site' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});