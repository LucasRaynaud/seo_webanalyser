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
    
    // Calcul du score SEO et des pénalités
    const seoAnalysis = calculateSEOScore(basicMetrics, performanceMetrics);
    
    // Combinaison des résultats avec tous les détails du score
    return {
      ...basicMetrics,
      ...performanceMetrics,
      seoScore: seoAnalysis.score,
      seoPenalties: seoAnalysis.penalties,
      scoreDetails: seoAnalysis.scoreDetails  // Inclure tous les détails du calcul
    };
  } catch (error) {
    console.error(`Erreur lors de l'analyse de ${url}:`, error);
    return {
      url,
      error: error.message,
    };
  }
}

// Fonction mise à jour pour calculer un score SEO détaillé sans évaluation de la qualité du contenu et optimisation mobile
function calculateSEOScore(basicMetrics, performanceMetrics) {
  // Initialisation des scores par catégorie
  // Redistribution des points (10 points de contenu et 3 points technique ont été redistribués)
  const scoreDetails = {
    baseScore: 100,
    categories: {
      structure: { maxPoints: 45, earned: 45, factors: [] }, // +5 points (de 40 à 45)
      performance: { maxPoints: 35, earned: 35, factors: [] }, // +5 points (de 30 à 35)
      content: { maxPoints: 10, earned: 10, factors: [] }, // -10 points (de 20 à 10, suppression qualité contenu)
      technical: { maxPoints: 10, earned: 10, factors: [] } // Inchangé, mais redistribution interne
    },
    allFactors: []
  };
  
  // Fonction pour appliquer une pénalité
  const applyPenalty = (category, name, points, condition, details = null, recommendation = null) => {
    // Si la condition est vraie, on applique la pénalité
    if (condition) {
      // Réduire les points dans la catégorie
      scoreDetails.categories[category].earned += points; // points est négatif
      
      // Ajouter le facteur à la liste
      const factor = {
        category,
        name,
        points,
        details,
        recommendation
      };
      
      scoreDetails.categories[category].factors.push(factor);
      scoreDetails.allFactors.push(factor);
    }
    // Si la condition est fausse, ajouter un facteur positif
    else if (points < 0) { // Uniquement pour les pénalités potentielles
      const factor = {
        category,
        name,
        points: 0, // Pas de pénalité
        status: 'ok',
        details: 'Aucun problème détecté'
      };
      
      scoreDetails.categories[category].factors.push(factor);
      scoreDetails.allFactors.push(factor);
    }
  };

  // ===== Évaluation de la structure (45 points max) =====
  // +5 points par rapport à l'original
  
  // Méta-titre (18 points) (+3 par rapport aux 15 précédents)
  applyPenalty(
    'structure',
    'Méta-titre',
    -18,
    basicMetrics.missingTitle,
    'Le méta-titre est manquant',
    'Ajoutez un méta-titre descriptif incluant le mot-clé principal'
  );
  
  applyPenalty(
    'structure',
    'Longueur du méta-titre',
    -6, // +1 par rapport aux 5 précédents
    !basicMetrics.missingTitle && basicMetrics.hasTooLongTitle,
    `Le méta-titre est trop long (${basicMetrics.metaTitleLength} caractères)`,
    'Raccourcissez le titre à moins de 60 caractères'
  );
  
  // Méta-description (12 points) (+2 par rapport aux 10 précédents)
  applyPenalty(
    'structure',
    'Méta-description',
    -12,
    basicMetrics.missingDescription,
    'La méta-description est manquante',
    'Ajoutez une méta-description attrayante avec appel à l\'action'
  );
  
  applyPenalty(
    'structure',
    'Longueur de la méta-description',
    -6, // +1 par rapport aux 5 précédents
    !basicMetrics.missingDescription && basicMetrics.hasTooLongDescription,
    `La méta-description est trop longue (${basicMetrics.metaDescriptionLength} caractères)`,
    'Limitez la description à 160 caractères maximum'
  );
  
  // Balise H1 (12 points) (+2 par rapport aux 10 précédents)
  applyPenalty(
    'structure',
    'Balise H1',
    -12,
    basicMetrics.missingH1,
    'La balise H1 est manquante',
    'Ajoutez une balise H1 décrivant le contenu principal de la page'
  );
  
  applyPenalty(
    'structure',
    'Unicité de la balise H1',
    -6, // +1 par rapport aux 5 précédents
    !basicMetrics.missingH1 && basicMetrics.hasMultipleH1,
    `${basicMetrics.h1Count} balises H1 détectées`,
    'Gardez une seule balise H1 par page'
  );
  
  // Structure des sous-titres (7 points) (+2 par rapport aux 5 précédents)
  applyPenalty(
    'structure',
    'Balises H2',
    -7,
    basicMetrics.h2Count === 0,
    'Aucune balise H2 n\'est présente',
    'Utilisez des H2 pour structurer votre contenu en sections'
  );
  
  // ===== Évaluation de la performance (35 points max) =====
  // +5 points par rapport à l'original
  if (performanceMetrics) {
    // Temps de chargement (18 points) (+3 par rapport aux 15 précédents)
    if (performanceMetrics.loadTime > 5) {
      applyPenalty(
        'performance',
        'Temps de chargement',
        -18,
        true,
        `Le temps de chargement est très lent (${performanceMetrics.loadTime.toFixed(2)}s)`,
        'Optimisez les images et minimisez les ressources bloquantes'
      );
    } else if (performanceMetrics.loadTime > 3) {
      applyPenalty(
        'performance',
        'Temps de chargement',
        -12, // +2 par rapport aux 10 précédents
        true,
        `Le temps de chargement est lent (${performanceMetrics.loadTime.toFixed(2)}s)`,
        'Améliorez la vitesse en activant la mise en cache et la compression'
      );
    } else {
      applyPenalty(
        'performance',
        'Temps de chargement',
        -18,
        false,
        `Le temps de chargement est bon (${performanceMetrics.loadTime.toFixed(2)}s)`
      );
    }
    
    // First Contentful Paint (12 points) (+2 par rapport aux 10 précédents)
    if (performanceMetrics.fcp > 3) {
      applyPenalty(
        'performance',
        'First Contentful Paint (FCP)',
        -12,
        true,
        `Le FCP est très lent (${performanceMetrics.fcp.toFixed(2)}s)`,
        'Réduisez le délai avant affichage du premier contenu'
      );
    } else if (performanceMetrics.fcp > 1.8) {
      applyPenalty(
        'performance',
        'First Contentful Paint (FCP)',
        -6, // +1 par rapport aux 5 précédents
        true,
        `Le FCP est lent (${performanceMetrics.fcp.toFixed(2)}s)`,
        'Améliorez le FCP en optimisant le CSS critique'
      );
    } else {
      applyPenalty(
        'performance',
        'First Contentful Paint (FCP)',
        -12,
        false,
        `Le FCP est bon (${performanceMetrics.fcp.toFixed(2)}s)`
      );
    }
    
    // Poids de la page (5 points) (Inchangé)
    if (performanceMetrics.pageSize) {
      if (performanceMetrics.pageSize > 3000) {
        applyPenalty(
          'performance',
          'Poids de la page',
          -5,
          true,
          `Page très lourde (${performanceMetrics.pageSize} Ko)`,
          'Réduisez le poids en optimisant les images et le code'
        );
      } else if (performanceMetrics.pageSize > 1500) {
        applyPenalty(
          'performance',
          'Poids de la page',
          -3,
          true,
          `Page lourde (${performanceMetrics.pageSize} Ko)`,
          'Optimisez les ressources pour réduire le poids total'
        );
      } else {
        applyPenalty(
          'performance',
          'Poids de la page',
          -5,
          false,
          `Le poids de la page est bon (${performanceMetrics.pageSize} Ko)`
        );
      }
    } else {
      // Si le poids n'est pas disponible, on considère que les 5 points sont perdus
      scoreDetails.categories.performance.earned -= 5;
      scoreDetails.categories.performance.factors.push({
        category: 'performance',
        name: 'Poids de la page',
        points: -5,
        details: 'Mesure non disponible',
        recommendation: 'Une analyse complète est nécessaire pour évaluer ce facteur'
      });
    }
  } else {
    // Si les métriques de performance ne sont pas disponibles, on attribue 0 point pour cette catégorie
    scoreDetails.categories.performance.earned = 0;
    scoreDetails.categories.performance.factors.push({
      category: 'performance',
      name: 'Performances',
      points: -35, // Ajusté à 35 points au lieu de 30
      details: 'Métriques de performance non disponibles',
      recommendation: 'Utilisez l\'analyse complète pour évaluer les performances'
    });
  }
  
  // ===== Évaluation du contenu (10 points max) =====
  // Suppression de l'évaluation de la qualité du contenu (10 points)
  // Maintien uniquement des images et attributs alt (10 points)
  
  // Images et attributs alt (10 points)
  if (performanceMetrics && performanceMetrics.imagesCount !== undefined) {
    if (performanceMetrics.imagesCount > 0) {
      const missingAltRatio = performanceMetrics.imagesWithoutAlt / performanceMetrics.imagesCount;
      
      if (missingAltRatio > 0.5) {
        applyPenalty(
          'content',
          'Attributs alt des images',
          -10,
          true,
          `${performanceMetrics.imagesWithoutAlt}/${performanceMetrics.imagesCount} images sans attribut alt`,
          'Ajoutez des attributs alt descriptifs à toutes les images'
        );
      } else if (missingAltRatio > 0) {
        const penaltyPoints = Math.min(-10, Math.ceil(-missingAltRatio * 10));
        applyPenalty(
          'content',
          'Attributs alt des images',
          penaltyPoints,
          true,
          `${performanceMetrics.imagesWithoutAlt}/${performanceMetrics.imagesCount} images sans attribut alt`,
          'Complétez les attributs alt manquants'
        );
      } else {
        applyPenalty(
          'content',
          'Attributs alt des images',
          -10,
          false,
          `Toutes les images (${performanceMetrics.imagesCount}) ont des attributs alt`
        );
      }
    } else {
      applyPenalty(
        'content',
        'Attributs alt des images',
        -10,
        false,
        'Aucune image détectée sur la page'
      );
    }
  } else {
    // Information non disponible
    scoreDetails.categories.content.earned -= 10;
    scoreDetails.categories.content.factors.push({
      category: 'content',
      name: 'Attributs alt des images',
      points: -10,
      details: 'Mesure non disponible',
      recommendation: 'Une analyse complète est nécessaire pour évaluer ce facteur'
    });
  }
  
  // ===== Évaluation technique (10 points max) =====
  // Redistribution des 3 points d'optimisation mobile aux deux métriques existantes
  
  // URL canonique (5 points) (+2 par rapport aux 3 précédents)
  applyPenalty(
    'technical',
    'URL canonique',
    -5,
    !basicMetrics.canonicalUrl,
    'URL canonique manquante',
    'Ajoutez une balise canonique pour éviter les problèmes de contenu dupliqué'
  );
  
  // Données structurées (5 points) (+1 par rapport aux 4 précédents)
  if (performanceMetrics) {
    applyPenalty(
      'technical',
      'Données structurées',
      -5,
      performanceMetrics.hasStructuredData === false,
      'Aucune donnée structurée détectée',
      'Implémentez des données structurées schema.org pour améliorer la visibilité SERP'
    );
  } else {
    scoreDetails.categories.technical.earned -= 5;
    scoreDetails.categories.technical.factors.push({
      category: 'technical',
      name: 'Données structurées',
      points: -5,
      details: 'Mesure non disponible',
      recommendation: 'Une analyse complète est nécessaire pour évaluer ce facteur'
    });
  }
  
  // Calcul du score final
  let finalScore = 0;
  Object.keys(scoreDetails.categories).forEach(category => {
    finalScore += scoreDetails.categories[category].earned;
  });
  
  // Limiter le score entre 0 et 100
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  return {
    score: Math.round(finalScore),
    scoreDetails: scoreDetails,
    penalties: scoreDetails.allFactors.filter(f => f.points < 0)
  };
}

