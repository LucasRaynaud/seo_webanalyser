import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Navbar from './components/Navbar';
import UrlInput from './components/UrlInput';
import CrawlResults from './components/CrawlResults';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import './App.css';

function App() {
  const [crawlResults, setCrawlResults] = React.useState(null);

  const handleAnalysisResults = (results) => {
    setCrawlResults(results);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          
          <main className="app-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route element={<PrivateRoute />}>
                <Route path="/" element={
                  <>
                    <UrlInput onAnalyze={handleAnalysisResults} />
                    {crawlResults && <CrawlResults results={crawlResults} />}
                  </>
                } />
              </Route>
            </Routes>
          </main>
          
          <footer className="app-footer">
            <p>&copy; {new Date().getFullYear()} Analyseur SEO</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;