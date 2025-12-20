const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer'); // ¡Importante agregar multer!
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const pedidosRoutes = require('./routes/pedidos');
const authRoutes = require('./routes/auth');

const app = express();

// ==================== MIDDLEWARE DE MULTER ====================
// Configurar almacenamiento para multer (comprobantes de pago)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/comprobantes/';
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'comprobante-' + uniqueSuffix + ext);
  }
});

// Filtrar solo imágenes y PDFs para comprobantes
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG) y PDFs para comprobantes'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// ==================== MIDDLEWARES GLOBALES ====================
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Middleware personalizado para parsear JSON - EXCLUYE rutas con FormData
app.use((req, res, next) => {
  // Si la ruta es /api/pedidos y el método es POST, NO parsear como JSON
  // porque viene como FormData (multipart/form-data)
  if (req.path === '/api/pedidos' && req.method === 'POST') {
    next();
  } else {
    // Para otras rutas, usar el parsing normal de JSON
    express.json()(req, res, next);
  }
});

// Middleware personalizado para parsear URL encoded - EXCLUYE rutas con FormData
app.use((req, res, next) => {
  if (req.path === '/api/pedidos' && req.method === 'POST') {
    next();
  } else {
    express.urlencoded({ extended: true })(req, res, next);
  }
});

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== MIDDLEWARE DE CONEXIÓN A BD ====================
app.use(async (req, res, next) => {
  try {
    await testConnection();
    next();
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
    next(error);
  }
});

// ==================== RUTAS ====================
// IMPORTANTE: Las rutas que usan FormData deben venir ANTES de los middlewares de JSON
app.use('/api/pedidos', pedidosRoutes(upload)); // Pasar multer a las rutas

// Rutas que usan JSON normal
app.use('/api/auth', authRoutes);

// ==================== RUTAS DE PRUEBA Y HEALTH ====================
app.get('/', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: 'API de veterinaria funcionando correctamente',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    endpoints: {
      pedidos: {
        POST: '/api/pedidos (FormData - multipart/form-data)',
        GET: '/api/pedidos/:id (JSON)'
      },
      auth_google: '/api/auth/google (JSON)',
      health: '/api/health (JSON)'
    },
    uploads: {
      comprobantes: '/uploads/comprobantes/',
      max_file_size: '5MB',
      allowed_types: 'JPEG, JPG, PNG, PDF'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== MANEJO DE ERRORES ====================
// Middleware para manejar errores de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo es demasiado grande. Límite: 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Error al subir archivo: ${error.message}`
    });
  }
  next(error);
});

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

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Servicio de base de datos no disponible'
    });
  }
  
  // Error de validación de JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'Formato JSON inválido'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Uploads: ${path.join(__dirname, 'uploads')}`);
  
  // Crear directorio de uploads si no existe
  const uploadDir = path.join(__dirname, 'uploads/comprobantes');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Directorio de uploads creado: ${uploadDir}`);
  }
  
  // Probar conexión al iniciar
  await testConnection();
});

module.exports = app;