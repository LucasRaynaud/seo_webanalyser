// src/components/admin/SubscriptionPlans.js
import React, { useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';
import './Admin.css';

function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/subscription-plans`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des plans d'abonnement");
        }

        const data = await response.json();
        setPlans(data.plans || []);
      } catch (err) {
        console.error('Erreur de chargement des plans:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionPlans();
  }, [token]);

  // Si les plans ne sont pas encore définis dans la base de données,
  // nous pouvons initialiser avec des valeurs par défaut
  useEffect(() => {
    if (!loading && plans.length === 0) {
      setPlans([
        {
          id: 'free',
          name: 'Gratuit',
          price: 0,
          currency: 'EUR',
          period: 'month',
          features: [
            'Analyse de 10 pages maximum',
            'Fonctionnalités de base',
            'Score SEO',
            'Recommandations limitées'
          ],
          limits: {
            maxPages: 10,
            maxAnalysesPerDay: 3,
            maxSites: 1
          },
          isActive: true,
          isDefault: true
        },
        {
          id: 'basic',
          name: 'Basique',
          price: 19.99,
          currency: 'EUR',
          period: 'month',
          features: [
            'Analyse de 50 pages maximum',
            'Toutes les fonctionnalités de base',
            'Score SEO détaillé',
            'Recommandations complètes',
            'Rapports exportables'
          ],
          limits: {
            maxPages: 50,
            maxAnalysesPerDay: 10,
            maxSites: 3
          },
          isActive: true,
          isDefault: false
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 49.99,
          currency: 'EUR',
          period: 'month',
          features: [
            'Analyse de 200 pages maximum',
            'Toutes les fonctionnalités basiques',
            'Suivi des changements',
            'Analyses régulières programmées',
            'Rapports avancés',
            'Support prioritaire'
          ],
          limits: {
            maxPages: 200,
            maxAnalysesPerDay: 30,
            maxSites: 10
          },
          isActive: true,
          isDefault: false
        },
        {
          id: 'enterprise',
          name: 'Entreprise',
          price: 99.99,
          currency: 'EUR',
          period: 'month',
          features: [
            'Analyse de pages illimitée',
            'Toutes les fonctionnalités Pro',
            'API d\'accès pour intégration',
            'Rapports personnalisés',
            'Support dédié',
            'Analyses multi-domaines'
          ],
          limits: {
            maxPages: -1, // illimité
            maxAnalysesPerDay: -1, // illimité
            maxSites: -1 // illimité
          },
          isActive: true,
          isDefault: false
        }
      ]);
    }
  }, [loading, plans]);

  const handleEditPlan = (plan) => {
    setEditingPlan({ ...plan });
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('limits.')) {
      const limitName = name.split('.')[1];
      setEditingPlan({
        ...editingPlan,
        limits: {
          ...editingPlan.limits,
          [limitName]: type === 'number' ? parseInt(value) : value
        }
      });
    } else {
      setEditingPlan({
        ...editingPlan,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
      });
    }
  };

  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...editingPlan.features];
    updatedFeatures[index] = value;
    
    setEditingPlan({
      ...editingPlan,
      features: updatedFeatures
    });
  };

  const handleAddFeature = () => {
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, '']
    });
  };

  const handleRemoveFeature = (index) => {
    const updatedFeatures = [...editingPlan.features];
    updatedFeatures.splice(index, 1);
    
    setEditingPlan({
      ...editingPlan,
      features: updatedFeatures
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/admin/subscription-plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingPlan),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du plan d'abonnement");
      }

      const data = await response.json();
      
      // Mettre à jour la liste des plans avec le plan mis à jour
      setPlans(plans.map(plan => plan.id === editingPlan.id ? data.plan : plan));
      
      setSuccess('Plan mis à jour avec succès!');
      setEditingPlan(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = () => {
    // Créer un nouveau plan avec des valeurs par défaut
    const newPlan = {
      id: `plan-${Date.now()}`,
      name: 'Nouveau Plan',
      price: 0,
      currency: 'EUR',
      period: 'month',
      features: ['Nouvelle fonctionnalité'],
      limits: {
        maxPages: 10,
        maxAnalysesPerDay: 5,
        maxSites: 1
      },
      isActive: false,
      isDefault: false
    };
    
    setEditingPlan(newPlan);
  };

  return (
    <div className="subscription-plans-container">
      <div className="plans-header">
        <h2>Plans d'abonnement</h2>
        <button 
          className="add-plan-button"
          onClick={handleAddPlan}
        >
          Ajouter un plan
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {loading && !editingPlan ? (
        <LoadingIndicator message="Chargement des plans d'abonnement..." />
      ) : editingPlan ? (
        <div className="edit-plan-form-container">
          <h3>{editingPlan.id === `plan-${Date.now()}` ? "Ajouter un plan" : "Modifier le plan"}</h3>
          <form onSubmit={handleSubmit} className="edit-plan-form">
            <div className="form-group">
              <label htmlFor="name">Nom du plan</label>
              <input
                type="text"
                id="name"
                name="name"
                value={editingPlan.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="price">Prix</label>
              <div className="price-group">
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={editingPlan.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
                <select
                  name="currency"
                  value={editingPlan.currency}
                  onChange={handleChange}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
                <span>par</span>
                <select
                  name="period"
                  value={editingPlan.period}
                  onChange={handleChange}
                >
                  <option value="month">Mois</option>
                  <option value="year">Année</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Fonctionnalités</label>
              <div className="features-list">
                {editingPlan.features.map((feature, index) => (
                  <div key={index} className="feature-input-group">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      placeholder="Description de la fonctionnalité"
                    />
                    <button 
                      type="button" 
                      className="remove-feature-button"
                      onClick={() => handleRemoveFeature(index)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  className="add-feature-button"
                  onClick={handleAddFeature}
                >
                  + Ajouter une fonctionnalité
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Limites</label>
              <div className="limits-grid">
                <div className="limit-input-group">
                  <label htmlFor="maxPages">Pages maximum</label>
                  <input
                    type="number"
                    id="maxPages"
                    name="limits.maxPages"
                    value={editingPlan.limits.maxPages}
                    onChange={handleChange}
                    min="-1"
                  />
                  <span className="limit-helper">-1 pour illimité</span>
                </div>
                <div className="limit-input-group">
                  <label htmlFor="maxAnalysesPerDay">Analyses par jour</label>
                  <input
                    type="number"
                    id="maxAnalysesPerDay"
                    name="limits.maxAnalysesPerDay"
                    value={editingPlan.limits.maxAnalysesPerDay}
                    onChange={handleChange}
                    min="-1"
                  />
                  <span className="limit-helper">-1 pour illimité</span>
                </div>
                <div className="limit-input-group">
                  <label htmlFor="maxSites">Sites maximum</label>
                  <input
                    type="number"
                    id="maxSites"
                    name="limits.maxSites"
                    value={editingPlan.limits.maxSites}
                    onChange={handleChange}
                    min="-1"
                  />
                  <span className="limit-helper">-1 pour illimité</span>
                </div>
              </div>
            </div>
            
            <div className="form-group form-checkboxes">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={editingPlan.isActive}
                  onChange={handleChange}
                />
                <label htmlFor="isActive">Actif</label>
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={editingPlan.isDefault}
                  onChange={handleChange}
                />
                <label htmlFor="isDefault">Plan par défaut</label>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="save-plan-button"
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={handleCancelEdit}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.isDefault ? 'default-plan' : ''} ${!plan.isActive ? 'inactive-plan' : ''}`}
            >
              {plan.isDefault && <div className="default-badge">Par défaut</div>}
              {!plan.isActive && <div className="inactive-badge">Inactif</div>}
              
              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-value">{plan.price > 0 ? `${plan.price} ${plan.currency}` : 'Gratuit'}</span>
                  {plan.price > 0 && <span className="price-period">/ {plan.period === 'month' ? 'mois' : 'an'}</span>}
                </div>
              </div>
              
              <div className="plan-features">
                <h4>Fonctionnalités</h4>
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="plan-limits">
                <h4>Limites</h4>
                <div className="limit-item">
                  <span className="limit-label">Pages maximum:</span>
                  <span className="limit-value">
                    {plan.limits.maxPages === -1 ? 'Illimité' : plan.limits.maxPages}
                  </span>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Analyses par jour:</span>
                  <span className="limit-value">
                    {plan.limits.maxAnalysesPerDay === -1 ? 'Illimité' : plan.limits.maxAnalysesPerDay}
                  </span>
                </div>
                <div className="limit-item">
                  <span className="limit-label">Sites maximum:</span>
                  <span className="limit-value">
                    {plan.limits.maxSites === -1 ? 'Illimité' : plan.limits.maxSites}
                  </span>
                </div>
              </div>
              
              <div className="plan-actions">
                <button 
                  className="edit-plan-button"
                  onClick={() => handleEditPlan(plan)}
                >
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubscriptionPlans;