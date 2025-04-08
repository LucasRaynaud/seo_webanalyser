import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Afficher l'indicateur de chargement pendant la vérification de l'authentification
  if (loading) {
    return <LoadingIndicator message="Vérification de l'authentification..." isOverlay={true} />;
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;