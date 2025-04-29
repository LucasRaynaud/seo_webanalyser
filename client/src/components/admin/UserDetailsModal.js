// src/components/admin/UserDetailsModal.js
import React, { useState, useEffect } from 'react';
import './Admin.css';

function UserDetailsModal({ user, onClose, token }) {
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState({ ...user });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userStats, setUserStats] = useState(null);

  // Récupérer les statistiques de l'utilisateur au chargement
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/users/${user.id}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des statistiques de l'utilisateur");
        }

        const data = await response.json();
        setUserStats(data);
      } catch (err) {
        console.error("Erreur de chargement des statistiques:", err);
      }
    };

    fetchUserStats();
  }, [user.id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }

      const data = await response.json();
      setUserData(data.user);
      setSuccess('Utilisateur mis à jour avec succès!');
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionChange = async (plan) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/users/${user.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: plan,
          expiresAt: plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de l'abonnement");
      }

      const data = await response.json();
      setUserData(prev => ({
        ...prev,
        subscription: data.subscription,
        subscriptionExpiresAt: data.subscriptionExpiresAt
      }));
      setSuccess('Abonnement mis à jour avec succès!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="user-details-modal">
        <div className="modal-header">
          <h2>{editMode ? "Modifier l'utilisateur" : "Détails de l'utilisateur"}</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="modal-content">
          <div className="user-details-section">
            <h3>Informations personnelles</h3>
            
            {editMode ? (
              <form onSubmit={handleSubmit} className="user-edit-form">
                <div className="form-group">
                  <label htmlFor="name">Nom</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={userData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="role">Rôle</label>
                  <select
                    id="role"
                    name="role"
                    value={userData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => {
                      setEditMode(false);
                      setUserData({ ...user });
                      setError('');
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="user-details-info">
                <div className="details-row">
                  <span className="details-label">ID:</span>
                  <span className="details-value">{userData.id}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Nom:</span>
                  <span className="details-value">{userData.name}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Email:</span>
                  <span className="details-value">{userData.email}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">Rôle:</span>
                  <span className="details-value">
                    <span className={`user-role ${userData.role}`}>
                      {userData.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label">Date d'inscription:</span>
                  <span className="details-value">
                    {new Date(userData.createdAt).toLocaleDateString()} 
                    ({Math.round((Date.now() - new Date(userData.createdAt)) / (1000 * 60 * 60 * 24))} jours)
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label">Dernière connexion:</span>
                  <span className="details-value">
                    {userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Jamais'}
                  </span>
                </div>

                <button 
                  className="edit-button"
                  onClick={() => setEditMode(true)}
                >
                  Modifier les informations
                </button>
              </div>
            )}
          </div>

          <div className="user-subscription-section">
            <h3>Abonnement</h3>
            <div className="subscription-info">
              <div className="details-row">
                <span className="details-label">Plan actuel:</span>
                <span className="details-value">
                  <span className={`subscription-status ${userData.subscription || 'free'}`}>
                    {userData.subscription ? userData.subscription : 'Gratuit'}
                  </span>
                </span>
              </div>
              
              {userData.subscriptionExpiresAt && (
                <div className="details-row">
                  <span className="details-label">Expiration:</span>
                  <span className="details-value">
                    {new Date(userData.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="subscription-actions">
              <h4>Changer d'abonnement</h4>
              <div className="subscription-buttons">
                <button 
                  className={`subscription-button ${userData.subscription === 'free' ? 'active' : ''}`}
                  onClick={() => handleSubscriptionChange('free')}
                  disabled={loading}
                >
                  Gratuit
                </button>
                <button 
                  className={`subscription-button ${userData.subscription === 'basic' ? 'active' : ''}`}
                  onClick={() => handleSubscriptionChange('basic')}
                  disabled={loading}
                >
                  Basique
                </button>
                <button 
                  className={`subscription-button ${userData.subscription === 'pro' ? 'active' : ''}`}
                  onClick={() => handleSubscriptionChange('pro')}
                  disabled={loading}
                >
                  Pro
                </button>
                <button 
                  className={`subscription-button ${userData.subscription === 'enterprise' ? 'active' : ''}`}
                  onClick={() => handleSubscriptionChange('enterprise')}
                  disabled={loading}
                >
                  Entreprise
                </button>
              </div>
            </div>
          </div>

          {userStats && (
            <div className="user-stats-section">
              <h3>Statistiques d'utilisation</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{userStats.totalAnalyses || 0}</div>
                  <div className="stat-label">Analyses lancées</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{userStats.totalPagesAnalyzed || 0}</div>
                  <div className="stat-label">Pages analysées</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{userStats.lastAnalysisDate ? new Date(userStats.lastAnalysisDate).toLocaleDateString() : 'Jamais'}</div>
                  <div className="stat-label">Dernière analyse</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{userStats.averageSeoScore ? userStats.averageSeoScore.toFixed(1) : 'N/A'}</div>
                  <div className="stat-label">Score SEO moyen</div>
                </div>
              </div>

              {userStats.recentAnalyses && userStats.recentAnalyses.length > 0 && (
                <div className="recent-analyses">
                  <h4>Analyses récentes</h4>
                  <div className="recent-analyses-list">
                    {userStats.recentAnalyses.map((analysis, index) => (
                      <div key={index} className="recent-analysis-item">
                        <div className="analysis-url">{analysis.url}</div>
                        <div className="analysis-date">{new Date(analysis.date).toLocaleDateString()}</div>
                        <div className="analysis-pages">{analysis.pagesCount} pages</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;