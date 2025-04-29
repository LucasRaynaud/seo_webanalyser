// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';
import UsersList from './UsersList';
import UsageStatistics from './UsageStatistics';
import SubscriptionPlans from './SubscriptionPlans';
import './Admin.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminStats, setAdminStats] = useState(null);
  const { user, token } = React.useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si l'utilisateur est un administrateur
    if (user && user.role !== 'admin') {
      navigate('/');
    }

    // Charger les statistiques d'administration
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des statistiques');
        }

        const data = await response.json();
        setAdminStats(data);
      } catch (err) {
        console.error('Erreur de chargement des statistiques:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, [user, token, navigate]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Administration</h1>
        <div className="admin-user-info">
          <span>Connecté en tant que</span>
          <strong>{user?.name}</strong>
          <span className="admin-badge">Administrateur</span>
        </div>
      </div>

      <div className="admin-overview">
        <div className="overview-card">
          <div className="overview-number">{adminStats?.usersCount || 0}</div>
          <div className="overview-title">Utilisateurs</div>
        </div>
        <div className="overview-card">
          <div className="overview-number">{adminStats?.analysisCount || 0}</div>
          <div className="overview-title">Analyses</div>
        </div>
        <div className="overview-card">
          <div className="overview-number">{adminStats?.pagesAnalyzedCount || 0}</div>
          <div className="overview-title">Pages analysées</div>
        </div>
        <div className="overview-card">
          <div className="overview-number">{adminStats?.activeSubscriptions || 0}</div>
          <div className="overview-title">Abonnements actifs</div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Utilisateurs
          </button>
          <button 
            className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistiques d'utilisation
          </button>
          <button 
            className={`admin-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Plans d'abonnement
          </button>
        </div>

        <div className="admin-tab-content">
          {loading ? (
            <LoadingIndicator message="Chargement des données..." />
          ) : error ? (
            <div className="admin-error">{error}</div>
          ) : (
            <>
              {activeTab === 'users' && <UsersList />}
              {activeTab === 'stats' && <UsageStatistics />}
              {activeTab === 'subscriptions' && <SubscriptionPlans />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;