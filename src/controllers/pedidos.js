const Pedidos = require('../models/pedidos');

class PedidosController {
    
    // Obtener todos los pedidos (con filtros opcionales)
    static async getAllPedidos(req, res) {
        try {
            const filters = {
                estado: req.query.estado,
                fecha_desde: req.query.fecha_desde,
                fecha_hasta: req.query.fecha_hasta,
                id_cliente: req.query.id_cliente,
                limit: req.query.limit
            };

            const pedidos = await Pedidos.findAll(filters);
            
            res.json({
                success: true,
                data: pedidos,
                total: pedidos.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener pedidos por cliente
    static async getPedidosByCliente(req, res) {
        try {
            const { id_cliente } = req.params;
            
            const pedidos = await Pedidos.findByPedidosByClient(id_cliente);
            
            res.json({
                success: true,
                data: pedidos,
                total: pedidos.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener pedido completo por ID
    static async getPedidoById(req, res) {
        try {
            const { id } = req.params;
            
            const pedido = await Pedidos.getPedidoCompleto(id);
            
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
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Crear nuevo pedido
    static async createPedido(req, res) {
        try {
            const pedidoData = {
                id_cliente: req.body.id_cliente,
                subtotal: req.body.subtotal,
                total: req.body.total,
                direccion_envio: req.body.direccion_envio,
                telefono_contacto: req.body.telefono_contacto,
                notas: req.body.notas,
                estado: req.body.estado || 'pendiente',
                detalles: req.body.detalles || []
            };

            // Validaciones básicas
            if (!pedidoData.id_cliente || !pedidoData.subtotal || !pedidoData.total) {
                return res.status(400).json({
                    success: false,
                    error: 'Faltan campos obligatorios: id_cliente, subtotal, total'
                });
            }

            if (!pedidoData.detalles || pedidoData.detalles.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'El pedido debe contener al menos un producto'
                });
            }

            const id_pedido = await Pedidos.create(pedidoData);

            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                data: {
                    id_pedido: id_pedido
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Actualizar estado del pedido
    static async updateEstadoPedido(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!estado) {
                return res.status(400).json({
                    success: false,
                    error: 'El campo estado es requerido'
                });
            }

            const estadosPermitidos = ['pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado'];
            if (!estadosPermitidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    error: `Estado no válido. Estados permitidos: ${estadosPermitidos.join(', ')}`
                });
            }

            const actualizado = await Pedidos.updateEstado(id, estado);

            if (!actualizado) {
                return res.status(404).json({
                    success: false,
                    error: 'Pedido no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Estado del pedido actualizado a: ${estado}`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener estadísticas de pedidos
    static async getEstadisticas(req, res) {
        try {
            const estadisticas = await Pedidos.getEstadisticas();
            
            res.json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Eliminar pedido
    static async deletePedido(req, res) {
        try {
            const { id } = req.params;
            
            const eliminado = await Pedidos.delete(id);

            if (!eliminado) {
                return res.status(404).json({
                    success: false,
                    error: 'Pedido no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Pedido eliminado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = PedidosController;