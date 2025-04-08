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
  const [analysisType, setAnalysisType] = useState('basic'); // 'basic' ou 'full'
  const [progress, setProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [selectedPage] = useState(null);
  const [detailMode, setDetailMode] = useState('detailed');

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
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/analyze-site`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pages: pages,
          fullAnalysis: analysisType === 'full',
        }),
        credentials: 'include'
      });
  
      if (!response.ok) {
        // Gestion spécifique des erreurs d'authentification
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        throw new Error('Erreur lors de l\'analyse du site');
      }
  
      // Simuler la finalisation du traitement
      setProgress(95);
      setAnalysisStage('Finalisation de l\'analyse...');
  
      const data = await response.json();
  
      // Analyse terminée
      setProgress(100);
      clearInterval(progressInterval);
  
      setAnalysisResults(data);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour simuler la progression de l'analyse
  const startProgressSimulation = () => {
    // Nombre total de pages à analyser (limité à 50)
    const totalPages = Math.min(pages.length, 50);
    const isFullAnalysis = analysisType === 'full';

    // Estimation du temps total en fonction du type d'analyse
    // (analyse complète est ~5x plus lente)
    const estimatedTimePerPage = isFullAnalysis ? 1500 : 300; // en ms
    const updateInterval = 500; // mise à jour toutes les 500ms

    // Progression incrémentale pour simuler l'avancement
    let pagesProcessed = 0;
    let lastUpdateTime = Date.now();

    return setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - lastUpdateTime;
      lastUpdateTime = currentTime;

      // Calcul du nombre de pages traitées en fonction du temps écoulé
      const estimatedPagesProcessed = elapsedTime / estimatedTimePerPage;
      pagesProcessed = Math.min(totalPages, pagesProcessed + estimatedPagesProcessed);

      // Calcul de la progression en pourcentage
      const newProgress = Math.min(90, (pagesProcessed / totalPages) * 100);
      setProgress(newProgress);

      // Mise à jour du message d'étape en fonction de la progression
      if (newProgress < 10) {
        setAnalysisStage('Initialisation de l\'analyse...');
      } else if (newProgress < 30) {
        setAnalysisStage(`Analyse des méta-données (${Math.floor(pagesProcessed)}/${totalPages} pages)`);
      } else if (newProgress < 60) {
        setAnalysisStage(`Analyse de la structure HTML (${Math.floor(pagesProcessed)}/${totalPages} pages)`);
      } else if (newProgress < 80) {
        if (isFullAnalysis) {
          setAnalysisStage(`Mesure des performances (${Math.floor(pagesProcessed)}/${totalPages} pages)`);
        } else {
          setAnalysisStage(`Finalisation (${Math.floor(pagesProcessed)}/${totalPages} pages)`);
        }
      } else {
        setAnalysisStage('Compilation des résultats...');
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

          <div className="analysis-options">
            <label className="analysis-option">
              <input
                type="radio"
                value="basic"
                checked={analysisType === 'basic'}
                onChange={() => setAnalysisType('basic')}
              />
              <div className="option-info">
                <span className="option-title">Analyse basique</span>
                <span className="option-description">
                  Méta-titres, méta-descriptions, structure H1/H2 (rapide)
                </span>
              </div>
            </label>

            <label className="analysis-option">
              <input
                type="radio"
                value="full"
                checked={analysisType === 'full'}
                onChange={() => setAnalysisType('full')}
              />
              <div className="option-info">
                <span className="option-title">Analyse complète</span>
                <span className="option-description">
                  Inclut les métriques de performance (FCP, temps de chargement) et analyse plus approfondie (plus lent)
                </span>
              </div>
            </label>
          </div>

          <div className="analysis-warnings">
            <p className="warning-message">
              <strong>Note :</strong> L'analyse est limitée à 50 pages maximum pour éviter une surcharge du serveur.
            </p>
            {analysisType === 'full' && (
              <p className="warning-message">
                <strong>Attention :</strong> L'analyse complète utilise un navigateur headless et peut prendre plusieurs minutes.
              </p>
            )}
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
                message={`Analyse ${analysisType === 'full' ? 'complète' : 'basique'} en cours`}
                detailMessage={analysisStage}
                progress={progress}
              />
              <p className="loading-note">
                {analysisType === 'full'
                  ? 'L\'analyse complète peut prendre plusieurs minutes car elle utilise un navigateur headless pour mesurer les performances.'
                  : 'Veuillez patienter pendant l\'analyse des pages.'}
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
                    {analysisType === 'full' && (
                      <>
                        <th>Temps</th>
                        <th>FCP</th>
                        <th>Score</th>
                      </>
                    )}
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
                          {analysisType === 'full' && (
                            <>
                              <td className={(page.loadTime !== undefined && page.loadTime > 3) ? 'issue-cell' : ''}>
                                {page.loadTime ? `${page.loadTime.toFixed(2)}s` : '-'}
                              </td>
                              <td className={(page.fcp !== undefined && page.fcp > 2.5) ? 'issue-cell' : ''}>
                                {page.fcp ? `${page.fcp.toFixed(2)}s` : '-'}
                              </td>
                              <td>
                                {page.seoScore !== undefined ? renderSeoScore(Math.round(page.seoScore)) : '-'}
                              </td>
                            </>
                          )}
                            {detailMode === 'simple' ? (
                              <SeoScoreDetails page={page} />
                            ) : (
                              <DetailedSeoScore page={page} />
                            )}
                        </tr>
                        {isSelected && (
                          <tr className="details-row">
                            <td colSpan={analysisType === 'full' ? 8 : 5}>
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

  // Déterminer les en-têtes en fonction des données disponibles
  const hasPerformanceMetrics = results.some(r => r && r.fcp !== undefined);

  let headers = ['URL', 'Titre', 'Longueur du titre', 'Description', 'Longueur de la description',
    'Nombre de H1', 'Texte H1', 'Nombre de H2'];

  if (hasPerformanceMetrics) {
    headers = [...headers, 'Temps de chargement (s)', 'FCP (s)', 'Score SEO'];
  }

  // Fonction pour échapper les champs CSV
  const escapeCsv = (text) => {
    if (text === null || text === undefined) return '';
    // Si le texte contient des virgules, des guillemets ou des sauts de ligne, l'entourer de guillemets
    // Et échapper les guillemets par un autre guillemet
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
      escapeCsv(page.h2Count || 0)
    ];

    if (hasPerformanceMetrics) {
      row.push(
        escapeCsv(page.loadTime ? page.loadTime.toFixed(2) : ''),
        escapeCsv(page.fcp ? page.fcp.toFixed(2) : ''),
        escapeCsv(page.seoScore !== undefined ? Math.round(page.seoScore) : '')
      );
    }

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