function calculateSiteStats(results) {
  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    return { error: 'Aucune page analysée avec succès' };
  }
  
  // Calcul des moyennes et des pourcentages (code existant)
  
  // Ajouter les statistiques détaillées par catégorie
  const stats = {
    // Vos statistiques existantes ici...
    
    // Ajouter les détails du score par catégorie
    scoreDetailsByCategory: {
      structure: {
        average: average(validResults.filter(r => r.scoreDetails && r.scoreDetails.categories.structure)
          .map(r => r.scoreDetails.categories.structure.earned / r.scoreDetails.categories.structure.maxPoints * 100)),
        maxScore: 45 // Mis à jour de 40 à 45
      },
      performance: {
        average: average(validResults.filter(r => r.scoreDetails && r.scoreDetails.categories.performance)
          .map(r => r.scoreDetails.categories.performance.earned / r.scoreDetails.categories.performance.maxPoints * 100)),
        maxScore: 35 // Mis à jour de 30 à 35
      },
      content: {
        average: average(validResults.filter(r => r.scoreDetails && r.scoreDetails.categories.content)
          .map(r => r.scoreDetails.categories.content.earned / r.scoreDetails.categories.content.maxPoints * 100)),
        maxScore: 10 // Mis à jour de 20 à 10
      },
      technical: {
        average: average(validResults.filter(r => r.scoreDetails && r.scoreDetails.categories.technical)
          .map(r => r.scoreDetails.categories.technical.earned / r.scoreDetails.categories.technical.maxPoints * 100)),
        maxScore: 10 // Inchangé
      }
    },
    
    // Ajouter les problèmes les plus courants
    commonIssues: getCommonIssues(validResults)
  };
  
  return stats;
}

