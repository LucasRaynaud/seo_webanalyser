// server/middleware/subscriptionCheck.js
/**
 * Middleware pour vérifier les limitations d'abonnement
 * Version avec récupération des données depuis la base de données
 */

// Fonction pour vérifier si l'utilisateur peut effectuer une analyse avec un certain nombre de pages
exports.checkAnalysisLimit = async (req, res, next) => {
  try {
    const user = req.user;
    const { maxPages = 50 } = req.body;

    // Utiliser la méthode asynchrone du modèle User pour vérifier les limites
    const checkResult = await user.canPerformAnalysis(maxPages);

    // Si l'utilisateur ne peut pas effectuer l'analyse, renvoyer une erreur
    if (!checkResult.allowed) {
      return res.status(403).json({
        error: checkResult.message,
        upgradeRequired: true,
        limitType: checkResult.reason,
        ...checkResult // Inclure toutes les autres propriétés utiles (limit, current, etc.)
      });
    }

    // Si toutes les vérifications passent, continuer
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des limitations:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Fonction pour vérifier si l'utilisateur a accès à certaines fonctionnalités Premium
exports.checkPremiumFeatures = async (req, res, next) => {
  try {
    const user = req.user;
    const { featureName } = req.params;

    // Définir quelles fonctionnalités sont disponibles pour chaque type d'abonnement
    const plan = await user.getSubscriptionPlan();
    
    // Si le plan n'a pas été trouvé, utiliser les restrictions du plan gratuit
    if (!plan) {
      return res.status(403).json({
        error: 'Cette fonctionnalité nécessite un abonnement',
        upgradeRequired: true,
        limitType: 'feature_not_available'
      });
    }
    
    // Récupérer les fonctionnalités du plan
    const premiumFeatures = {
      free: ['basic_analysis'],
      basic: ['basic_analysis', 'detailed_analysis', 'export_csv'],
      pro: ['basic_analysis', 'detailed_analysis', 'export_csv', 'scheduled_analysis', 'api_access'],
      enterprise: ['basic_analysis', 'detailed_analysis', 'export_csv', 'scheduled_analysis', 'api_access', 'white_label', 'custom_reports']
    };
    
    // Récupérer les fonctionnalités disponibles pour l'abonnement de l'utilisateur
    const availableFeatures = premiumFeatures[plan.id] || premiumFeatures.free;
    
    // Vérifier si la fonctionnalité demandée est disponible
    if (!availableFeatures.includes(featureName)) {
      return res.status(403).json({
        error: `La fonctionnalité "${featureName}" nécessite un abonnement supérieur`,
        upgradeRequired: true,
        limitType: 'feature_not_available',
        currentPlan: plan.id,
        requiredPlan: Object.keys(premiumFeatures).find(key => 
          premiumFeatures[key].includes(featureName)
        )
      });
    }
    
    // Si la fonctionnalité est disponible, passer à la suite
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des fonctionnalités premium:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};