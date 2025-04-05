// src/components/DetailedSeoScore.js - Version modifiée
import React, { useState } from 'react';
import './DetailedSeoScore.css';

function DetailedSeoScore({ page }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!page) return null;
  
  // Récupérer le score et les détails du calcul
  const score = Math.round(page.seoScore) || 0;
  const scoreDetails = page.scoreDetails || {
    baseScore: 100,
    categories: {
      structure: { maxPoints: 40, earned: 0, factors: [] },
      performance: { maxPoints: 30, earned: 0, factors: [] },
      content: { maxPoints: 20, earned: 0, factors: [] },
      technical: { maxPoints: 10, earned: 0, factors: [] }
    }
  };
  
  // Récupérer les pénalités
  const penalties = page.seoPenalties || [];
  
  // Déterminer la classe de couleur du score
  const getScoreColorClass = (value) => {
    if (value >= 80) return 'good';
    if (value >= 60) return 'average';
    if (value >= 40) return 'poor';
    return 'critical';
  };

  // Formater les catégories pour l'affichage
  const categoryLabels = {
    structure: 'Structure',
    performance: 'Performance',
    content: 'Contenu',
    technical: 'Technique'
  };

  // Extraire tous les facteurs avec des points négatifs de toutes les catégories
  const allNegativeFactors = [];
  Object.keys(scoreDetails.categories).forEach(categoryKey => {
    const category = scoreDetails.categories[categoryKey];
    category.factors.forEach(factor => {
      if (factor.points < 0) {
        allNegativeFactors.push({
          ...factor,
          category: categoryLabels[categoryKey] || categoryKey
        });
      }
    });
  });
  
  // Trier les facteurs par impact (points négatifs les plus importants d'abord)
  allNegativeFactors.sort((a, b) => a.points - b.points);

  return (
    <div className="detailed-seo-score">
      <div className="score-tabs">
        <button 
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Résumé
        </button>
        <button 
          className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommandations
        </button>
      </div>
      
      <div className="score-content">
        {activeTab === 'summary' && (
          <div className="score-summary">
            <div className="score-header">
              <div className={`score-circle ${getScoreColorClass(score)}`}>
                {score}
              </div>
              <div className="score-interpretation">
                <h4>Score SEO global</h4>
                <p>
                  {score >= 90 ? 'Excellent' : 
                   score >= 70 ? 'Bon' : 
                   score >= 50 ? 'Moyen' : 
                   score >= 30 ? 'Faible' : 
                   'Critique'}
                </p>
              </div>
            </div>
            
            <div className="score-breakdown">
              <h4>Répartition par catégorie</h4>
              
              {Object.keys(scoreDetails.categories).map(category => {
                const { maxPoints, earned } = scoreDetails.categories[category];
                const earnedPercentage = Math.round((earned / maxPoints) * 100);
                
                return (
                  <div key={category} className="category-score">
                    <div className="category-header">
                      <span className="category-name">{categoryLabels[category]}</span>
                      <span className="category-points">
                        {earned} / {maxPoints} points
                      </span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className={`category-progress ${getScoreColorClass(earnedPercentage)}`}
                        style={{ width: `${earnedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="main-issues">
              <h4>Points de pénalité détaillés</h4>
              
              {allNegativeFactors.length === 0 ? (
                <p className="no-issues">Aucun problème majeur détecté</p>
              ) : (
                <div className="all-issues-list">
                  {allNegativeFactors.map((factor, index) => (
                    <div key={index} className="issue-item-detailed">
                      <div className="issue-header">
                        <span className="issue-category">{factor.category}</span>
                        <span className="issue-name">{factor.name}</span>
                        <span className="issue-points">{factor.points}</span>
                      </div>
                      <div className="issue-content">
                        {factor.details && <p className="issue-details">{factor.details}</p>}
                        {factor.recommendation && (
                          <p className="issue-recommendation">💡 {factor.recommendation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'recommendations' && (
          <div className="score-recommendations">
            <h4>Recommandations d'optimisation</h4>
            
            {penalties.length === 0 ? (
              <p className="no-recommendations">Votre page est bien optimisée, aucune recommandation particulière.</p>
            ) : (
              <div className="recommendations-list">
                {penalties.map((penalty, index) => (
                  <div key={index} className="recommendation-item">
                    <div className="recommendation-header">
                      <span className="recommendation-category">{penalty.category}</span>
                      <span className="recommendation-name">{penalty.name}</span>
                      <span className="recommendation-impact">{Math.abs(penalty.points)} pts</span>
                    </div>
                    <div className="recommendation-details">
                      <p className="recommendation-issue">{penalty.details}</p>
                      {penalty.recommendation && (
                        <p className="recommendation-action">💡 {penalty.recommendation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="general-tips">
              <h5>Bonnes pratiques générales</h5>
              <ul>
                <li>Assurez-vous que le contenu est original et de qualité</li>
                <li>Optimisez les images avec des dimensions appropriées</li>
                <li>Utilisez des liens internes pour renforcer la structure du site</li>
                <li>Assurez-vous que votre site est mobile-friendly</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailedSeoScore;