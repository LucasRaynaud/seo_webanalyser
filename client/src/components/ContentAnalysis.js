// src/components/ContentAnalysis.js
import React, { useState } from 'react';
import LoadingIndicator from './LoadingIndicator';
import ProgressBar from './ProgressBar';
import SeoScoreDetails from './SeoScoreDetails';
import DetailedSeoScore from './DetailedSeoScore';
import './ContentAnalysis.css';

function ContentAnalysis({ pages, onCloseAnalysis, token }) {
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [selectedPage] = useState(null);
  const [detailMode, setDetailMode] = useState('detailed');

  // Fonction pour calculer les statistiques localement si nécessaire
  const calculateStats = (results) => {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return { error: 'Aucune page analysée avec succès' };
    }
    
    // Fonctions utilitaires pour les statistiques
    const average = (values) => {
      if (values.length === 0) return 0;
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    };
    
    const percentage = (results, predicate) => {
      if (results.length === 0) return 0;
      return (results.filter(predicate).length / results.length) * 100;
    };
    
    // Calcul des moyennes et des pourcentages
    return {
      averageLoadTime: average(validResults.map(r => r.loadTime || 0)),
      averageFCP: average(validResults.filter(r => r.fcp).map(r => r.fcp)),
      averageTitleLength: average(validResults.map(r => r.metaTitleLength || 0)),
      averageDescriptionLength: average(validResults.map(r => r.metaDescriptionLength || 0)),
      
      pagesWithTitle: percentage(validResults, r => !r.missingTitle),
      pagesWithDescription: percentage(validResults, r => !r.missingDescription),
      pagesWithH1: percentage(validResults, r => !r.missingH1),
      pagesWithMultipleH1: percentage(validResults, r => r.hasMultipleH1),
      pagesWithH2: percentage(validResults, r => r.h2Count > 0),
      
      // Statistiques de performance
      averagePageSize: average(validResults.filter(r => r.pageSize).map(r => r.pageSize)),
      averageSEOScore: average(validResults.filter(r => r.seoScore).map(r => r.seoScore)),
      
      // Pages avec problèmes
      pagesWithErrors: results.filter(r => r.error).length,
      pagesWithPerformanceIssues: validResults.filter(r => r.loadTime > 3).length,
      
      // Totaux
      totalPages: results.length,
      successfullyAnalyzed: validResults.length,
    };
  };

  const startAnalysis = async () => {
    if (!pages || pages.length === 0) {
      setError('Aucune page à analyser');
      return;
    }
  
    setLoading(true);
    setError('');
    setProgress(0);
    setAnalysisStage('Préparation des pages à analyser...');
  
    // Simulation de progression pour indiquer que le serveur travaille
    const progressInterval = startProgressSimulation();
  
    try {
      // Diviser les pages en lots de 10 pour éviter des payloads trop grands
      const batchSize = 10;
      const allResults = [];
      let totalTimeSum = 0;
      
      // Traiter les pages par lots
      for (let i = 0; i < pages.length; i += batchSize) {
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(pages.length/batchSize);
        
        setAnalysisStage(`Traitement du lot ${batchNumber}/${totalBatches} (pages ${i+1}-${Math.min(i+batchSize, pages.length)})...`);
        const batch = pages.slice(i, Math.min(i + batchSize, pages.length));
        
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/analyze-site`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pages: batch
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Session expirée. Veuillez vous reconnecter.');
          }
          throw new Error(`Erreur lors de l'analyse du lot ${batchNumber}/${totalBatches}`);
        }

        const batchData = await response.json();
        
        // Accumuler les résultats
        if (batchData.results && Array.isArray(batchData.results)) {
          allResults.push(...batchData.results);
        }
        
        totalTimeSum += batchData.totalTime || 0;
        
        // Mettre à jour la progression en fonction du nombre de lots traités
        const batchProgress = Math.min(90, ((i + batch.length) / pages.length) * 100);
        setProgress(batchProgress);
      }

      // Calculer les statistiques pour tous les résultats combinés
      setProgress(95);
      setAnalysisStage('Calcul des statistiques globales...');
      
      const stats = calculateStats(allResults);
      
      const combinedResult = {
        results: allResults,
        totalPages: allResults.length,
        totalTime: totalTimeSum,
        stats: stats
      };

      // Analyse terminée
      setProgress(100);
      clearInterval(progressInterval);

      setAnalysisResults(combinedResult);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour simuler la progression de l'analyse
  const startProgressSimulation = () => {
    // Cette fonction reste la même
    const totalPages = Math.min(pages.length, 50);
    const estimatedTimePerPage = 1500;
    const updateInterval = 500;
    let pagesProcessed = 0;
    let lastUpdateTime = Date.now();

    return setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - lastUpdateTime;
      lastUpdateTime = currentTime;
      const estimatedPagesProcessed = elapsedTime / estimatedTimePerPage;
      pagesProcessed = Math.min(totalPages, pagesProcessed + estimatedPagesProcessed);
      const newProgress = Math.min(90, (pagesProcessed / totalPages) * 100);
      
      // Ne pas écraser la progression si elle est déjà mise à jour par le traitement par lots
      if (progress < newProgress) {
        setProgress(newProgress);
      }
    }, updateInterval);
  };

  // Fonction pour rendre le score SEO avec une couleur appropriée
  const renderSeoScore = (score) => {
    let colorClass = 'score-good';

    if (score < 50) {
      colorClass = 'score-bad';
    } else if (score < 70) {
      colorClass = 'score-medium';
    }

    return <span className={`seo-score ${colorClass}`}>{score}</span>;
  };

  return (
    <div className="content-analysis-container">
      <div className="analysis-header">
        <h2>Analyse de contenu</h2>
        <button className="close-button" onClick={onCloseAnalysis}>
          &times;
        </button>
      </div>

      {!analysisResults && (
        <div className="analysis-setup">
          <p>Prêt à analyser {pages.length} pages</p>

          <div className="analysis-warnings">
            <p className="warning-message">
              <strong>Note :</strong> Les pages seront analysées par lots de 10 pour éviter les problèmes de taille de requête.
            </p>
            <p className="warning-message">
              <strong>Attention :</strong> L'analyse utilise un navigateur headless et peut prendre plusieurs minutes.
            </p>
          </div>

          <button
            className="start-analysis-button"
            onClick={startAnalysis}
            disabled={loading}
          >
            {loading ? 'Analyse en cours...' : 'Démarrer l\'analyse'}
          </button>

          {error && <p className="error-message">{error}</p>}

          {loading && (
            <div className="loading-container">
              <LoadingIndicator
                message="Analyse complète en cours"
                detailMessage={analysisStage}
                progress={progress}
              />
              <p className="loading-note">
                L'analyse peut prendre plusieurs minutes car elle utilise un navigateur headless pour mesurer les performances.
              </p>
            </div>
          )}
        </div>
      )}

      {analysisResults && (
        <div className="analysis-results">
          <div className="results-overview">
            <h3>Résultats de l'analyse</h3>

            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-title">Pages analysées</div>
                <div className="stat-value">{analysisResults.totalPages}</div>
              </div>

              <div className="stat-card">
                <div className="stat-title">Temps d'analyse</div>
                <div className="stat-value">{analysisResults.totalTime.toFixed(2)}s</div>
              </div>

              {analysisResults.stats.averageSEOScore !== undefined && (
                <div className="stat-card">
                  <div className="stat-title">Score SEO moyen</div>
                  <div className="stat-value">
                    {renderSeoScore(Math.round(analysisResults.stats.averageSEOScore))}
                  </div>
                </div>
              )}
            </div>

            <div className="seo-metrics">
              <h4>Métriques SEO</h4>

              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-label">Pages avec méta-titre</div>
                  <div className="metric-value-container">
                    <ProgressBar
                      progress={analysisResults.stats.pagesWithTitle}
                      showPercentage={false}
                      height="6px"
                    />
                    <div className="metric-value">{analysisResults.stats.pagesWithTitle.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Pages avec méta-description</div>
                  <div className="metric-value-container">
                    <ProgressBar
                      progress={analysisResults.stats.pagesWithDescription}
                      showPercentage={false}
                      height="6px"
                    />
                    <div className="metric-value">{analysisResults.stats.pagesWithDescription.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Pages avec H1</div>
                  <div className="metric-value-container">
                    <ProgressBar
                      progress={analysisResults.stats.pagesWithH1}
                      showPercentage={false}
                      height="6px"
                    />
                    <div className="metric-value">{analysisResults.stats.pagesWithH1.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Pages avec plusieurs H1</div>
                  <div className="metric-value-container">
                    <ProgressBar
                      progress={analysisResults.stats.pagesWithMultipleH1}
                      showPercentage={false}
                      height="6px"
                    />
                    <div className="metric-value">{analysisResults.stats.pagesWithMultipleH1.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Pages avec H2</div>
                  <div className="metric-value-container">
                    <ProgressBar
                      progress={analysisResults.stats.pagesWithH2}
                      showPercentage={false}
                      height="6px"
                    />
                    <div className="metric-value">{analysisResults.stats.pagesWithH2.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Longueur moyenne des titres</div>
                  <div className="metric-value">{Math.round(analysisResults.stats.averageTitleLength)} car.</div>
                </div>

                <div className="metric-item">
                  <div className="metric-label">Longueur moyenne des descriptions</div>
                  <div className="metric-value">{Math.round(analysisResults.stats.averageDescriptionLength)} car.</div>
                </div>

                {analysisResults.stats.averageLoadTime !== undefined && (
                  <div className="metric-item">
                    <div className="metric-label">Temps de chargement moyen</div>
                    <div className="metric-value">{analysisResults.stats.averageLoadTime.toFixed(2)}s</div>
                  </div>
                )}

                {analysisResults.stats.averageFCP !== undefined && (
                  <div className="metric-item">
                    <div className="metric-label">FCP moyen</div>
                    <div className="metric-value">{analysisResults.stats.averageFCP.toFixed(2)}s</div>
                  </div>
                )}
              </div>
            </div>

            <div className="pages-table-container">
              <h4>Détails par page</h4>

              <table className="pages-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Titre</th>
                    <th>H1</th>
                    <th>H2</th>
                    <th>Temps</th>
                    <th>FCP</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResults && analysisResults.results && analysisResults.results.map((page, index) => {
                    if (!page) return null;

                    const isSelected = selectedPage && selectedPage.url === page.url;

                    return (
                      <React.Fragment key={index}>
                        <tr className={`${page.error ? 'error-row' : ''} ${isSelected ? 'selected-row' : ''}`}>
                          <td>
                            {page.url ? (
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={page.url}
                              >
                                {page.url.length > 40 ? page.url.substring(0, 37) + '...' : page.url}
                              </a>
                            ) : (
                              <span className="missing-data">URL non disponible</span>
                            )}
                          </td>
                          <td className={page.missingTitle ? 'issue-cell' : ''}>
                            {page.metaTitle ? (
                              <span title={page.metaTitle}>
                                {page.metaTitle.length > 30 ? page.metaTitle.substring(0, 27) + '...' : page.metaTitle}
                              </span>
                            ) : (
                              <span className="missing-data">Manquant</span>
                            )}
                          </td>
                          <td className={(page.missingH1 || page.hasMultipleH1) ? 'issue-cell' : ''}>
                            {page.missingH1 ? (
                              <span className="missing-data">Manquant</span>
                            ) : page.hasMultipleH1 ? (
                              <span className="issue-data">{page.h1Count || 0} H1</span>
                            ) : (
                              <span title={page.h1Text || ''}>
                                {page.h1Text ? (page.h1Text.length > 30 ? page.h1Text.substring(0, 27) + '...' : page.h1Text) : '-'}
                              </span>
                            )}
                          </td>
                          <td>{(page.h2Count !== undefined) ? page.h2Count : 0}</td>
                          <td className={(page.loadTime !== undefined && page.loadTime > 3) ? 'issue-cell' : ''}>
                            {page.loadTime ? `${page.loadTime.toFixed(2)}s` : '-'}
                          </td>
                          <td className={(page.fcp !== undefined && page.fcp > 2.5) ? 'issue-cell' : ''}>
                            {page.fcp ? `${page.fcp.toFixed(2)}s` : '-'}
                          </td>
                          <td>
                            {page.seoScore !== undefined ? renderSeoScore(Math.round(page.seoScore)) : '-'}
                          </td>
                          <td>
                            {detailMode === 'simple' ? (
                              <SeoScoreDetails page={page} />
                            ) : (
                              <DetailedSeoScore page={page} />
                            )}
                          </td>
                        </tr>
                        {isSelected && (
                          <tr className="details-row">
                            <td colSpan={8}>
                              <DetailedSeoScore page={page} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="action-buttons">
              <button className="action-button" onClick={() => exportToCSV(analysisResults)}>
                Exporter en CSV
              </button>
              <button className="action-button secondary" onClick={onCloseAnalysis}>
                Retour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fonction pour exporter les résultats en CSV - version sécurisée
function exportToCSV(analysisResults) {
  if (!analysisResults || !analysisResults.results || !Array.isArray(analysisResults.results) || analysisResults.results.length === 0) {
    console.error("Données d'analyse non valides ou vides pour l'exportation CSV");
    return;
  }

  const results = analysisResults.results;

  // Définir les en-têtes pour l'analyse complète
  let headers = ['URL', 'Titre', 'Longueur du titre', 'Description', 'Longueur de la description',
    'Nombre de H1', 'Texte H1', 'Nombre de H2', 'Temps de chargement (s)', 'FCP (s)', 'Score SEO'];

  // Fonction pour échapper les champs CSV
  const escapeCsv = (text) => {
    if (text === null || text === undefined) return '';
    const stringText = String(text);
    if (stringText.includes(',') || stringText.includes('"') || stringText.includes('\n')) {
      return `"${stringText.replace(/"/g, '""')}"`;
    }
    return stringText;
  };

  // Créer les lignes de données
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const page of results) {
    if (!page) continue; // Ignorer les entrées invalides

    const row = [
      escapeCsv(page.url || ''),
      escapeCsv(page.metaTitle || ''),
      escapeCsv(page.metaTitleLength || 0),
      escapeCsv(page.metaDescription || ''),
      escapeCsv(page.metaDescriptionLength || 0),
      escapeCsv(page.h1Count || 0),
      escapeCsv(page.h1Text || ''),
      escapeCsv(page.h2Count || 0),
      escapeCsv(page.loadTime ? page.loadTime.toFixed(2) : ''),
      escapeCsv(page.fcp ? page.fcp.toFixed(2) : ''),
      escapeCsv(page.seoScore !== undefined ? Math.round(page.seoScore) : '')
    ];

    csvRows.push(row.join(','));
  }

  // Créer le fichier CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Télécharger le fichier
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `seo-analysis-${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libérer l'URL
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

export default ContentAnalysis;