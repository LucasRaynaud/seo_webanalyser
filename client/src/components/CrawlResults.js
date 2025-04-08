// src/components/CrawlResults.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ContentAnalysis from './ContentAnalysis';
import './CrawlResults.css';

function CrawlResults({ results }) {
  const [showContentAnalysis, setShowContentAnalysis] = useState(false);
  const { token } = useContext(AuthContext);
  
  if (!results || !results.pages || results.pages.length === 0) {
    return null;
  }
  
  const handleAnalyzeContent = () => {
    setShowContentAnalysis(true);
  };
  
  const handleCloseAnalysis = () => {
    setShowContentAnalysis(false);
  };

  return (
    <div className="crawl-results-container">
      {showContentAnalysis ? (
        <ContentAnalysis 
          pages={results.pages} 
          onCloseAnalysis={handleCloseAnalysis}
          token={token}
        />
      ) : (
        <>
          <h2>Pages trouvées ({results.pages.length})</h2>
      
      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-value">{results.pages.length}</span>
          <span className="stat-label">Pages</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{results.totalTime ? `${results.totalTime.toFixed(2)}s` : 'N/A'}</span>
          <span className="stat-label">Temps total</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {results.pages.filter(page => page.status === 200).length}
          </span>
          <span className="stat-label">Pages OK</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {results.pages.filter(page => page.status !== 200).length}
          </span>
          <span className="stat-label">Erreurs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {results.pages.reduce((sum, page) => sum + (page.internalLinksCount || 0), 0)}
          </span>
          <span className="stat-label">Liens internes</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {results.excludedCount || 0}
          </span>
          <span className="stat-label">URLs exclues</span>
        </div>
      </div>

      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Liens internes</th>
              <th>Liens externes</th>
              <th>Meta Description</th>
            </tr>
          </thead>
          <tbody>
            {results.pages.map((page, index) => (
              <tr key={index}>
                <td>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" title={page.url}>
                    {page.url.length > 60 ? page.url.substring(0, 57) + '...' : page.url}
                  </a>
                </td>
                <td title={page.title}>
                  {page.title ? (page.title.length > 50 ? page.title.substring(0, 47) + '...' : page.title) : '-'}
                </td>
                <td className={`status-${page.status === 200 ? 'ok' : 'error'}`}>
                  {page.status}
                </td>
                <td>{page.internalLinksCount || 0}</td>
                <td>{page.externalLinksCount || 0}</td>
                <td title={page.metaDescription}>
                  {page.metaDescription 
                    ? (page.metaDescription.length > 50 
                        ? page.metaDescription.substring(0, 47) + '...' 
                        : page.metaDescription) 
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {results.excludedUrls && results.excludedUrls.length > 0 && (
        <div className="excluded-urls-section">
          <h3>URLs exclues ({results.excludedCount})</h3>
          <p className="info-text">URLs exclues car elles contiennent des paramètres ou pointent vers des fichiers non HTML (images, PDF, etc.)</p>
          <div className="excluded-urls-list">
            {results.excludedUrls.slice(0, 10).map((url, index) => (
              <div key={index} className="excluded-url-item">
                <span className="excluded-url">{url}</span>
                <span className="excluded-reason">
                  {url.includes('?') ? 'Contient des paramètres' : 
                   url.match(/\.(jpg|jpeg|png|gif|svg|pdf|doc|docx|xls|xlsx|zip|rar)$/i) 
                     ? 'Fichier non HTML' : 'Autre raison'}
                </span>
              </div>
            ))}
            {results.excludedUrls.length > 10 && (
              <p className="more-excluded">+ {results.excludedUrls.length - 10} autres URLs exclues</p>
            )}
          </div>
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className="action-button"
          onClick={handleAnalyzeContent}
        >
          Analyser le contenu des pages
        </button>
        <button className="action-button secondary">
          Exporter en CSV
        </button>
      </div>
        </>
      )}
    </div>
  );
}

export default CrawlResults;