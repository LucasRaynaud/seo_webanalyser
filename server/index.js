// server/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { protect } = require('./middleware/auth');
const { checkAnalysisLimit } = require('./middleware/subscriptionCheck');
const { setupCronJobs } = require('./cronJobs');
const initSubscriptionPlans = require('./utils/initSubscriptionPlans');
const User = require('./models/User');
const Analysis = require('./models/Analysis');
const StatisticsService = require('./services/statisticsService');

// Charger les variables d'environnement
dotenv.config();

// Variable pour suivre l'état de la connexion à la base de données
let dbConnected = false;

// Connexion à la base de données
connectDB()
  .then(() => {
    dbConnected = true;
    console.log('Base de données connectée');
    
    // Configurer les tâches cron après la connexion à la base de données
    setupCronJobs();
    
    // Initialiser les plans d'abonnement par défaut
    initSubscriptionPlans();
  })
  .catch(err => {
    console.error('Erreur de connexion à la base de données:', err);
    // Ne pas arrêter le serveur, il pourra fonctionner en mode dégradé
  });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Middleware pour vérifier l'état de la base de données
app.use((req, res, next) => {
  // Ajouter l'état de la base de données à la requête
  req.dbConnected = dbConnected;
  next();
});

// Importer les routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { analyzePage, extractBasicMetrics } = require('./scraper');

// Utiliser les routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Route pour analyser toutes les pages d'un crawl (protégée)
app.post('/api/analyze-site', protect, async (req, res) => {
  const { pages, fullAnalysis = false } = req.body;
  let analysis = null;
  
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Liste de pages requise' });
  }
  
  try {
    // Vérifier si la base de données est connectée
    if (req.dbConnected) {
      // Vérifier les limites d'abonnement depuis la BDD
      const user = req.user;
      const maxPagesAllowed = await user.getSubscriptionLimit('maxPages');
      
      if (pages.length > maxPagesAllowed) {
        return res.status(403).json({
          error: `Votre abonnement est limité à ${maxPagesAllowed} pages par analyse.`,
          upgradeRequired: true,
          limitType: "pages",
          currentLimit: maxPagesAllowed,
          requestedPages: pages.length
        });
      }
      
      // Vérifier le quota quotidien d'analyses
      const maxDailyAnalyses = await user.getSubscriptionLimit('maxAnalysesPerDay');
      if (user.dailyAnalysesCount >= maxDailyAnalyses) {
        return res.status(403).json({
          error: `Vous avez atteint votre limite quotidienne de ${maxDailyAnalyses} analyses.`,
          upgradeRequired: true,
          limitType: "dailyAnalyses",
          currentLimit: maxDailyAnalyses,
          currentUsage: user.dailyAnalysesCount
        });
      }
    }
    
    // Limiter le nombre de pages à analyser pour éviter une surcharge
    const pagesToAnalyze = req.dbConnected 
      ? pages.slice(0, await req.user.getSubscriptionLimit('maxPages')).map(page => page.url)
      : pages.slice(0, 50).map(page => page.url);
      
    const startTime = Date.now();
    
    // Créer une entrée d'analyse si la base de données est connectée
    if (req.dbConnected) {
      try {
        analysis = await Analysis.create({
          userId: req.user.id,
          url: pages[0].url,
          pagesCount: pagesToAnalyze.length,
          status: 'pending'
        });
      } catch (err) {
        console.warn("Impossible de créer l'entrée d'analyse:", err);
      }
    }
    
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
      const progress = Math.min(100, Math.round((i + batch.length) / pagesToAnalyze.length * 100));
      console.log(`Progression de l'analyse: ${progress}%`);
    }
    
    const totalTime = (Date.now() - startTime) / 1000; // en secondes
    
    // Calcul des statistiques globales
    const stats = calculateSiteStats(results);
    
    // Mettre à jour l'analyse si elle a été créée
    if (analysis) {
      try {
        analysis.status = 'completed';
        analysis.duration = totalTime;
        analysis.score = stats.averageSEOScore || 0;
        analysis.results = { stats, pages: results.length };
        await analysis.save();
        
        // Enregistrer les métriques de l'analyse
        await StatisticsService.recordAnalysisMetrics(analysis, req.user);
      } catch (err) {
        console.warn("Impossible de mettre à jour l'analyse:", err);
      }
    }
    
    // Mettre à jour les compteurs de l'utilisateur si la BDD est connectée
    if (req.dbConnected) {
      try {
        req.user.dailyAnalysesCount = (req.user.dailyAnalysesCount || 0) + 1;
        req.user.totalAnalysesCount = (req.user.totalAnalysesCount || 0) + 1;
        req.user.lastAnalysisDate = new Date();
        await req.user.save();
      } catch (err) {
        console.warn("Impossible de mettre à jour les compteurs utilisateur:", err);
      }
    }
    
    res.json({
      results,
      stats,
      totalPages: results.length,
      totalTime,
    });
  } catch (error) {
    console.error('Erreur d\'analyse du site:', error);
    
    // En cas d'erreur, mettre à jour l'analyse si elle a été créée
    if (analysis) {
      try {
        analysis.status = 'failed';
        analysis.results = { error: error.message };
        await analysis.save();
      } catch (err) {
        console.warn("Impossible de mettre à jour l'analyse en cas d'erreur:", err);
      }
    }
    
    res.status(500).json({ error: 'Erreur lors de l\'analyse du site' });
  }
});

