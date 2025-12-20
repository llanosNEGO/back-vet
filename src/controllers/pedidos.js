const Pedidos = require('../models/pedidos');

class PedidosController {
    
    // Obtener todos los pedidos (con filtros opcionales)
    static async getAllPedidos(req, res) {
        try {
            const filters = {
                estado: req.query.estado,
                estado_pago: req.query.estado_pago,
                metodo_pago: req.query.metodo_pago,
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
            
            const pedido = await Pedidos.findById(id);
            
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

    // Crear nuevo pedido CON DATOS DE PAGO
    static async createPedido(req, res) {
        try {
            const pedidoData = {
                // Datos principales
                id_cliente: req.body.id_cliente,
                cliente_nombre: req.body.cliente_nombre,
                cliente_dni: req.body.cliente_dni,
                cliente_email: req.body.cliente_email,
                subtotal: req.body.subtotal,
                total: req.body.total,
                direccion_envio: req.body.direccion_envio,
                telefono_contacto: req.body.telefono_contacto,
                notas: req.body.notas,
                estado: req.body.estado || 'pendiente',
                
                // Datos de pago (nuevos)
                metodo_pago: req.body.metodo_pago || 'efectivo',
                numero_operacion: req.body.numero_operacion || null,
                comprobante_pago: req.body.comprobante_pago || null,
                nombre_comprobante: req.body.nombre_comprobante || null,
                fecha_pago: req.body.fecha_pago || null,
                
                // Detalles del pedido
                detalles: req.body.detalles || []
            };

            console.log('Datos recibidos para crear pedido:', {
                id_cliente: pedidoData.id_cliente,
                metodo_pago: pedidoData.metodo_pago,
                tiene_comprobante: !!pedidoData.comprobante_pago,
                total_detalles: pedidoData.detalles.length
            });

            // Validaciones básicas
            if (!pedidoData.id_cliente) {
                return res.status(400).json({
                    success: false,
                    error: 'Falta el ID del cliente'
                });
            }

            if (!pedidoData.subtotal || !pedidoData.total) {
                return res.status(400).json({
                    success: false,
                    error: 'Faltan campos financieros: subtotal, total'
                });
            }

            if (!pedidoData.direccion_envio) {
                return res.status(400).json({
                    success: false,
                    error: 'La dirección de envío es requerida'
                });
            }

            if (!pedidoData.detalles || pedidoData.detalles.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'El pedido debe contener al menos un producto'
                });
            }

            // Validar método de pago
            const metodosPermitidos = ['transferencia', 'yape', 'efectivo', 'otros'];
            if (!metodosPermitidos.includes(pedidoData.metodo_pago)) {
                return res.status(400).json({
                    success: false,
                    error: `Método de pago no válido. Métodos permitidos: ${metodosPermitidos.join(', ')}`
                });
            }

            // Validaciones específicas por método de pago
            if (pedidoData.metodo_pago === 'transferencia' || pedidoData.metodo_pago === 'yape') {
                if (!pedidoData.numero_operacion) {
                    return res.status(400).json({
                        success: false,
                        error: `Para pago por ${pedidoData.metodo_pago}, el número de operación es requerido`
                    });
                }
                
                // Nota: El comprobante puede ser opcional según tu negocio
                // if (!pedidoData.comprobante_pago) {
                //     return res.status(400).json({
                //         success: false,
                //         error: `Para pago por ${pedidoData.metodo_pago}, el comprobante es requerido`
                //     });
                // }
            }

            const result = await Pedidos.create(pedidoData);

            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error detallado en createPedido:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error al crear el pedido'
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

            // Actualizar solo el estado del pedido
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

    // Actualizar estado de pago
    static async updateEstadoPago(req, res) {
        try {
            const { id } = req.params;
            const { estado_pago, observaciones } = req.body;

            if (!estado_pago) {
                return res.status(400).json({
                    success: false,
                    error: 'El campo estado_pago es requerido'
                });
            }

            const estadosPermitidos = ['pendiente', 'por_verificar', 'verificado', 'rechazado'];
            if (!estadosPermitidos.includes(estado_pago)) {
                return res.status(400).json({
                    success: false,
                    error: `Estado de pago no válido. Estados permitidos: ${estadosPermitidos.join(', ')}`
                });
            }

            const actualizado = await Pedidos.updatePaymentStatus(id, estado_pago, observaciones);

            if (!actualizado) {
                return res.status(404).json({
                    success: false,
                    error: 'Pedido no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Estado de pago actualizado a: ${estado_pago}`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Subir comprobante de pago (para cuando no se subió al crear el pedido)
    static async uploadComprobante(req, res) {
        try {
            const { id } = req.params;
            const { comprobante_pago, nombre_comprobante, numero_operacion } = req.body;

            if (!comprobante_pago) {
                return res.status(400).json({
                    success: false,
                    error: 'El comprobante de pago es requerido'
                });
            }

            const actualizado = await Pedidos.updateComprobante(id, {
                comprobante_pago,
                nombre_comprobante,
                numero_operacion
            });

            if (!actualizado) {
                return res.status(404).json({
                    success: false,
                    error: 'Pedido no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Comprobante de pago subido exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Obtener pedidos por estado de pago
    static async getPedidosByEstadoPago(req, res) {
        try {
            const { estado } = req.params;
            
            const estadosPermitidos = ['pendiente', 'por_verificar', 'verificado', 'rechazado'];
            if (!estadosPermitidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    error: `Estado de pago no válido. Estados permitidos: ${estadosPermitidos.join(', ')}`
                });
            }

            const pedidos = await Pedidos.findByPaymentStatus(estado);
            
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

    // Obtener estadísticas de pedidos (ampliada)
    static async getEstadisticas(req, res) {
        try {
            const estadisticas = await Pedidos.getEstadisticasCompletas();
            
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

    // Obtener métodos de pago disponibles (para frontend)
    static async getMetodosPago(req, res) {
        try {
            const metodos = [
                {
                    value: 'transferencia',
                    label: 'Transferencia Bancaria / QR',
                    descripcion: 'Paga con transferencia interbancaria o escaneando el código QR',
                    requiereComprobante: true,
                    requiereNumeroOperacion: true
                },
                {
                    value: 'yape',
                    label: 'Yape / Plin',
                    descripcion: 'Paga con Yape o Plin desde tu celular',
                    requiereComprobante: true,
                    requiereNumeroOperacion: true
                },
                {
                    value: 'efectivo',
                    label: 'Pago en Efectivo',
                    descripcion: 'Paga al recibir tu pedido en efectivo',
                    requiereComprobante: false,
                    requiereNumeroOperacion: false
                },
                {
                    value: 'otros',
                    label: 'Otro método',
                    descripcion: 'Otro método de pago',
                    requiereComprobante: true,
                    requiereNumeroOperacion: true
                }
            ];

            res.json({
                success: true,
                data: metodos
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