// routes/pedidos.js
const express = require('express');
const router = express.Router();
const Pedidos = require('../models/pedidos');

// Esta función recibe el middleware upload desde app.js
module.exports = (upload) => {
  
  // POST /api/pedidos - Crear nuevo pedido
  router.post('/', upload.single('comprobante'), async (req, res) => {
    try {
      console.log('=== INICIANDO PROCESO DE PEDIDO ===');
      console.log('Content-Type:', req.headers['content-type']);
      
      // Debug: Verificar lo que llega
      console.log('req.body keys:', Object.keys(req.body));
      console.log('req.body.pedidoData existe?', !!req.body.pedidoData);
      console.log('req.file:', req.file);
      
      if (!req.body.pedidoData) {
        console.error('ERROR: No se recibió pedidoData en el cuerpo');
        return res.status(400).json({
          success: false,
          error: 'Falta el JSON del pedido (pedidoData)'
        });
      }

      // Parsear el JSON del pedido
      let pedidoData;
      try {
        pedidoData = JSON.parse(req.body.pedidoData);
        console.log('✅ pedidoData parseado exitosamente');
        console.log('📋 id_cliente:', pedidoData.id_cliente);
        console.log('📋 Tipo de id_cliente:', typeof pedidoData.id_cliente);
      } catch (parseError) {
        console.error('❌ ERROR parseando pedidoData:', parseError);
        console.error('📋 pedidoData recibido (primeros 500 chars):', 
          req.body.pedidoData.substring(0, 500));
        return res.status(400).json({
          success: false,
          error: 'Formato de JSON inválido en pedidoData'
        });
      }

      // Validar campos requeridos
      if (!pedidoData.id_cliente && pedidoData.id_cliente !== 0) {
        console.error('❌ ERROR: id_cliente es null o undefined');
        console.error('📋 pedidoData completo:', JSON.stringify(pedidoData, null, 2));
        return res.status(400).json({
          success: false,
          error: 'Falta el ID del cliente'
        });
      }

      // Convertir id_cliente a número
      const idCliente = Number(pedidoData.id_cliente);
      if (isNaN(idCliente)) {
        return res.status(400).json({
          success: false,
          error: 'ID del cliente inválido. Debe ser un número.'
        });
      }

      // Si hay archivo de comprobante, agregarlo a los datos del pedido
      if (req.file) {
        console.log('✅ Comprobante recibido:', req.file.filename);
        pedidoData.comprobante_pago = `/uploads/comprobantes/${req.file.filename}`;
        pedidoData.nombre_comprobante = req.file.originalname;
      } else {
        console.log('ℹ️ No se recibió comprobante de pago');
      }

      console.log('📦 Creando pedido en la base de datos...');
      
      // Crear el pedido en la base de datos
      const result = await Pedidos.create(pedidoData);
      
      console.log('✅ Pedido creado exitosamente:', result);

      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('❌ ERROR en creación de pedido:', error);
      
      // Si hay un archivo temporal y ocurrió un error, intentar eliminarlo
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('🗑️ Archivo temporal eliminado:', req.file.path);
        } catch (unlinkError) {
          console.error('Error al eliminar archivo temporal:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al crear el pedido',
        message: error.message
      });
    }
  });

  // GET /api/pedidos/:id - Obtener pedido por ID
  router.get('/:id', async (req, res) => {
    try {
      const pedido = await Pedidos.findById(req.params.id);
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: pedido
      });
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el pedido'
      });
    }
  });

  // GET /api/pedidos/cliente/:id_cliente - Obtener pedidos por cliente
  router.get('/cliente/:id_cliente', async (req, res) => {
    try {
      const pedidos = await Pedidos.findByPedidosByClient(req.params.id_cliente);
      
      res.json({
        success: true,
        data: pedidos
      });
    } catch (error) {
      console.error('Error al obtener pedidos del cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los pedidos'
      });
    }
  });

  return router;
};