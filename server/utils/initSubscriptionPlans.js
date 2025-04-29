// server/utils/initSubscriptionPlans.js
const SubscriptionPlan = require('../models/SubscriptionPlan');

/**
 * Initialise les plans d'abonnement par défaut si la table est vide
 * Cette fonction doit être appelée au démarrage du serveur
 */
async function initSubscriptionPlans() {
  try {
    // Vérifier si des plans existent déjà
    const plansCount = await SubscriptionPlan.count();
    
    if (plansCount > 0) {
      console.log('Plans d\'abonnement déjà initialisés');
      return;
    }
    
    console.log('Initialisation des plans d\'abonnement par défaut...');
    
    // Créer les plans d'abonnement par défaut
    const defaultPlans = [
      {
        id: 'free',
        name: 'Gratuit',
        price: 0,
        currency: 'EUR',
        period: 'month',
        features: [
          'Analyse de 10 pages maximum',
          'Fonctionnalités de base',
          'Score SEO',
          'Recommandations limitées'
        ],
        limits: {
          maxPages: 10,
          maxAnalysesPerDay: 3,
          maxSites: 1
        },
        isActive: true,
        isDefault: true
      },
      {
        id: 'basic',
        name: 'Basique',
        price: 19.99,
        currency: 'EUR',
        period: 'month',
        features: [
          'Analyse de 50 pages maximum',
          'Toutes les fonctionnalités de base',
          'Score SEO détaillé',
          'Recommandations complètes',
          'Rapports exportables'
        ],
        limits: {
          maxPages: 50,
          maxAnalysesPerDay: 10,
          maxSites: 3
        },
        isActive: true,
        isDefault: false
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 49.99,
        currency: 'EUR',
        period: 'month',
        features: [
          'Analyse de 200 pages maximum',
          'Toutes les fonctionnalités basiques',
          'Suivi des changements',
          'Analyses régulières programmées',
          'Rapports avancés',
          'Support prioritaire'
        ],
        limits: {
          maxPages: 200,
          maxAnalysesPerDay: 30,
          maxSites: 10
        },
        isActive: true,
        isDefault: false
      },
      {
        id: 'enterprise',
        name: 'Entreprise',
        price: 99.99,
        currency: 'EUR',
        period: 'month',
        features: [
          'Analyse de pages illimitée',
          'Toutes les fonctionnalités Pro',
          'API d\'accès pour intégration',
          'Rapports personnalisés',
          'Support dédié',
          'Analyses multi-domaines'
        ],
        limits: {
          maxPages: -1, // illimité
          maxAnalysesPerDay: -1, // illimité
          maxSites: -1 // illimité
        },
        isActive: true,
        isDefault: false
      }
    ];
    
    // Créer les plans dans la base de données
    await SubscriptionPlan.bulkCreate(defaultPlans);
    
    console.log('Plans d\'abonnement initialisés avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des plans d\'abonnement:', error);
  }
}

module.exports = initSubscriptionPlans;