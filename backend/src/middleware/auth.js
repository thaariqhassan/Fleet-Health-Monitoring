const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function login(req, res) {
  const { username, password } = req.body;

  // Demo credentials only - replace with real user lookup in production.
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { login, requireAuth };