// server/models/Analysis.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

class Analysis extends Model {
  static async getAnalysisCountForToday(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.count({
      where: {
        userId,
        createdAt: {
          [DataTypes.Op.gte]: today
        }
      }
    });
  }
  
  static async getUniqueDomainsCount(userId) {
    const analyses = await this.findAll({
      where: { userId },
      attributes: ['url']
    });
    
    const domains = new Set();
    analyses.forEach(analysis => {
      try {
        const url = new URL(analysis.url);
        domains.add(url.hostname);
      } catch (error) {
        // Ignorer les URLs invalides
      }
    });
    
    return domains.size;
  }
}

Analysis.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pagesCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  results: {
    type: DataTypes.JSON,
    allowNull: true
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true
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
  modelName: 'Analysis',
  tableName: 'analyses'
});

// Association avec le modèle User
Analysis.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Analysis, { foreignKey: 'userId' });

module.exports = Analysis;