// server/migrations/migration-add-subscription-fields.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ajouter les champs liés aux abonnements à la table des utilisateurs
    await queryInterface.addColumn('users', 'subscription', {
      type: Sequelize.ENUM('free', 'basic', 'pro', 'enterprise'),
      defaultValue: 'free',
      after: 'role'
    });

    await queryInterface.addColumn('users', 'subscriptionExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'subscription'
    });

    await queryInterface.addColumn('users', 'lastLogin', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'role'
    });

    await queryInterface.addColumn('users', 'dailyAnalysesCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      after: 'subscriptionExpiresAt'
    });

    await queryInterface.addColumn('users', 'lastAnalysisDate', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'dailyAnalysesCount'
    });

    await queryInterface.addColumn('users', 'totalAnalysesCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      after: 'lastAnalysisDate'
    });

    // Créer la table des plans d'abonnement
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'EUR'
      },
      period: {
        type: Sequelize.ENUM('month', 'year'),
        allowNull: false,
        defaultValue: 'month'
      },
      features: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      limits: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Ajouter les plans d'abonnement par défaut
    await queryInterface.bulkInsert('subscription_plans', [
      {
        id: 'free',
        name: 'Gratuit',
        price: 0,
        currency: 'EUR',
        period: 'month',
        features: JSON.stringify([
          'Analyse de 10 pages maximum',
          'Fonctionnalités de base',
          'Score SEO',
          'Recommandations limitées'
        ]),
        limits: JSON.stringify({
          maxPages: 10,
          maxAnalysesPerDay: 3,
          maxSites: 1
        }),
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'basic',
        name: 'Basique',
        price: 19.99,
        currency: 'EUR',
        period: 'month',
        features: JSON.stringify([
          'Analyse de 50 pages maximum',
          'Toutes les fonctionnalités de base',
          'Score SEO détaillé',
          'Recommandations complètes',
          'Rapports exportables'
        ]),
        limits: JSON.stringify({
          maxPages: 50,
          maxAnalysesPerDay: 10,
          maxSites: 3
        }),
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 49.99,
        currency: 'EUR',
        period: 'month',
        features: JSON.stringify([
          'Analyse de 200 pages maximum',
          'Toutes les fonctionnalités basiques',
          'Suivi des changements',
          'Analyses régulières programmées',
          'Rapports avancés',
          'Support prioritaire'
        ]),
        limits: JSON.stringify({
          maxPages: 200,
          maxAnalysesPerDay: 30,
          maxSites: 10
        }),
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'enterprise',
        name: 'Entreprise',
        price: 99.99,
        currency: 'EUR',
        period: 'month',
        features: JSON.stringify([
          'Analyse de pages illimitée',
          'Toutes les fonctionnalités Pro',
          'API d\'accès pour intégration',
          'Rapports personnalisés',
          'Support dédié',
          'Analyses multi-domaines'
        ]),
        limits: JSON.stringify({
          maxPages: -1,
          maxAnalysesPerDay: -1,
          maxSites: -1
        }),
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Supprimer les champs ajoutés
    await queryInterface.removeColumn('users', 'subscription');
    await queryInterface.removeColumn('users', 'subscriptionExpiresAt');
    await queryInterface.removeColumn('users', 'lastLogin');
    await queryInterface.removeColumn('users', 'dailyAnalysesCount');
    await queryInterface.removeColumn('users', 'lastAnalysisDate');
    await queryInterface.removeColumn('users', 'totalAnalysesCount');

    // Supprimer la table des plans d'abonnement
    await queryInterface.dropTable('subscription_plans');
  }
};