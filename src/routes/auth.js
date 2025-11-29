const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Middleware de logging
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

router.use(logRequest);

// Ruta de login
router.post('/login', authController.login);

// Ruta para verificar token (opcional para futuro)
router.get('/verify', authController.verifyToken);

// Ruta de health check para auth
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de autenticación funcionando',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;