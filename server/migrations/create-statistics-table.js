// server/migrations/create-statistics-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('statistics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom de la métrique'
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Valeur de la métrique (stockée comme chaîne pour la flexibilité)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Métadonnées additionnelles associées à la métrique'
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

    // Création des index pour optimiser les performances
    await queryInterface.addIndex('statistics', ['name'], {
      name: 'idx_statistic_name'
    });

    await queryInterface.addIndex('statistics', ['createdAt'], {
      name: 'idx_statistic_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('statistics');
  }
};