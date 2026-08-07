const app = require('./app');
const sequelize = require('./config/database');
require('./models/Device');
require('./models/CommandLog');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established (dialect: ${sequelize.getDialect()})`);

    await sequelize.sync(); // creates tables if they don't exist
    console.log('Database synced.');

    app.listen(PORT, () => {
      console.log(`Fleet Health Monitor API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
}

start();