const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const pedidosRoutes = require('./routes/pedidos');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use(express.json());  

app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(async (req, res, next) => {
  try {
    await testConnection();
    next();
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
    next(error);
  }
});

app.use('/api/pedidos', pedidosRoutes());

// Rutas que usan JSON normal
app.use('/api/auth', authRoutes);

// // ==================== RUTAS DE PRUEBA Y HEALTH ====================
// app.get('/', async (req, res) => {
//   const dbStatus = await testConnection();
//   res.json({ 
//     message: 'API de veterinaria funcionando correctamente',
//     database: dbStatus ? 'Conectado' : 'Desconectado',
//     endpoints: {
//       pedidos: {
//         POST: '/api/pedidos (JSON puro)',
//         GET: '/api/pedidos/:id (JSON)'
//       },
//       auth_google: '/api/auth/google (JSON)',
//       health: '/api/health (JSON)'
//     },
//     timestamp: new Date().toISOString()
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV || 'development'
//   });
// });

// ==================== MANEJO DE ERRORES ====================
// 404 - Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error('Error global:', error);
  
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'Formato JSON inválido',
      details: 'El frontend debe enviar JSON válido'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API lista para recibir JSON puro del frontend`);

  await testConnection();
});

module.exports = app;