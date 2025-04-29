// server/cronJobs.js
const cron = require('node-cron');
const { User } = require('./models/User');
const { Op } = require('sequelize');

// Fonction pour configurer les tâches cron de l'application
function setupCronJobs() {
  console.log('Configuration des tâches cron...');
  
  // Réinitialisation des compteurs d'analyses quotidiens à minuit
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Réinitialisation des compteurs d\'analyses quotidiens...');
      const result = await User.update(
        { dailyAnalysesCount: 0 },
        { where: {} }
      );
      console.log(`Compteurs réinitialisés pour ${result[0]} utilisateurs`);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des compteurs:', error);
    }
  });
  
  // Vérification hebdomadaire des abonnements expirés (tous les lundis à 1h du matin)
  cron.schedule('0 1 * * 1', async () => {
    try {
      console.log('Vérification des abonnements expirés...');
      const now = new Date();
      
      const expiredSubscriptions = await User.findAll({
        where: {
          subscription: {
            [Op.not]: 'free'
          },
          subscriptionExpiresAt: {
            [Op.lt]: now
          }
        }
      });
      
      if (expiredSubscriptions.length > 0) {
        console.log(`${expiredSubscriptions.length} abonnements expirés trouvés`);
        
        // Passer ces utilisateurs au plan gratuit
        await User.update(
          { 
            subscription: 'free',
            subscriptionExpiresAt: null
          },
          { 
            where: {
              id: {
                [Op.in]: expiredSubscriptions.map(user => user.id)
              }
            }
          }
        );
        
        console.log('Utilisateurs rétrogradés vers le plan gratuit');
        
        // Ici, vous pourriez également envoyer des e-mails pour informer les utilisateurs
        // que leur abonnement a expiré et les inviter à le renouveler
      } else {
        console.log('Aucun abonnement expiré trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des abonnements expirés:', error);
    }
  });
  
  // Rapport statistique hebdomadaire (tous les dimanches à 23h)
  cron.schedule('0 23 * * 0', async () => {
    try {
      console.log('Génération du rapport statistique hebdomadaire...');
      
      // Récupérer les statistiques
      const totalUsers = await User.count();
      const freeUsers = await User.count({ where: { subscription: 'free' } });
      const basicUsers = await User.count({ where: { subscription: 'basic' } });
      const proUsers = await User.count({ where: { subscription: 'pro' } });
      const enterpriseUsers = await User.count({ where: { subscription: 'enterprise' } });
      
      // Nouveaux utilisateurs cette semaine
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const newUsers = await User.count({
        where: {
          createdAt: {
            [Op.gte]: lastWeek
          }
        }
      });
      
      // Afficher le rapport
      console.log('=== RAPPORT HEBDOMADAIRE ===');
      console.log(`Total utilisateurs: ${totalUsers}`);
      console.log(`Nouveaux utilisateurs: ${newUsers}`);
      console.log('Répartition des abonnements:');
      console.log(`- Gratuit: ${freeUsers} (${((freeUsers / totalUsers) * 100).toFixed(1)}%)`);
      console.log(`- Basique: ${basicUsers} (${((basicUsers / totalUsers) * 100).toFixed(1)}%)`);
      console.log(`- Pro: ${proUsers} (${((proUsers / totalUsers) * 100).toFixed(1)}%)`);
      console.log(`- Entreprise: ${enterpriseUsers} (${((enterpriseUsers / totalUsers) * 100).toFixed(1)}%)`);
      console.log('===========================');
      
      // Ici, vous pourriez également envoyer ce rapport par e-mail à l'administrateur
    } catch (error) {
      console.error('Erreur lors de la génération du rapport hebdomadaire:', error);
    }
  });
  
  console.log('Tâches cron configurées avec succès');
}

module.exports = { setupCronJobs };