const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

// Middleware de logging
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

router.use(logRequest);

router.get('/health', userController.healthCheck);

router.get('/', userController.getAllUsers);

router.get('/stats', userController.getUserStats);

router.get('/search', userController.searchUsers);

router.get('/:id', userController.getUserById);

module.exports = router;