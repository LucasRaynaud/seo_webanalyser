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

    // Récupérer l'utilisateur avec toutes les informations, y compris l'abonnement
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Recharger les informations d'abonnement
    if (decoded.subscription !== user.subscription) {
      console.log(`Mise à jour des informations d'abonnement: ${decoded.subscription} -> ${user.subscription}`);
      // Générer un nouveau token avec les informations à jour
      const newToken = user.getSignedJwtToken();
      
      // Mettre à jour le token dans les cookies
      res.cookie('token', newToken, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true
      });
    }
    
    req.user = user;
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