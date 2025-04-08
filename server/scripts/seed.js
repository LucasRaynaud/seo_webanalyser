// Script pour créer des utilisateurs initiaux
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

// Charger les variables d'environnement
dotenv.config();

// Se connecter à la base de données
connectDB();

// Données des utilisateurs à créer
const users = [
  {
    name: 'Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Utilisateur Test',
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  }
];

// Fonction pour créer les utilisateurs
const createUsers = async () => {
  try {
    // Supprimer tous les utilisateurs existants
    await User.deleteMany();
    
    console.log('Utilisateurs supprimés');
    
    // Créer les nouveaux utilisateurs
    const createdUsers = await User.create(users);
    
    console.log(`${createdUsers.length} utilisateurs créés:`);
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}), rôle: ${user.role}`);
    });
    
    console.log('\nUtilisateurs créés avec succès !');
    console.log('\nVous pouvez maintenant vous connecter avec:');
    console.log('- Admin: admin@example.com / password123');
    console.log('- Utilisateur: user@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création des utilisateurs:', error);
    process.exit(1);
  }
};

// Exécuter la fonction
createUsers();