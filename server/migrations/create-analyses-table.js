// server/migrations/create-analyses-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analyses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      pagesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      duration: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      results: {
        type: Sequelize.JSON,
        allowNull: true
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
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analyses');
  }
};