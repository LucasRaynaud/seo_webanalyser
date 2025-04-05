// src/components/SeoScoreDetails.js
import React from 'react';
import './SeoScoreDetails.css';

function SeoScoreDetails({ page }) {
  if (!page) return null;
  
  // Initialisation du score max
  const currentScore = Math.round(page.seoScore) || 0;
  
  // Définition des règles de notation et des pénalités
  const scoreBreakdown = [
    {
      category: "Structure",
      items: [
        { 
          name: "Méta-Titre",
          condition: page.missingTitle,
          penalty: -15,
          message: "Le méta-titre est manquant",
          recommendation: "Ajoutez un méta-titre descriptif incluant le mot-clé principal"
        },
        { 
          name: "Méta-Titre",
          condition: page.hasTooLongTitle,
          penalty: -5,
          message: "Le méta-titre est trop long (>60 caractères)",
          recommendation: "Raccourcissez le titre à moins de 60 caractères"
        },
        { 
          name: "Méta-Description",
          condition: page.missingDescription,
          penalty: -10,
          message: "La méta-description est manquante",
          recommendation: "Ajoutez une méta-description attrayante avec appel à l'action"
        },
        { 
          name: "Méta-Description",
          condition: page.hasTooLongDescription,
          penalty: -5,
          message: "La méta-description est trop longue (>160 caractères)",
          recommendation: "Limitez la description à 160 caractères maximum"
        },
        { 
          name: "Balise H1",
          condition: page.missingH1,
          penalty: -10,
          message: "La balise H1 est manquante",
          recommendation: "Ajoutez une balise H1 décrivant le contenu principal de la page"
        },
        { 
          name: "Balise H1",
          condition: page.hasMultipleH1,
          penalty: -5,
          message: `Plusieurs balises H1 détectées (${page.h1Count})`,
          recommendation: "Gardez une seule balise H1 par page"
        },
        { 
          name: "Balises H2",
          condition: page.h2Count === 0,
          penalty: -5,
          message: "Aucune balise H2 n'est présente",
          recommendation: "Utilisez des H2 pour structurer votre contenu en sections"
        }
      ]
    },
    {
      category: "Performance",
      items: [
        { 
          name: "Temps de chargement",
          condition: page.loadTime > 5,
          penalty: -15,
          message: `Le temps de chargement est très lent (${page.loadTime?.toFixed(2)}s)`,
          recommendation: "Optimisez les images et minimisez les ressources bloquantes"
        },
        { 
          name: "Temps de chargement",
          condition: page.loadTime > 3 && page.loadTime <= 5,
          penalty: -10,
          message: `Le temps de chargement est lent (${page.loadTime?.toFixed(2)}s)`,
          recommendation: "Améliorez la vitesse en activant la mise en cache et la compression"
        },
        { 
          name: "First Contentful Paint",
          condition: page.fcp > 3,
          penalty: -10,
          message: `Le FCP est trop lent (${page.fcp?.toFixed(2)}s)`,
          recommendation: "Réduisez le délai avant affichage du premier contenu"
        },
        { 
          name: "First Contentful Paint",
          condition: page.fcp > 1.5 && page.fcp <= 3,
          penalty: -5,
          message: `Le FCP est lent (${page.fcp?.toFixed(2)}s)`,
          recommendation: "Améliorez le FCP en optimisant le CSS critique"
        }
      ]
    },
    {
      category: "Contenu",
      items: [
        { 
          name: "Images sans attribut alt",
          condition: page.imagesWithoutAlt > 0,
          penalty: -Math.min(10, page.imagesWithoutAlt * 2),
          message: `${page.imagesWithoutAlt} image(s) sans attribut alt`,
          recommendation: "Ajoutez des attributs alt descriptifs à toutes les images"
        },
        { 
          name: "Données structurées",
          condition: page.hasStructuredData === false,
          penalty: -5,
          message: "Aucune donnée structurée détectée",
          recommendation: "Ajoutez du balisage schema.org pour améliorer l'affichage SERP"
        }
      ]
    }
  ];
  
  // Calcul des pénalités appliquées
  const appliedPenalties = [];
  
  scoreBreakdown.forEach(category => {
    category.items.forEach(item => {
      if (item.condition) {
        appliedPenalties.push({
          ...item,
          category: category.category
        });
      }
    });
  });
  
  // Tri des pénalités par importance (les plus graves d'abord)
  appliedPenalties.sort((a, b) => a.penalty - b.penalty);
  
  // Calcul du score théorique sans pénalités
  const lostPoints = appliedPenalties.reduce((total, penalty) => total + Math.abs(penalty.penalty), 0);
  
  return (
    <div className="seo-score-details">
      <div className="score-overview">
        <div className="score-circle">
          <div className={`score-value ${currentScore >= 70 ? 'good' : currentScore >= 50 ? 'average' : 'poor'}`}>
            {currentScore}
          </div>
        </div>
        <div className="score-summary">
          <h4>Score SEO</h4>
          <p>
            {currentScore >= 90 ? 'Excellent' : 
             currentScore >= 70 ? 'Bon' : 
             currentScore >= 50 ? 'Moyen' : 
             'À améliorer'}
          </p>
          {lostPoints > 0 && (
            <p className="lost-points">
              {lostPoints} points perdus
            </p>
          )}
        </div>
      </div>
      
      {appliedPenalties.length > 0 ? (
        <div className="penalties-list">
          <h4>Points à améliorer</h4>
          {appliedPenalties.map((penalty, index) => (
            <div key={index} className="penalty-item">
              <div className="penalty-header">
                <span className="penalty-category">{penalty.category}</span>
                <span className="penalty-name">{penalty.name}</span>
                <span className="penalty-value">{penalty.penalty}</span>
              </div>
              <div className="penalty-details">
                <p className="penalty-message">{penalty.message}</p>
                <p className="penalty-recommendation">💡 {penalty.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-penalties">
          <p>Aucun problème SEO majeur détecté !</p>
        </div>
      )}
    </div>
  );
}

export default SeoScoreDetails;