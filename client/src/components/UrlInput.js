// src/components/UrlInput.js
import React, { useState } from 'react';
import LoadingIndicator from './LoadingIndicator';
import './UrlInput.css';

function UrlInput({ onAnalyze }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

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
    
    // Commencer la simulation de progression
    const progressInterval = startProgressSimulation();
    
    try {
      // Ici nous ferons l'appel à notre API de crawling
      setStatusMessage('Crawl des pages en cours...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
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

  return (
    <div className="url-input-container">
      <h2>Analyseur SEO</h2>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Entrez l'URL du site (ex: https://example.com)"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Analyse en cours...' : 'Analyser'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
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