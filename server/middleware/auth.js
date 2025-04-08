const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour protéger les routes
exports.protect = async (req, res, next) => {
  let token;

  // Vérifier si le token est dans les headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extraire le token du header Bearer
    token = req.headers.authorization.split(' ')[1];
  } 
  // Vérifier si le token est dans les cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // S'assurer que le token existe
  if (!token) {
    return res.status(401).json({ error: 'Non autorisé à accéder à cette ressource' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter l'utilisateur à la requête
    req.user = await User.findById(decoded.id);
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({ error: 'Non autorisé à accéder à cette ressource' });
  }
};

// Middleware pour autoriser certains rôles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autorisé à accéder à cette ressource' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Non autorisé à accéder à cette ressource (rôle insuffisant)' });
    }
    
    next();
  };
};