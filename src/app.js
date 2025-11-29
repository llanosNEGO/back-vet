const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar database y rutas
const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Probar conexión a la base de datos al iniciar
app.use(async (req, res, next) => {
  try {
    await testConnection();
    next();
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
    next(error);
  }
});

// Rutas
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: 'API de autenticación funcionando correctamente',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// Ruta para verificar estado
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: 'OK',
      database: dbStatus ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// CORRECCIÓN: Manejo de rutas no encontradas
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error(error);
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Servicio de base de datos no disponible'
    });
  }
  
  res.status(500).json({
    error: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Probar conexión al iniciar
  await testConnection();
});

module.exports = app;