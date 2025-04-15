const { Sequelize } = require('sequelize');
const config = require('./config')[process.env.NODE_ENV || 'development'];

const { username, password, database, host, dialect } = config;

const sequelize = new Sequelize(database, username, password, {
  host,
  dialect,
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
  dialectOptions: config.dialectOptions,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`MySQL connecté: ${host}, base de données: ${database}`);
  } catch (error) {
    console.error(`Erreur de connexion à MySQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };