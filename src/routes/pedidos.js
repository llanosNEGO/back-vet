// routes/pedidos.js
const express = require('express');
const router = express.Router();
const Pedidos = require('../models/pedidos');

// SOLO JSON - NO multer
module.exports = () => {
  
  // POST /api/pedidos - Crear nuevo pedido con JSON puro
  router.post('/', async (req, res) => {
    try {
      console.log('=== INICIANDO PROCESO DE PEDIDO ===');
      console.log('Content-Type recibido:', req.headers['content-type']);
      console.log('📦 Recibiendo JSON puro del frontend...');
      
      // Debug inicial
      console.log('✅ JSON parseado automáticamente por express.json()');
      console.log('📊 Estructura recibida:', Object.keys(req.body));
      
      // Verificar que haya cuerpo
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error('❌ ERROR: Cuerpo de la solicitud vacío');
        return res.status(400).json({
          success: false,
          error: 'Cuerpo de la solicitud vacío'
        });
      }

      // Usar directamente req.body (JSON ya parseado)
      const pedidoData = req.body;
      
      // Debug detallado
      console.log('📋 Datos recibidos del frontend:');
      console.log('- id_cliente:', pedidoData.id_cliente, '(tipo:', typeof pedidoData.id_cliente, ')');
      console.log('- cliente_nombre:', pedidoData.cliente_nombre);
      console.log('- total:', pedidoData.total);
      console.log('- metodo_pago:', pedidoData.metodo_pago);
      console.log('- numero_operacion:', pedidoData.numero_operacion);
      console.log('- cantidad de detalles:', pedidoData.detalles ? pedidoData.detalles.length : 0);
      console.log('- tiene comprobante?:', !!pedidoData.comprobante);

      // Validar campos requeridos
      if (!pedidoData.id_cliente && pedidoData.id_cliente !== 0) {
        console.error('❌ ERROR: id_cliente es requerido');
        return res.status(400).json({
          success: false,
          error: 'Falta el ID del cliente (id_cliente es requerido)'
        });
      }

      // Validar detalles
      if (!pedidoData.detalles || !Array.isArray(pedidoData.detalles) || pedidoData.detalles.length === 0) {
        console.error('❌ ERROR: No hay detalles en el pedido');
        return res.status(400).json({
          success: false,
          error: 'El pedido debe contener al menos un producto'
        });
      }

      // Convertir id_cliente a número
      const idCliente = Number(pedidoData.id_cliente);
      if (isNaN(idCliente)) {
        console.error('❌ ERROR: ID del cliente no es número');
        return res.status(400).json({
          success: false,
          error: 'ID del cliente inválido. Debe ser un número.'
        });
      }
      
      // Asegurar que sea número
      pedidoData.id_cliente = idCliente;

      // Manejar el comprobante (viene como objeto desde el frontend)
      // Formato: { comprobante: { data: 'base64...', mime_type: 'image/jpeg', nombre_original: '...' } }
      if (pedidoData.comprobante) {
        console.log('📎 Comprobante recibido del frontend:');
        console.log('- Tipo de dato:', typeof pedidoData.comprobante);
        
        if (pedidoData.comprobante.data) {
          console.log('- Tiene datos Base64: SÍ');
          console.log('- Nombre:', pedidoData.comprobante.nombre_original || 'No especificado');
          console.log('- Tipo MIME:', pedidoData.comprobante.mime_type || 'No especificado');
          
          // Extraer para el modelo
          pedidoData.comprobante_pago = pedidoData.comprobante.data; // Base64 completo
          pedidoData.nombre_comprobante = pedidoData.comprobante.nombre_original || 'comprobante.jpg';
          
          // Eliminar el objeto comprobante para evitar conflictos
          delete pedidoData.comprobante;
        } else {
          console.log('⚠️ Objeto comprobante vacío o sin data');
          pedidoData.comprobante_pago = null;
          pedidoData.nombre_comprobante = null;
        }
      } else {
        console.log('ℹ️ No se recibió comprobante');
        pedidoData.comprobante_pago = null;
        pedidoData.nombre_comprobante = null;
      }

      console.log('🎯 Enviando datos al modelo Pedidos.create...');
      console.log('📤 Estructura final:', {
        id_cliente: pedidoData.id_cliente,
        total: pedidoData.total,
        metodo_pago: pedidoData.metodo_pago,
        tiene_comprobante: !!pedidoData.comprobante_pago,
        detalles_count: pedidoData.detalles.length
      });

      // Crear el pedido usando el modelo
      const result = await Pedidos.create(pedidoData);
      
      console.log('✅ Pedido creado exitosamente!');
      console.log('📋 Resultado:', result);

      // Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: {
          id_pedido: result.id_pedido,
          metodo_pago: result.metodo_pago,
          estado_pago: result.estado_pago,
          numero_operacion: result.numero_operacion,
          fecha: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ ERROR en creación de pedido:');
      console.error('Mensaje:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Respuesta de error
      res.status(500).json({
        success: false,
        error: 'Error al crear el pedido',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Resto de rutas (mantener igual)...
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