const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes/deviceRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'fleet-health-monitor' }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;