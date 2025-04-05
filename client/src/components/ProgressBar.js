// src/components/ProgressBar.js
import React from 'react';
import './ProgressBar.css';

function ProgressBar({ progress, label, showPercentage = true, height = '8px' }) {
  return (
    <div className="progress-bar-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-track" style={{ height }}>
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress}%`,
            height
          }}
        />
      </div>
      {showPercentage && (
        <div className="progress-percentage">{Math.round(progress)}%</div>
      )}
    </div>
  );
}

export default ProgressBar;