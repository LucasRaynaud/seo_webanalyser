// src/App.js
import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import CrawlResults from './components/CrawlResults';
import './App.css';

function App() {
  const [crawlResults, setCrawlResults] = useState(null);

  const handleAnalysisResults = (results) => {
    setCrawlResults(results);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Analyseur SEO</h1>
      </header>
      
      <main className="app-content">
        <UrlInput onAnalyze={handleAnalysisResults} />
        {crawlResults && <CrawlResults results={crawlResults} />}
      </main>
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Analyseur SEO</p>
      </footer>
    </div>
  );
}

export default App;