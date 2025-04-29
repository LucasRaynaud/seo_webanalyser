// server/services/statisticsService.js
const Statistic = require('../models/Statistic');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Service pour gérer les statistiques de l'application
 */
class StatisticsService {
  /**
   * Enregistre une métrique dans la base de données
   * @param {string} name - Nom de la métrique
   * @param {string|number} value - Valeur de la métrique
   * @param {Object} metadata - Métadonnées additionnelles
   */
  static async recordMetric(name, value, metadata = {}) {
    return await Statistic.recordMetric(name, value, metadata);
  }

  /**
   * Enregistre les métriques d'analyse
   * @param {Analysis} analysis - Objet Analysis
   * @param {User} user - Objet User
   */
  static async recordAnalysisMetrics(analysis, user) {
    if (!analysis || !user) return;

    await Promise.all([
      this.recordMetric('analysis_completed', 1, {
        userId: user.id,
        analysisId: analysis.id,
        url: analysis.url,
        pagesCount: analysis.pagesCount
      }),
      this.recordMetric('pages_analyzed', analysis.pagesCount, {
        userId: user.id,
        analysisId: analysis.id
      }),
      this.recordMetric('analysis_duration', analysis.duration || 0, {
        userId: user.id,
        analysisId: analysis.id
      })
    ]);

    // Si un score SEO moyen est disponible, l'enregistrer
    if (analysis.score) {
      await this.recordMetric('seo_score', analysis.score, {
        userId: user.id,
        analysisId: analysis.id
      });
    }
  }

