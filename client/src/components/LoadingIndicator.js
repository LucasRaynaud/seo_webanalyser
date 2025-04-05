// src/components/LoadingIndicator.js
import React from 'react';
import ProgressBar from './ProgressBar';
import './LoadingIndicator.css';

function LoadingIndicator({ 
  message = 'Traitement en cours...', 
  detailMessage = '',
  progress = null, 
  isOverlay = false 
}) {
  return (
    <div className={`loading-indicator ${isOverlay ? 'loading-overlay' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-message">{message}</div>
        
        {detailMessage && (
          <div className="loading-detail">{detailMessage}</div>
        )}
        
        {progress !== null ? (
          <div className="loading-progress">
            <ProgressBar progress={progress} showPercentage={true} />
          </div>
        ) : (
          <div className="loading-progress loading-indeterminate">
            <div className="indeterminate-bar">
              <div className="indeterminate-bar-progress"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingIndicator;