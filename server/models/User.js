// server/models/User.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SubscriptionPlan = require('./SubscriptionPlan');

class User extends Model {
  // Méthode pour générer un JWT
  // server/models/User.js - Méthode à modifier
  getSignedJwtToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        subscription: this.subscription // Ajouter l'abonnement dans le token
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
  }

  // Méthode pour comparer les mots de passe
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Méthode pour vérifier si l'abonnement est actif
  hasActiveSubscription() {
    if (!this.subscription || this.subscription === 'free') {
      return true; // Le plan gratuit est toujours actif
    }

    if (!this.subscriptionExpiresAt) {
      return false;
    }

    // Vérifier si la date d'expiration est dans le futur
    return new Date(this.subscriptionExpiresAt) > new Date();
  }

  // Méthode pour obtenir le plan d'abonnement complet depuis la base de données
  async getSubscriptionPlan() {
    try {
      // Si l'utilisateur n'a pas d'abonnement ou est sur le plan gratuit
      const planId = this.subscription || 'free';

      // Rechercher le plan dans la base de données
      const plan = await SubscriptionPlan.findByPk(planId);

      // Si le plan n'existe pas ou n'est pas actif, retourner le plan par défaut
      if (!plan || !plan.isActive) {
        return await SubscriptionPlan.getDefaultPlan();
      }

      return plan;
    } catch (error) {
      console.error('Erreur lors de la récupération du plan d\'abonnement:', error);
      // En cas d'erreur, utiliser un plan par défaut
      return {
        id: 'free',
        name: 'Gratuit (par défaut)',
        limits: {
          maxPages: 10,
          maxAnalysesPerDay: 3,
          maxSites: 1
        }
      };
    }
  }

  // Méthode asynchrone pour vérifier si l'utilisateur peut effectuer une analyse
  async canPerformAnalysis(pagesCount) {
    try {
      // Obtenir le plan d'abonnement
      const plan = await this.getSubscriptionPlan();

      // Vérifier si l'utilisateur a un abonnement actif
      if (!this.hasActiveSubscription()) {
        return {
          allowed: false,
          reason: 'subscription_expired',
          message: 'Votre abonnement a expiré. Veuillez le renouveler pour continuer.'
        };
      }

      // Récupérer les limites du plan
      const limits = plan.limits || {
        maxPages: 10,
        maxAnalysesPerDay: 3,
        maxSites: 1
      };

      // Si l'utilisateur a déjà atteint sa limite quotidienne
      if (this.dailyAnalysesCount >= limits.maxAnalysesPerDay && limits.maxAnalysesPerDay !== -1) {
        return {
          allowed: false,
          reason: 'daily_limit_reached',
          message: `Vous avez atteint votre limite quotidienne de ${limits.maxAnalysesPerDay} analyses.`,
          limit: limits.maxAnalysesPerDay,
          current: this.dailyAnalysesCount
        };
      }

      // Si l'analyse demandée dépasse la limite de pages
      if (pagesCount > limits.maxPages && limits.maxPages !== -1) {
        return {
          allowed: false,
          reason: 'pages_limit_exceeded',
          message: `Votre abonnement ${plan.name} est limité à ${limits.maxPages} pages par analyse.`,
          limit: limits.maxPages,
          requested: pagesCount
        };
      }

      return {
        allowed: true
      };
    } catch (error) {
      console.error('Erreur lors de la vérification des limites:', error);
      // En cas d'erreur, être conservateur et autoriser l'analyse
      return { allowed: true };
    }
  }

  // Méthode asynchrone pour obtenir une limite spécifique d'abonnement
  async getSubscriptionLimit(limitType) {
    try {
      // Obtenir le plan d'abonnement
      const plan = await this.getSubscriptionPlan();

      // Récupérer les limites
      const limits = plan.limits || {
        maxPages: 10,
        maxAnalysesPerDay: 3,
        maxSites: 1
      };

      // Récupérer la limite spécifique
      const limit = limits[limitType];

      // Pour les valeurs illimitées (-1), renvoyer Infinity
      return limit === -1 ? Infinity : limit;
    } catch (error) {
      console.error('Erreur lors de la récupération de la limite:', error);
      // Valeurs par défaut en cas d'erreur
      const defaultLimits = {
        maxPages: 10,
        maxAnalysesPerDay: 3,
        maxSites: 1
      };
      return defaultLimits[limitType] || 0;
    }
  }
}

User.init({
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Veuillez fournir un nom' },
      len: {
        args: [2, 50],
        msg: 'Le nom doit contenir entre 2 et 50 caractères'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Veuillez fournir un email' },
      isEmail: { msg: 'Veuillez fournir un email valide' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Veuillez fournir un mot de passe' },
      len: {
        args: [6],
        msg: 'Le mot de passe doit contenir au moins 6 caractères'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscription: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'free'
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dailyAnalysesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastAnalysisDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalAnalysesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    // Hook pour hacher le mot de passe avant la création/mise à jour
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

module.exports = User;