  /**
   * Génère et enregistre les statistiques quotidiennes
   */
  static async generateDailyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compter le nombre d'utilisateurs actifs hier
    const activeUsers = await User.count({
      where: {
        lastAnalysisDate: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    // Compter le nombre de nouveaux utilisateurs hier
    const newUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        }
      }
    });

    // Compter le nombre d'analyses effectuées hier
    const analysesCount = await Analysis.count({
      where: {
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        },
        status: 'completed'
      }
    });

    // Compter le nombre total de pages analysées hier
    const pagesCount = await Analysis.sum('pagesCount', {
      where: {
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        },
        status: 'completed'
      }
    }) || 0;

    // Enregistrer les statistiques quotidiennes
    await Promise.all([
      this.recordMetric('daily_active_users', activeUsers, { date: yesterday.toISOString().split('T')[0] }),
      this.recordMetric('daily_new_users', newUsers, { date: yesterday.toISOString().split('T')[0] }),
      this.recordMetric('daily_analyses', analysesCount, { date: yesterday.toISOString().split('T')[0] }),
      this.recordMetric('daily_pages_analyzed', pagesCount, { date: yesterday.toISOString().split('T')[0] })
    ]);

    // Statistiques par type d'abonnement
    const subscriptionTypes = ['free', 'basic', 'pro', 'enterprise'];
    
    for (const subscription of subscriptionTypes) {
      const userCount = await User.count({
        where: { subscription }
      });
      
      await this.recordMetric('subscription_count', userCount, { 
        subscription,
        date: yesterday.toISOString().split('T')[0]
      });
    }

    return {
      date: yesterday.toISOString().split('T')[0],
      activeUsers,
      newUsers,
      analysesCount,
      pagesCount
    };
  }

  /**
   * Obtient les statistiques d'administration
   * @param {string} period - Période (day, week, month, year, all)
   */
  static async getAdminStatistics(period = 'month') {
    try {
      // Récupérer les tendances pour la période
      const trends = await Statistic.getTrends(period);

      // Définir la date de début en fonction de la période
      const startDate = this.getStartDateForPeriod(period);

      // Récupérer les statistiques spécifiques
      const [
        totalUsers,
        activeUsers,
        totalAnalyses,
        totalPages,
        subscriptionCounts,
        dailyActivity,
        topUsers
      ] = await Promise.all([
        User.count(),
        User.count({
          where: {
            lastAnalysisDate: {
              [Op.gte]: startDate
            }
          }
        }),
        Analysis.count({
          where: {
            createdAt: {
              [Op.gte]: startDate
            },
            status: 'completed'
          }
        }),
        Analysis.sum('pagesCount', {
          where: {
            createdAt: {
              [Op.gte]: startDate
            },
            status: 'completed'
          }
        }) || 0,
        this.getSubscriptionCounts(),
        this.getDailyActivity(period),
        this.getTopUsers(period, 10)
      ]);

      // Récupérer les statistiques de la période précédente pour comparaison
      const previousStartDate = this.getStartDateForPreviousPeriod(period);
      const previousEndDate = startDate;

      const [
        previousActiveUsers,
        previousTotalAnalyses,
        previousTotalPages,
        previousNewUsers
      ] = await Promise.all([
        User.count({
          where: {
            lastAnalysisDate: {
              [Op.gte]: previousStartDate,
              [Op.lt]: previousEndDate
            }
          }
        }),
        Analysis.count({
          where: {
            createdAt: {
              [Op.gte]: previousStartDate,
              [Op.lt]: previousEndDate
            },
            status: 'completed'
          }
        }),
        Analysis.sum('pagesCount', {
          where: {
            createdAt: {
              [Op.gte]: previousStartDate,
              [Op.lt]: previousEndDate
            },
            status: 'completed'
          }
        }) || 0,
        User.count({
          where: {
            createdAt: {
              [Op.gte]: previousStartDate,
              [Op.lt]: previousEndDate
            }
          }
        })
      ]);

      // Calculer le nombre de nouveaux utilisateurs pour la période actuelle
      const newUsers = await User.count({
        where: {
          createdAt: {
            [Op.gte]: startDate
          }
        }
      });

      // Construire l'objet de statistiques
      return {
        period,
        totalUsers,
        activeUsers,
        newUsers,
        totalAnalyses,
        totalPagesAnalyzed: totalPages,
        subscriptions: subscriptionCounts,
        dailyActivity,
        topUsers,
        previousPeriod: {
          activeUsers: previousActiveUsers,
          newUsers: previousNewUsers,
          totalAnalyses: previousTotalAnalyses,
          totalPagesAnalyzed: previousTotalPages
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques d\'administration:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques d'un utilisateur spécifique
   * @param {number} userId - ID de l'utilisateur
   */
  static async getUserStatistics(userId) {
    if (!userId) throw new Error('ID utilisateur requis');

    const [
      totalAnalyses,
      totalPagesAnalyzed,
      lastAnalysis,
      averageSeoScore,
      recentAnalyses
    ] = await Promise.all([
      Analysis.count({
        where: {
          userId,
          status: 'completed'
        }
      }),
      Analysis.sum('pagesCount', {
        where: {
          userId,
          status: 'completed'
        }
      }) || 0,
      Analysis.findOne({
        where: {
          userId,
          status: 'completed'
        },
        order: [['createdAt', 'DESC']]
      }),
      Analysis.findAll({
        where: {
          userId,
          status: 'completed',
          score: {
            [Op.ne]: null
          }
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('score')), 'averageScore']
        ],
        raw: true
      }).then(result => result[0]?.averageScore || null),
      Analysis.findAll({
        where: {
          userId,
          status: 'completed'
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'url', 'pagesCount', 'score', 'createdAt']
      })
    ]);

    return {
      totalAnalyses,
      totalPagesAnalyzed,
      lastAnalysisDate: lastAnalysis ? lastAnalysis.createdAt : null,
      averageSeoScore,
      recentAnalyses: recentAnalyses.map(analysis => ({
        id: analysis.id,
        url: analysis.url,
        date: analysis.createdAt,
        pagesCount: analysis.pagesCount,
        score: analysis.score
      }))
    };
  }

  /**
   * Obtient la répartition des abonnements
   */
  static async getSubscriptionCounts() {
    // Récupérer tous les plans disponibles
    const plans = await SubscriptionPlan.findAll();
    const planIds = plans.map(plan => plan.id);

    // Compte par défaut pour chaque plan
    const counts = planIds.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {});

    // S'assurer que 'free' est toujours inclus
    if (!counts.free) counts.free = 0;

    // Compter les utilisateurs par type d'abonnement
    const subscriptionCounts = await User.findAll({
      attributes: [
        'subscription',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['subscription'],
      raw: true
    });

    // Mettre à jour les compteurs
    subscriptionCounts.forEach(item => {
      const subscription = item.subscription || 'free';
      counts[subscription] = parseInt(item.count);
    });

    return counts;
  }

  /**
   * Obtient l'activité quotidienne
   * @param {string} period - Période (day, week, month, year, all)
   */
  static async getDailyActivity(period = 'week') {
    // Déterminer le nombre de jours à récupérer
    let days;
    switch (period) {
      case 'day':
        days = 1;
        break;
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      case 'year':
        days = 365;
        break;
      case 'all':
      default:
        days = 30; // Par défaut, limiter à 30 jours
        break;
    }

    // Limiter à 30 jours maximum pour éviter trop de données
    days = Math.min(days, 30);

    // Récupérer les statistiques d'analyse par jour
    const dailyAnalyses = await Analysis.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'analysesCount'],
        [sequelize.fn('SUM', sequelize.col('pagesCount')), 'pagesCount']
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        },
        status: 'completed'
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [sequelize.literal('date ASC')],
      raw: true
    });

    // Générer tous les jours de la période
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateString = date.toISOString().split('T')[0];

      // Trouver les données pour ce jour
      const dayData = dailyAnalyses.find(d => d.date === dateString);

      result.push({
        date: dateString,
        analysesCount: dayData ? parseInt(dayData.analysesCount) : 0,
        pagesCount: dayData ? parseInt(dayData.pagesCount) : 0
      });
    }

    return result;
  }

  /**
   * Récupère les utilisateurs les plus actifs
   * @param {string} period - Période (day, week, month, year, all)
   * @param {number} limit - Nombre maximum d'utilisateurs à retourner
   */
  static async getTopUsers(period = 'month', limit = 10) {
    const startDate = this.getStartDateForPeriod(period);

    // Récupérer les utilisateurs avec le plus d'analyses
    const topUsersByAnalyses = await Analysis.findAll({
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'analysesCount'],
        [sequelize.fn('SUM', sequelize.col('pagesCount')), 'pagesAnalyzed'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastActivity']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate
        },
        status: 'completed'
      },
      group: ['userId'],
      order: [sequelize.literal('analysesCount DESC')],
      limit,
      raw: true
    });

    // Récupérer les informations des utilisateurs
    const userIds = topUsersByAnalyses.map(item => item.userId);
    if (userIds.length === 0) return [];

    const users = await User.findAll({
      where: {
        id: {
          [Op.in]: userIds
        }
      },
      attributes: ['id', 'name', 'email', 'subscription', 'createdAt'],
      raw: true
    });

    // Fusionner les informations
    return topUsersByAnalyses.map(stats => {
      const user = users.find(u => u.id === stats.userId);
      return {
        id: stats.userId,
        name: user ? user.name : `Utilisateur #${stats.userId}`,
        email: user ? user.email : '',
        subscription: user ? user.subscription : 'free',
        analysesCount: parseInt(stats.analysesCount),
        pagesAnalyzed: parseInt(stats.pagesAnalyzed),
        lastActivity: stats.lastActivity
      };
    });
  }

  /**
   * Obtient la date de début pour une période donnée
   * @param {string} period - Période (day, week, month, year, all)
   */
  static getStartDateForPeriod(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
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
      default:
        startDate = new Date(0); // Début de l'époque Unix
        break;
    }

    return startDate;
  }

  /**
   * Obtient la date de début pour la période précédente
   * @param {string} period - Période (day, week, month, year, all)
   */
  static getStartDateForPreviousPeriod(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 2);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Début de l'époque Unix
        break;
    }

    return startDate;
  }
}

module.exports = StatisticsService;
