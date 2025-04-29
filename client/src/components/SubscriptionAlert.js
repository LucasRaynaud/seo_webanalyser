// src/components/SubscriptionAlert.js
import React from 'react';
import './SubscriptionAlert.css';

function SubscriptionAlert({ limitData, onClose }) {
  // Si pas de données de limite, ne rien afficher
  if (!limitData) return null;

  // Formatage du message d'erreur en fonction du type de limite
  const getLimitMessage = () => {
    switch (limitData.limitType) {
      case 'subscription':
        return 'Votre abonnement a expiré. Veuillez le renouveler pour continuer à utiliser le service.';
      
      case 'pages':
        return `Votre abonnement est limité à ${limitData.currentLimit} pages par analyse. Vous avez demandé ${limitData.requestedPages} pages.`;
      
      case 'dailyAnalyses':
        return `Vous avez atteint votre limite quotidienne de ${limitData.currentLimit} analyses.`;
      
      case 'sites':
        return `Votre abonnement est limité à ${limitData.currentLimit} sites différents.`;
      
      default:
        return limitData.error || "Une limitation d'abonnement a été atteinte.";
    }
  };

  // Déterminer l'abonnement requis pour répondre aux besoins
  const getRecommendedPlan = () => {
    // Recommandation par défaut
    let recommendedPlan = {
      name: 'Basique',
      price: '19,99€',
      key: 'basic'
    };
    
    // Si besoin d'un plan plus élevé en fonction du type de limite
    if (limitData.limitType === 'pages' && limitData.requestedPages > 50) {
      recommendedPlan = {
        name: 'Pro',
        price: '49,99€',
        key: 'pro'
      };
    }
    
    if (limitData.limitType === 'dailyAnalyses' && limitData.currentLimit < 10) {
      recommendedPlan = {
        name: 'Pro',
        price: '49,99€',
        key: 'pro'
      };
    }
    
    // Si même le Pro ne suffit pas
    if ((limitData.limitType === 'pages' && limitData.requestedPages > 200) ||
        (limitData.limitType === 'dailyAnalyses' && limitData.currentLimit >= 10 && limitData.currentLimit < 30) ||
        (limitData.limitType === 'sites' && limitData.currentLimit < 10)) {
      recommendedPlan = {
        name: 'Entreprise',
        price: '99,99€',
        key: 'enterprise'
      };
    }
    
    return recommendedPlan;
  };

  const recommendedPlan = getRecommendedPlan();

  return (
    <div className="subscription-alert">
      <div className="alert-header">
        <h3>Limite d'abonnement atteinte</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="alert-content">
        <div className="limit-message">
          {getLimitMessage()}
        </div>
        
        <div className="plan-recommendation">
          <h4>Nous vous recommandons</h4>
          
          <div className="recommended-plan">
            <div className={`plan-badge ${recommendedPlan.key}`}>
              {recommendedPlan.name}
            </div>
            <div className="plan-price">
              {recommendedPlan.price}<span>/mois</span>
            </div>
            <div className="plan-features">
              {recommendedPlan.key === 'basic' && (
                <ul>
                  <li>50 pages par analyse</li>
                  <li>10 analyses par jour</li>
                  <li>3 sites différents</li>
                  <li>Score SEO détaillé</li>
                </ul>
              )}
              
              {recommendedPlan.key === 'pro' && (
                <ul>
                  <li>200 pages par analyse</li>
                  <li>30 analyses par jour</li>
                  <li>10 sites différents</li>
                  <li>Analyses programmées</li>
                  <li>Support prioritaire</li>
                </ul>
              )}
              
              {recommendedPlan.key === 'enterprise' && (
                <ul>
                  <li>Pages illimitées</li>
                  <li>Analyses illimitées</li>
                  <li>Sites illimités</li>
                  <li>API d'intégration</li>
                  <li>Support dédié</li>
                </ul>
              )}
            </div>
            
            <a href="#upgrade" className="upgrade-button">
              Passer à l'abonnement {recommendedPlan.name}
            </a>
          </div>
        </div>
        
        <div className="compare-plans">
          <a href="#plans" className="compare-link">
            Comparer tous les plans d'abonnement
          </a>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionAlert;