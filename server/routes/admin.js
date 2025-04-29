// server/routes/admin.js
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Analysis = require('../models/Analysis');
const StatisticsService = require('../services/statisticsService');
const { Op } = require('sequelize');
const router = express.Router();

// Middleware pour protéger les routes d'admin
router.use(protect);
router.use(authorize('admin'));

// @desc    Obtenir les statistiques générales pour le tableau de bord admin
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    // Compter les utilisateurs
    const usersCount = await User.count();
    
    // Compter les analyses
    const analysisCount = await Analysis.count({
      where: {
        status: 'completed'
      }
    });
    
    // Compter les pages analysées
    const pagesAnalyzedCount = await Analysis.sum('pagesCount', {
      where: {
        status: 'completed'
      }
    }) || 0;
    
    // Compter les abonnements actifs (hors 'free')
    const activeSubscriptions = await User.count({
      where: {
        subscription: {
          [Op.ne]: 'free',
          [Op.ne]: null
        },
        subscriptionExpiresAt: {
          [Op.or]: [
            { [Op.gt]: new Date() },
            { [Op.eq]: null }
          ]
        }
      }
    });
    
    const adminStats = {
      usersCount,
      analysisCount,
      pagesAnalyzedCount,
      activeSubscriptions
    };
    
    res.status(200).json(adminStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir la liste des utilisateurs
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id', 
        'name', 
        'email', 
        'role', 
        'createdAt', 
        'lastLogin',
        'subscription',
        'subscriptionExpiresAt',
        'dailyAnalysesCount',
        'totalAnalysesCount',
        'lastAnalysisDate'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir les détails d'un utilisateur
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour un utilisateur
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Mettre à jour les champs
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    
    await user.save();
    
    // Retourner l'utilisateur mis à jour sans le mot de passe
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    
    // Gérer les erreurs de validation Sequelize
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ error: messages });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour l'abonnement d'un utilisateur
// @route   PUT /api/admin/users/:id/subscription
// @access  Private/Admin
router.put('/users/:id/subscription', async (req, res) => {
  try {
    const { subscription, expiresAt } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Vérifier que le plan d'abonnement existe
    let plan = null;
    
    if (subscription !== 'free') {
      plan = await SubscriptionPlan.findByPk(subscription);
      
      if (!plan) {
        return res.status(400).json({ error: 'Plan d\'abonnement inexistant' });
      }
      
      if (!plan.isActive) {
        return res.status(400).json({ error: 'Ce plan d\'abonnement n\'est plus actif' });
      }
    }
    
    // Mettre à jour l'abonnement
    user.subscription = subscription;
    user.subscriptionExpiresAt = expiresAt;
    
    await user.save();
    
    // Générer un nouveau token pour que les changements prennent effet immédiatement
    const newToken = user.getSignedJwtToken();
    
    // Enregistrer la modification d'abonnement dans les statistiques
    await StatisticsService.recordMetric('subscription_change', 1, {
      userId: user.id,
      previousSubscription: user.previous('subscription'),
      newSubscription: subscription,
      changedBy: req.user.id,
      expiresAt: expiresAt
    });
    
    res.status(200).json({
      success: true,
      subscription: user.subscription,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      token: newToken // Ce token contient les informations à jour
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir les statistiques d'un utilisateur
// @route   GET /api/admin/users/:id/stats
// @access  Private/Admin
router.get('/users/:id/stats', async (req, res) => {
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Récupérer les statistiques de l'utilisateur depuis le service
    const userStats = await StatisticsService.getUserStatistics(user.id);
    
    res.status(200).json(userStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir les statistiques d'utilisation pour une période donnée
// @route   GET /api/admin/statistics
// @access  Private/Admin
router.get('/statistics', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Valider la période
    const validPeriods = ['day', 'week', 'month', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Période invalide' });
    }
    
    // Récupérer les statistiques depuis le service
    const statistics = await StatisticsService.getAdminStatistics(period);
    
    res.status(200).json(statistics);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir les plans d'abonnement
// @route   GET /api/admin/subscription-plans
// @access  Private/Admin
router.get('/subscription-plans', async (req, res) => {
  try {
    // Récupérer tous les plans d'abonnement
    const plans = await SubscriptionPlan.findAll({
      order: [['price', 'ASC']]
    });
    
    res.status(200).json({ plans });
  } catch (error) {
    console.error('Erreur lors de la récupération des plans d\'abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Obtenir un plan d'abonnement spécifique
// @route   GET /api/admin/subscription-plans/:id
// @access  Private/Admin
router.get('/subscription-plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan d\'abonnement non trouvé' });
    }
    
    res.status(200).json({ plan });
  } catch (error) {
    console.error('Erreur lors de la récupération du plan d\'abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Créer un nouveau plan d'abonnement
// @route   POST /api/admin/subscription-plans
// @access  Private/Admin
router.post('/subscription-plans', async (req, res) => {
  try {
    const { id, name, price, currency, period, features, limits, isActive, isDefault } = req.body;
    
    // Vérifier si le plan existe déjà
    const existingPlan = await SubscriptionPlan.findByPk(id);
    
    if (existingPlan) {
      return res.status(400).json({ error: 'Un plan avec cet identifiant existe déjà' });
    }
    
    // Créer le nouveau plan
    const plan = await SubscriptionPlan.create({
      id,
      name,
      price,
      currency,
      period,
      features,
      limits,
      isActive,
      isDefault
    });
    
    res.status(201).json({ plan });
  } catch (error) {
    console.error('Erreur lors de la création du plan d\'abonnement:', error);
    
    // Gérer les erreurs de validation Sequelize
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ error: messages });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour un plan d'abonnement
// @route   PUT /api/admin/subscription-plans/:id
// @access  Private/Admin
router.put('/subscription-plans/:id', async (req, res) => {
  try {
    const { name, price, currency, period, features, limits, isActive, isDefault } = req.body;
    
    // Vérifier si le plan existe
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan d\'abonnement non trouvé' });
    }
    
    // Mettre à jour les champs
    plan.name = name || plan.name;
    
    if (price !== undefined) plan.price = price;
    if (currency) plan.currency = currency;
    if (period) plan.period = period;
    if (features) plan.features = features;
    if (limits) plan.limits = limits;
    if (isActive !== undefined) plan.isActive = isActive;
    if (isDefault !== undefined) plan.isDefault = isDefault;
    
    await plan.save();
    
    res.status(200).json({ 
      message: 'Plan mis à jour avec succès',
      plan 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du plan d\'abonnement:', error);
    
    // Gérer les erreurs de validation Sequelize
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ error: messages });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Supprimer un plan d'abonnement
// @route   DELETE /api/admin/subscription-plans/:id
// @access  Private/Admin
router.delete('/subscription-plans/:id', async (req, res) => {
  try {
    // Vérifier si le plan existe
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan d\'abonnement non trouvé' });
    }
    
    // Vérifier si des utilisateurs utilisent ce plan
    const usersCount = await User.count({
      where: {
        subscription: req.params.id
      }
    });
    
    if (usersCount > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer ce plan car il est utilisé par des utilisateurs',
        usersCount
      });
    }
    
    // Supprimer le plan
    await plan.destroy();
    
    res.status(200).json({ message: 'Plan supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du plan d\'abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// @desc    Générer un rapport de statistiques
// @route   POST /api/admin/generate-stats
// @access  Private/Admin
router.post('/generate-stats', async (req, res) => {
  try {
    // Générer les statistiques quotidiennes
    const stats = await StatisticsService.generateDailyStats();
    
    res.status(200).json({
      message: 'Statistiques générées avec succès',
      stats
    });
  } catch (error) {
    console.error('Erreur lors de la génération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;