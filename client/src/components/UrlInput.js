// src/components/UrlInput.js (mise à jour avec gestion des limitations)
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import LoadingIndicator from './LoadingIndicator';
import SubscriptionAlert from './SubscriptionAlert'; // Nouveau composant à créer
import './UrlInput.css';

function UrlInput({ onAnalyze }) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10); // Valeur par défaut pour le plan gratuit
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [subscriptionLimit, setSubscriptionLimit] = useState(null);
  
  const { token, user } = useContext(AuthContext);

  // Déterminer la limite de pages maximale en fonction de l'abonnement
  React.useEffect(() => {
    if (user) {
      let limit = 10; // Défaut pour le plan gratuit
      
      switch (user.subscription) {
        case 'basic':
          limit = 50;
          break;
        case 'pro':
          limit = 200;
          break;
        case 'enterprise':
          limit = 999; // "Illimité" pour l'interface utilisateur
          break;
        default:
          limit = 10;
      }
      
      setMaxPages(limit > maxPages ? maxPages : limit);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation simple de l'URL
    if (!url || !url.match(/^(http|https):\/\/[a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}(\/.*)?$/)) {
      setError('Veuillez entrer une URL valide (ex: https://example.com)');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setProgress(0);
    setStatusMessage('Initialisation du crawl...');
    setSubscriptionLimit(null);
    
    // Commencer la simulation de progression
    const progressInterval = startProgressSimulation();
    
    try {
      // Appel à notre API de crawling avec le token d'authentification et les limites
      setStatusMessage('Crawl des pages en cours...');
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          url,
          maxPages: parseInt(maxPages) 
        }),
        credentials: 'include'
      });
      
      // Traiter les différents types d'erreurs
      if (!response.ok) {
        // Si le statut est 401, cela signifie que l'authentification a échoué
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        // Si le statut est 403, cela peut être une limitation d'abonnement
        if (response.status === 403) {
          const errorData = await response.json();
          // Si c'est une limitation d'abonnement, stocker l'information pour l'afficher
          if (errorData.upgradeRequired) {
            setSubscriptionLimit(errorData);
            clearInterval(progressInterval);
            setIsLoading(false);
            return;
          }
        }
        
        throw new Error('Erreur lors du crawling du site');
      }
      
      setStatusMessage('Traitement des résultats...');
      setProgress(90);
      
      const data = await response.json();
      setProgress(100);
      
      // Arrêter la simulation de progression
      clearInterval(progressInterval);
      
      onAnalyze(data);
    } catch (err) {
      setError(err.message);
      clearInterval(progressInterval);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour simuler la progression du crawl
  const startProgressSimulation = () => {
    // Simulation de progression du crawl
    return setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress >= 90) {
          return 90; // Plafond à 90% en attendant la réponse complète
        }
        
        // Progression plus rapide au début, plus lente vers la fin
        const increment = prevProgress < 30 ? 5 : 
                          prevProgress < 60 ? 3 : 
                          prevProgress < 80 ? 1 : 0.5;
        
        // Mise à jour des messages en fonction de la progression
        const newProgress = prevProgress + increment;
        
        if (newProgress > 30 && prevProgress <= 30) {
          setStatusMessage('Découverte des liens...');
        } else if (newProgress > 60 && prevProgress <= 60) {
          setStatusMessage('Analyse des pages trouvées...');
        } else if (newProgress > 80 && prevProgress <= 80) {
          setStatusMessage('Finalisation du crawl...');
        }
        
        return newProgress;
      });
    }, 300);
  };

  // Déterminer les limites de pages en fonction de l'abonnement
  const getPageLimits = () => {
    if (!user) return { min: 1, max: 10 };
    
    switch (user.subscription) {
      case 'basic':
        return { min: 1, max: 50 };
      case 'pro':
        return { min: 1, max: 200 };
      case 'enterprise':
        return { min: 1, max: 999 }; // "Illimité" pour l'interface
      default:
        return { min: 1, max: 10 };
    }
  };

  const pageLimits = getPageLimits();

  return (
    <div className="url-input-container">
      <h2>Analyseur SEO</h2>
      
      {/* Alerte d'abonnement si nécessaire */}
      {subscriptionLimit && (
        <SubscriptionAlert 
          limitData={subscriptionLimit} 
          onClose={() => setSubscriptionLimit(null)} 
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Entrez l'URL du site (ex: https://example.com)"
            disabled={isLoading}
            className="url-input"
          />
          
          <div className="pages-limit-container">
            <label htmlFor="maxPages">Pages max:</label>
            <input
              type="number"
              id="maxPages"
              value={maxPages}
              onChange={(e) => setMaxPages(Math.min(pageLimits.max, Math.max(pageLimits.min, parseInt(e.target.value) || 1)))}
              min={pageLimits.min}
              max={pageLimits.max}
              disabled={isLoading}
              className="pages-input"
            />
            <span className="pages-limit-info">
              {user && user.subscription === 'enterprise' ? 'Illimité' : `Max: ${pageLimits.max}`}
            </span>
          </div>
          
          <button type="submit" disabled={isLoading} className="analyze-button">
            {isLoading ? 'Analyse en cours...' : 'Analyser'}
          </button>
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        {user && user.subscription !== 'enterprise' && (
          <div className="subscription-info">
            <span className={`subscription-badge ${user.subscription || 'free'}`}>
              {user.subscription === 'basic' ? 'Abonnement Basique' : 
               user.subscription === 'pro' ? 'Abonnement Pro' : 
               'Compte Gratuit'}
            </span>
            <span className="daily-limit">
              Analyses aujourd'hui: {user.dailyAnalysesCount || 0} / 
              {user.subscription === 'basic' ? '10' : 
               user.subscription === 'pro' ? '30' : '3'}
            </span>
            {user.subscription !== 'pro' && (
              <a href="#upgrade" className="upgrade-link">Passer à un abonnement supérieur</a>
            )}
          </div>
        )}
      </form>
      
      {isLoading && (
        <div className="loading-section">
          <LoadingIndicator 
            message="Crawl du site web en cours" 
            detailMessage={statusMessage}
            progress={progress} 
          />
        </div>
      )}
    </div>
  );
}

export default UrlInput;