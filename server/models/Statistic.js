// server/models/Statistic.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

class Statistic extends Model {
  // Méthode pour enregistrer une métrique
  static async recordMetric(name, value, metadata = {}) {
    return await this.create({
      name,
      value,
      metadata
    });
  }
  
  // Méthode pour obtenir les statistiques pour une période donnée
  static async getStatsForPeriod(period = 'day', metricName = null) {
    const now = new Date();
    let startDate;
    
    // Déterminer la date de début en fonction de la période
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Début de l'époque Unix
        break;
      case 'day':
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Début de la journée
        break;
    }
    
    // Construire la requête
    const query = {
      where: {
        createdAt: {
          [Op.gte]: startDate
        }
      },
      order: [['createdAt', 'DESC']]
    };
    
    // Si un nom de métrique est spécifié, filtrer par ce nom
    if (metricName) {
      query.where.name = metricName;
    }
    
    return await this.findAll(query);
  }
  
  // Méthode pour obtenir les statistiques agrégées
  static async getAggregatedStats(period = 'day') {
    // Récupérer toutes les statistiques pour la période
    const stats = await this.getStatsForPeriod(period);
    
    // Regrouper par nom de métrique
    const grouped = stats.reduce((acc, stat) => {
      if (!acc[stat.name]) {
        acc[stat.name] = [];
      }
      acc[stat.name].push(stat);
      return acc;
    }, {});
    
    // Calculer les agrégats pour chaque métrique
    const aggregated = {};
    
    for (const [name, values] of Object.entries(grouped)) {
      // Calculer la moyenne
      const sum = values.reduce((total, stat) => total + parseFloat(stat.value), 0);
      const average = sum / values.length;
      
      // Trouver le min et le max
      const numericValues = values.map(stat => parseFloat(stat.value));
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      
      // Trouver la valeur la plus récente
      const latest = values.reduce((latest, stat) => {
        return new Date(stat.createdAt) > new Date(latest.createdAt) ? stat : latest;
      }, values[0]);
      
      aggregated[name] = {
        count: values.length,
        sum,
        average,
        min,
        max,
        latest: latest.value,
        latestDate: latest.createdAt
      };
    }
    
    return aggregated;
  }
  
  // Méthode pour obtenir les tendances (comparaison avec la période précédente)
  static async getTrends(period = 'day') {
    // Période actuelle
    const currentStats = await this.getAggregatedStats(period);
    
    // Déterminer la période précédente
    let previousPeriodName;
    switch (period) {
      case 'day':
        previousPeriodName = 'day-1';
        break;
      case 'week':
        previousPeriodName = 'week-1';
        break;
      case 'month':
        previousPeriodName = 'month-1';
        break;
      case 'year':
        previousPeriodName = 'year-1';
        break;
      default:
        previousPeriodName = period;
    }
    
    // Récupérer les statistiques de la période précédente
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        endDate = new Date(now);
        endDate.setHours(0, 0, 0, 0);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 7);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        endDate = new Date(now);
        endDate.setMonth(now.getMonth() - 1);
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        endDate = new Date(now);
        endDate.setFullYear(now.getFullYear() - 1);
        startDate = new Date(endDate);
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        // Pour "all" ou autres périodes non standard, pas de comparaison
        return { current: currentStats, previous: {}, trends: {} };
    }
    
    // Requête pour la période précédente
    const previousStats = await this.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      }
    });
    
    // Regrouper par nom de métrique
    const grouped = previousStats.reduce((acc, stat) => {
      if (!acc[stat.name]) {
        acc[stat.name] = [];
      }
      acc[stat.name].push(stat);
      return acc;
    }, {});
    
    // Calculer les agrégats pour la période précédente
    const previousAggregated = {};
    
    for (const [name, values] of Object.entries(grouped)) {
      if (values.length === 0) continue;
      
      const sum = values.reduce((total, stat) => total + parseFloat(stat.value), 0);
      const average = sum / values.length;
      
      previousAggregated[name] = {
        count: values.length,
        sum,
        average
      };
    }
    
    // Calculer les tendances
    const trends = {};
    
    for (const [name, current] of Object.entries(currentStats)) {
      const previous = previousAggregated[name];
      
      if (previous) {
        // Calculer le changement en pourcentage
        const percentChange = ((current.sum - previous.sum) / previous.sum) * 100;
        
        trends[name] = {
          percentChange,
          absolute: current.sum - previous.sum,
          direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable'
        };
      } else {
        trends[name] = {
          percentChange: null,
          absolute: current.sum,
          direction: 'new' // Nouvelle métrique, pas de comparaison
        };
      }
    }
    
    return {
      current: currentStats,
      previous: previousAggregated,
      trends
    };
  }
}

Statistic.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom de la métrique'
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Valeur de la métrique (stockée comme chaîne pour la flexibilité)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Métadonnées additionnelles associées à la métrique'
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
  modelName: 'Statistic',
  tableName: 'statistics',
  indexes: [
    {
      name: 'idx_statistic_name',
      fields: ['name']
    },
    {
      name: 'idx_statistic_created_at',
      fields: ['createdAt']
    }
  ]
});

module.exports = Statistic;