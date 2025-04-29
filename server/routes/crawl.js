// server/routes/crawl.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { checkAnalysisLimit } = require('../middleware/subscriptionCheck');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const router = express.Router();

// Route pour lancer le crawl avec la vérification des limitations d'abonnement
router.post('/', protect, checkAnalysisLimit, async (req, res) => {
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
    
    // Création d'une entrée dans la table Analysis pour enregistrer cette analyse
    const analysis = await Analysis.create({
      userId: req.user.id,
      url: baseURL,
      status: 'pending'
    });
    
    const visitedUrls = new Set();
    const excludedUrls = new Set();
    const pages = await crawlPage(baseURL, baseURL, baseDomain, visitedUrls, maxPages, excludedUrls);
    
    const totalTime = (Date.now() - startTime) / 1000; // en secondes

    // Mettre à jour l'enregistrement d'analyse avec les résultats
    analysis.status = 'completed';
    analysis.pagesCount = pages.length;
    analysis.duration = totalTime;
    analysis.results = { pages, excludedCount: excludedUrls.size };
    await analysis.save();
    
    // Mettre à jour les compteurs de l'utilisateur
    req.user.dailyAnalysesCount += 1;
    req.user.totalAnalysesCount += 1;
    req.user.lastAnalysisDate = new Date();
    await req.user.save();

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
    
    // En cas d'erreur, mettre à jour l'enregistrement d'analyse
    if (analysis) {
      analysis.status = 'failed';
      analysis.results = { error: error.message };
      await analysis.save();
    }
    
    res.status(500).json({ error: 'Erreur lors du crawl du site' });
  }
});

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

// Fonction pour crawler une page (inchangée à part l'ajout des limitPages)
async function crawlPage(url, baseURL, baseDomain, visitedUrls = new Set(), maxPages = 100, excludedUrls = new Set()) {
  // Le reste de votre implémentation existante...
  // ...
}

module.exports = router;