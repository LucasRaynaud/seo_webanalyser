// server/models/SubscriptionPlan.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

class SubscriptionPlan extends Model {
  // Méthode pour récupérer tous les plans actifs
  static async getActivePlans() {
    return await this.findAll({
      where: {
        isActive: true
      },
      order: [['price', 'ASC']]
    });
  }

  // Méthode pour récupérer un plan par son ID
  static async getPlanById(planId) {
    return await this.findByPk(planId);
  }

  // Méthode pour récupérer le plan par défaut
  static async getDefaultPlan() {
    const defaultPlan = await this.findOne({
      where: {
        isDefault: true,
        isActive: true
      }
    });

    // Si aucun plan par défaut n'est trouvé, utiliser le plan gratuit ou le premier plan actif
    if (!defaultPlan) {
      return await this.findOne({
        where: {
          id: 'free',
          isActive: true
        }
      }) || await this.findOne({
        where: {
          isActive: true
        }
      });
    }

    return defaultPlan;
  }

  // Méthode pour obtenir les limites d'un plan
  getLimits() {
    return this.limits || {
      maxPages: 10,
      maxAnalysesPerDay: 3,
      maxSites: 1
    };
  }
}

SubscriptionPlan.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR'
  },
  period: {
    type: DataTypes.ENUM('month', 'year'),
    allowNull: false,
    defaultValue: 'month'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  limits: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      maxPages: 10,
      maxAnalysesPerDay: 3,
      maxSites: 1
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  modelName: 'SubscriptionPlan',
  tableName: 'subscription_plans',
  hooks: {
    // S'assurer qu'il n'y a qu'un seul plan par défaut
    beforeSave: async (plan) => {
      if (plan.isDefault) {
        // Si ce plan est défini comme défaut, désactiver le paramètre par défaut pour tous les autres plans
        await SubscriptionPlan.update(
          { isDefault: false },
          { 
            where: { 
              id: { [DataTypes.Op.ne]: plan.id },
              isDefault: true
            } 
          }
        );
      }
    }
  }
});

module.exports = SubscriptionPlan;