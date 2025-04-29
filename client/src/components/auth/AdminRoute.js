// src/components/auth/AdminRoute.js
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingIndicator from '../LoadingIndicator';

const AdminRoute = () => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  // Afficher l'indicateur de chargement pendant la vérification de l'authentification
  if (loading) {
    return <LoadingIndicator message="Vérification des droits d'accès..." isOverlay={true} />;
  }

  // Vérifier si l'utilisateur est authentifié et a le rôle d'administrateur
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Vérifier si l'utilisateur a le rôle d'administrateur
  if (user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  // Si l'utilisateur est administrateur, lui permettre d'accéder à la route
  return <Outlet />;
};

export default AdminRoute;