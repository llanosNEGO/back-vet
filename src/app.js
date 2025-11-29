const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pedidosRoutes = require('./routes/pedidos'); // Nueva ruta

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
app.use('/api/users', userRoutes);
app.use('/api/pedidos', pedidosRoutes); // Nueva ruta agregada

// Ruta de prueba
app.get('/', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: 'API de veterinaria funcionando correctamente',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      pedidos: '/api/pedidos', // Nuevo endpoint agregado
      health: '/api/health'
    },
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
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