function getCommonIssues(results) {
  // Créer un tableau de tous les problèmes
  const allIssues = [];
  
  results.forEach(result => {
    if (result.seoPenalties) {
      result.seoPenalties.forEach(penalty => {
        allIssues.push({
          category: penalty.category,
          name: penalty.name,
          points: penalty.points
        });
      });
    }
  });
  
  // Compter les occurrences de chaque problème
  const issuesByNameAndCategory = {};
  
  allIssues.forEach(issue => {
    const key = `${issue.category}__${issue.name}`;
    if (!issuesByNameAndCategory[key]) {
      issuesByNameAndCategory[key] = {
        category: issue.category,
        name: issue.name,
        count: 0,
        totalPoints: 0
      };
    }
    
    issuesByNameAndCategory[key].count++;
    issuesByNameAndCategory[key].totalPoints += Math.abs(issue.points);
  });
  
  // Convertir l'objet en tableau et trier par nombre d'occurrences
  const sortedIssues = Object.values(issuesByNameAndCategory)
    .sort((a, b) => b.count - a.count);
  
  return sortedIssues.slice(0, 5); // Retourner les 5 problèmes les plus courants
}

// Fonction helper pour calculer la moyenne
function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

module.exports = {
  analyzePage,
  extractBasicMetrics,
  extractPerformanceMetrics,
};