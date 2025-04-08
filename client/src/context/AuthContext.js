import React, { createContext, useState, useEffect, useCallback } from 'react';

// Récupération de la clé de stockage depuis les variables d'environnement
const AUTH_STORAGE_KEY = process.env.REACT_APP_AUTH_STORAGE_KEY || 'seo_analyzer_auth_token';
const API_URL = process.env.REACT_APP_API_URL || '';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(AUTH_STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction pour vérifier si l'utilisateur est authentifié
  const checkUserLoggedIn = useCallback(async () => {
    if (token) {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
        } else {
          // Si le token est invalide, on déconnecte l'utilisateur
          await logout();
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
        await logout();
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  // Vérifier l'authentification au chargement et quand le token change
  useEffect(() => {
    checkUserLoggedIn();
  }, [checkUserLoggedIn]);

  // Fonction pour s'inscrire
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      // Stocker le token dans le localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour se connecter
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la connexion");
      }

      // Stocker le token dans le localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour se déconnecter
  const logout = async () => {
    try {
      setLoading(true);
      
      // Appel au serveur pour invalider le token côté serveur
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      }).catch(err => console.warn('Erreur lors de la déconnexion côté serveur:', err));

      // Nettoyage côté client
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      loading,
      error,
      register,
      login,
      logout,
      isAuthenticated: !!user,
      checkUserLoggedIn
    }}>
      {children}
    </AuthContext.Provider>
  );
};