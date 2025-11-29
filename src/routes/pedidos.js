const express = require('express');
const router = express.Router();
const PedidosController = require('../controllers/pedidos');

// Middleware de autenticación (opcional - puedes agregarlo si necesitas proteger las rutas)
// const auth = require('../middlewares/auth');

// Todas las rutas de pedidos
router.get('/', PedidosController.getAllPedidos);
router.get('/estadisticas', PedidosController.getEstadisticas);
router.get('/cliente/:id_cliente', PedidosController.getPedidosByCliente);
router.get('/:id', PedidosController.getPedidoById);
router.post('/', PedidosController.createPedido);
router.put('/:id/estado', PedidosController.updateEstadoPedido);
router.delete('/:id', PedidosController.deletePedido);

module.exports = router;