// Route de crawl avec vérification des limitations d'abonnement
app.post('/api/crawl', protect, async (req, res) => {
  // Au début de la route /api/crawl ou /api/analyze-site
console.log('User:', {
  id: req.user.id,
  name: req.user.name,
  subscription: req.user.subscription,
  subscriptionExpiresAt: req.user.subscriptionExpiresAt
});

// Au moment de vérifier les limites
const plan = await req.user.getSubscriptionPlan();
console.log('Plan d\'abonnement récupéré:', {
  id: plan.id,
  name: plan.name,
  limits: plan.limits
});

const maxPagesAllowed = await req.user.getSubscriptionLimit('maxPages');
console.log('Limite de pages:', maxPagesAllowed);
  const { url, maxPages = 50 } = req.body;
  let analysis = null;

  if (!url) {
    return res.status(400).json({ error: 'URL requise' });
  }

  try {
    // Vérifier les limites d'abonnement si la BDD est connectée
    if (req.dbConnected) {
      const checkResult = await req.user.canPerformAnalysis(maxPages);
      
      if (!checkResult.allowed) {
        return res.status(403).json({
          error: checkResult.message,
          upgradeRequired: true,
          limitType: checkResult.reason,
          ...checkResult
        });
      }
    }
    
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
    
    // Création d'une entrée dans la table Analysis si la BDD est connectée
    if (req.dbConnected) {
      try {
        analysis = await Analysis.create({
          userId: req.user.id,
          url: baseURL,
          status: 'pending'
        });
      } catch (err) {
        console.warn("Impossible de créer l'entrée d'analyse:", err);
      }
    }
    
    // Déterminer le nombre maximum de pages à crawler en fonction de l'abonnement
    let maxPagesToCrawl = maxPages;
    if (req.dbConnected) {
      const maxPagesAllowed = await req.user.getSubscriptionLimit('maxPages');
      maxPagesToCrawl = Math.min(maxPages, maxPagesAllowed);
    }
    
    const visitedUrls = new Set();
    const excludedUrls = new Set();
    const pages = await crawlPage(baseURL, baseURL, baseDomain, visitedUrls, maxPagesToCrawl, excludedUrls);
    
    const totalTime = (Date.now() - startTime) / 1000; // en secondes

    // Mettre à jour l'enregistrement d'analyse si la BDD est connectée
    if (analysis) {
      try {
        analysis.status = 'completed';
        analysis.pagesCount = pages.length;
        analysis.duration = totalTime;
        analysis.results = { pages, excludedCount: excludedUrls.size };
        await analysis.save();
        
        // Enregistrer les métriques
        await StatisticsService.recordAnalysisMetrics(analysis, req.user);
      } catch (err) {
        console.warn("Impossible de mettre à jour l'analyse:", err);
      }
    }
    
    // Mettre à jour les compteurs de l'utilisateur si la BDD est connectée
    if (req.dbConnected) {
      try {
        req.user.dailyAnalysesCount = (req.user.dailyAnalysesCount || 0) + 1;
        req.user.totalAnalysesCount = (req.user.totalAnalysesCount || 0) + 1;
        req.user.lastAnalysisDate = new Date();
        await req.user.save();
      } catch (err) {
        console.warn("Impossible de mettre à jour les compteurs utilisateur:", err);
      }
    }

    res.json({
      baseURL,
      pages,
      pageCount: pages.length,
      excludedCount: excludedUrls.size,
      excludedUrls: Array.from(excludedUrls).slice(0, 100), // Limiter à 100 URLs exclues
      totalTime,
    });
  } catch (error) {
    console.error('Erreur de crawl:', error);
    
    // En cas d'erreur, mettre à jour l'enregistrement d'analyse
    if (analysis) {
      try {
        analysis.status = 'failed';
        analysis.results = { error: error.message };
        await analysis.save();
      } catch (err) {
        console.warn("Impossible de mettre à jour l'analyse en cas d'erreur:", err);
      }
    }
    
    res.status(500).json({ error: 'Erreur lors du crawl du site' });
  }
});

// Fonctions utilitaires pour les statistiques
function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function percentage(results, predicate) {
  if (results.length === 0) return 0;
  return (results.filter(predicate).length / results.length) * 100;
}

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
  // Le reste de l'implémentation de crawlPage reste inchangé...
  // Je conserve la version existante pour éviter de répéter le code qui fonctionne déjà
  
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
    const response = await fetch(normalizedURL, {
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
    const uniqueLinks = new Set(); // Pour éviter les doublons
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
        
        const normalizedHref = normalizeURL(url, href);
        if (normalizedHref && !shouldExcludeURL(normalizedHref)) {
          const linkDomain = extractDomain(normalizedHref);
          
          // Vérifier si c'est un lien interne ou externe
          if (linkDomain === baseDomain) {
            internalLinksCount++;
            
            // Ne suivre que les liens internes non visités
            if (!uniqueLinks.has(normalizedHref)) {
              uniqueLinks.add(normalizedHref);
              links.push(normalizedHref);
              pageInfo.links.push({
                url: normalizedHref,
                text: $(element).text().trim() || $(element).attr('title') || '',
                isInternal: true
              });
            }
          } else if (linkDomain) {
            // C'est un lien externe
            externalLinksCount++;
            pageInfo.links.push({
              url: normalizedHref, 
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

// Route de test pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.send('API SEO Web Analyser fonctionne correctement!');
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});