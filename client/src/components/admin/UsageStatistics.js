// src/components/admin/UsageStatistics.js
import React, { useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';
import './Admin.css';

function UsageStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/statistics?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des statistiques");
        }

        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        console.error('Erreur de chargement des statistiques:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [token, period]);

  const renderPeriodSelector = () => (
    <div className="period-selector">
      <button 
        className={`period-button ${period === 'week' ? 'active' : ''}`}
        onClick={() => setPeriod('week')}
      >
        Semaine
      </button>
      <button 
        className={`period-button ${period === 'month' ? 'active' : ''}`}
        onClick={() => setPeriod('month')}
      >
        Mois
      </button>
      <button 
        className={`period-button ${period === 'year' ? 'active' : ''}`}
        onClick={() => setPeriod('year')}
      >
        Année
      </button>
      <button 
        className={`period-button ${period === 'all' ? 'active' : ''}`}
        onClick={() => setPeriod('all')}
      >
        Tout
      </button>
    </div>
  );

  // Fonction pour formater un nombre avec séparateur de milliers
  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Fonction pour calculer la différence en pourcentage
  const calculatePercentChange = (current, previous) => {
    if (!previous) return null;
    const percentChange = ((current - previous) / previous) * 100;
    return percentChange.toFixed(1);
  };

  return (
    <div className="usage-statistics-container">
      <div className="stats-header">
        <h2>Statistiques d'utilisation</h2>
        {renderPeriodSelector()}
      </div>

      {loading ? (
        <LoadingIndicator message="Chargement des statistiques..." />
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : statistics ? (
        <>
          <div className="stats-overview">
            <div className="stats-card">
              <div className="stats-title">Analyses totales</div>
              <div className="stats-value">{formatNumber(statistics.totalAnalyses)}</div>
              {statistics.previousPeriod && (
                <div className={`stats-change ${parseFloat(calculatePercentChange(statistics.totalAnalyses, statistics.previousPeriod.totalAnalyses)) >= 0 ? 'positive' : 'negative'}`}>
                  {calculatePercentChange(statistics.totalAnalyses, statistics.previousPeriod.totalAnalyses)}% 
                  {parseFloat(calculatePercentChange(statistics.totalAnalyses, statistics.previousPeriod.totalAnalyses)) >= 0 ? '▲' : '▼'}
                </div>
              )}
            </div>
            <div className="stats-card">
              <div className="stats-title">Pages analysées</div>
              <div className="stats-value">{formatNumber(statistics.totalPagesAnalyzed)}</div>
              {statistics.previousPeriod && (
                <div className={`stats-change ${parseFloat(calculatePercentChange(statistics.totalPagesAnalyzed, statistics.previousPeriod.totalPagesAnalyzed)) >= 0 ? 'positive' : 'negative'}`}>
                  {calculatePercentChange(statistics.totalPagesAnalyzed, statistics.previousPeriod.totalPagesAnalyzed)}% 
                  {parseFloat(calculatePercentChange(statistics.totalPagesAnalyzed, statistics.previousPeriod.totalPagesAnalyzed)) >= 0 ? '▲' : '▼'}
                </div>
              )}
            </div>
            <div className="stats-card">
              <div className="stats-title">Utilisateurs actifs</div>
              <div className="stats-value">{formatNumber(statistics.activeUsers)}</div>
              {statistics.previousPeriod && (
                <div className={`stats-change ${parseFloat(calculatePercentChange(statistics.activeUsers, statistics.previousPeriod.activeUsers)) >= 0 ? 'positive' : 'negative'}`}>
                  {calculatePercentChange(statistics.activeUsers, statistics.previousPeriod.activeUsers)}% 
                  {parseFloat(calculatePercentChange(statistics.activeUsers, statistics.previousPeriod.activeUsers)) >= 0 ? '▲' : '▼'}
                </div>
              )}
            </div>
            <div className="stats-card">
              <div className="stats-title">Nouveaux utilisateurs</div>
              <div className="stats-value">{formatNumber(statistics.newUsers)}</div>
              {statistics.previousPeriod && (
                <div className={`stats-change ${parseFloat(calculatePercentChange(statistics.newUsers, statistics.previousPeriod.newUsers)) >= 0 ? 'positive' : 'negative'}`}>
                  {calculatePercentChange(statistics.newUsers, statistics.previousPeriod.newUsers)}% 
                  {parseFloat(calculatePercentChange(statistics.newUsers, statistics.previousPeriod.newUsers)) >= 0 ? '▲' : '▼'}
                </div>
              )}
            </div>
          </div>

          <div className="stats-sections">
            <div className="stats-section">
              <h3>Abonnements</h3>
              <div className="subscription-stats">
                <div className="subscription-stat">
                  <div className="subscription-name">Gratuit</div>
                  <div className="subscription-bar-container">
                    <div 
                      className="subscription-bar free"
                      style={{ width: `${(statistics.subscriptions.free / statistics.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <div className="subscription-value">{statistics.subscriptions.free}</div>
                  <div className="subscription-percentage">
                    {((statistics.subscriptions.free / statistics.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="subscription-stat">
                  <div className="subscription-name">Basique</div>
                  <div className="subscription-bar-container">
                    <div 
                      className="subscription-bar basic"
                      style={{ width: `${(statistics.subscriptions.basic / statistics.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <div className="subscription-value">{statistics.subscriptions.basic}</div>
                  <div className="subscription-percentage">
                    {((statistics.subscriptions.basic / statistics.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="subscription-stat">
                  <div className="subscription-name">Pro</div>
                  <div className="subscription-bar-container">
                    <div 
                      className="subscription-bar pro"
                      style={{ width: `${(statistics.subscriptions.pro / statistics.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <div className="subscription-value">{statistics.subscriptions.pro}</div>
                  <div className="subscription-percentage">
                    {((statistics.subscriptions.pro / statistics.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="subscription-stat">
                  <div className="subscription-name">Entreprise</div>
                  <div className="subscription-bar-container">
                    <div 
                      className="subscription-bar enterprise"
                      style={{ width: `${(statistics.subscriptions.enterprise / statistics.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <div className="subscription-value">{statistics.subscriptions.enterprise}</div>
                  <div className="subscription-percentage">
                    {((statistics.subscriptions.enterprise / statistics.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Activité par jour</h3>
              <div className="activity-chart">
                {statistics.dailyActivity && statistics.dailyActivity.map((day, index) => (
                  <div key={index} className="activity-day">
                    <div 
                      className="activity-bar"
                      style={{ height: `${(day.analysesCount / Math.max(...statistics.dailyActivity.map(d => d.analysesCount))) * 100}%` }}
                    ></div>
                    <div className="activity-label">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stats-table-section">
            <h3>Top utilisateurs</h3>
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Abonnement</th>
                    <th>Analyses</th>
                    <th>Pages</th>
                    <th>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.topUsers.map((user, index) => (
                    <tr key={index}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`subscription-status ${user.subscription || 'free'}`}>
                          {user.subscription ? user.subscription : 'Gratuit'}
                        </span>
                      </td>
                      <td>{user.analysesCount}</td>
                      <td>{user.pagesAnalyzed}</td>
                      <td>{new Date(user.lastActivity).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="admin-message">Aucune donnée disponible.</div>
      )}
    </div>
  );
}

export default UsageStatistics;