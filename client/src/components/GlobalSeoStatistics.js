// src/components/GlobalSeoStatistics.js
import React from 'react';
import './GlobalSeoStatistics.css';

function GlobalSeoStatistics({ analysisResults }) {
  if (!analysisResults || !analysisResults.stats) return null;
  
  const { stats } = analysisResults;
  
  // Fonction pour obtenir une classe de couleur basée sur un pourcentage
  const getColorClass = (percentage) => {
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'average';
    if (percentage >= 40) return 'poor';
    return 'critical';
  };

  return (
    <div className="global-seo-statistics">
      <h3>Statistiques SEO globales</h3>
      
      <div className="stats-overview">
        <div className="stat-card">
          <div className={`stat-value ${getColorClass(stats.averageSEOScore)}`}>
            {Math.round(stats.averageSEOScore)}
          </div>
          <div className="stat-label">Score SEO moyen</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.pagesWithTitle.toFixed(0)}%</div>
          <div className="stat-label">Pages avec titre</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.pagesWithDescription.toFixed(0)}%</div>
          <div className="stat-label">Pages avec description</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.pagesWithH1.toFixed(0)}%</div>
          <div className="stat-label">Pages avec H1</div>
        </div>
      </div>
      
      {stats.scoreDetailsByCategory && (
        <div className="score-by-category">
          <h4>Performance par catégorie</h4>
          
          <div className="categories-grid">
            {Object.entries(stats.scoreDetailsByCategory).map(([category, data]) => (
              <div key={category} className="category-card">
                <div className="category-header">
                  <span className="category-name">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                  <span className={`category-score ${getColorClass(data.average)}`}>
                    {Math.round(data.average)}%
                  </span>
                </div>
                <div className="category-progress-bar">
                  <div 
                    className={`category-progress ${getColorClass(data.average)}`}
                    style={{ width: `${data.average}%` }}
                  ></div>
                </div>
                <div className="category-weight">
                  {data.maxScore}% du score total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {stats.commonIssues && stats.commonIssues.length > 0 && (
        <div className="common-issues">
          <h4>Problèmes SEO les plus fréquents</h4>
          
          <div className="issues-table">
            <div className="issues-header">
              <div className="issue-cell">Problème</div>
              <div className="issue-cell">Catégorie</div>
              <div className="issue-cell">Occurrences</div>
              <div className="issue-cell">Impact</div>
            </div>
            
            {stats.commonIssues.map((issue, index) => (
              <div key={index} className="issues-row">
                <div className="issue-cell issue-name">{issue.name}</div>
                <div className="issue-cell issue-category">{issue.category}</div>
                <div className="issue-cell issue-count">
                  {issue.count} page{issue.count > 1 ? 's' : ''}
                </div>
                <div className="issue-cell issue-impact">
                  <span className={`impact-indicator ${issue.totalPoints > 100 ? 'high' : issue.totalPoints > 50 ? 'medium' : 'low'}`}>
                    {issue.totalPoints > 100 ? 'Élevé' : issue.totalPoints > 50 ? 'Moyen' : 'Faible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="optimization-recommendations">
        <h4>Recommandations prioritaires</h4>
        
        <div className="recommendations-list">
          {stats.commonIssues && stats.commonIssues.length > 0 ? (
            <ol>
              {stats.commonIssues.slice(0, 3).map((issue, index) => (
                <li key={index}>
                  <span className="recommendation-focus">{issue.name}</span> - Corriger ce problème sur {issue.count} page{issue.count > 1 ? 's' : ''}
                </li>
              ))}
            </ol>
          ) : (
            <p>Aucun problème majeur détecté. Continuez d'optimiser le contenu pour une meilleure visibilité.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSeoStatistics;