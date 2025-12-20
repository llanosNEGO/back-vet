// models/pedidos.js
const { executeQuery, getConnection } = require('../config/database');

class Pedidos {

    static async create(pedidoData) {
        let connection;
        try {
            // Obtener una conexión del pool
            connection = await getConnection();
            
            // Iniciar transacción
            await connection.beginTransaction();

            console.log('Insertando pedido principal con datos de pago...');
            console.log('Método de pago recibido:', pedidoData.metodo_pago);
            
            // 1. Insertar el pedido principal CON LOS NUEVOS CAMPOS
            const queryPedido = `
                INSERT INTO pedidos_web (
                    id_cliente, 
                    cliente_nombre,
                    cliente_dni,
                    cliente_email,
                    subtotal, 
                    total, 
                    direccion_envio, 
                    telefono_contacto, 
                    notas, 
                    estado,
                    metodo_pago,
                    numero_operacion,
                    comprobante_pago,
                    nombre_comprobante,
                    fecha_pago,
                    estado_pago
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            // Determinar estado de pago según el método
            let estado_pago = 'pendiente';
            if (pedidoData.metodo_pago === 'efectivo') {
                estado_pago = 'pendiente'; // Pago pendiente hasta entrega
            } else if (pedidoData.metodo_pago === 'transferencia' || pedidoData.metodo_pago === 'yape') {
                estado_pago = pedidoData.comprobante_pago ? 'por_verificar' : 'pendiente';
            }

            console.log('Estado de pago asignado:', estado_pago);

            const [pedidoResult] = await connection.execute(queryPedido, [
                pedidoData.id_cliente,
                pedidoData.cliente_nombre || '',
                pedidoData.cliente_dni || '',
                pedidoData.cliente_email || '',
                pedidoData.subtotal,
                pedidoData.total,
                pedidoData.direccion_envio,
                pedidoData.telefono_contacto,
                pedidoData.notas || '',
                pedidoData.estado || 'pendiente',
                // Nuevos campos de pago
                pedidoData.metodo_pago || 'efectivo',
                pedidoData.numero_operacion || null,
                pedidoData.comprobante_pago || null,
                pedidoData.nombre_comprobante || null,
                pedidoData.fecha_pago ? new Date(pedidoData.fecha_pago) : null,
                estado_pago
            ]);

            const id_pedido = pedidoResult.insertId;
            console.log(`Pedido principal creado con ID: ${id_pedido}, Método: ${pedidoData.metodo_pago || 'efectivo'}`);

            // 2. Insertar los detalles del pedido
            if (pedidoData.detalles && pedidoData.detalles.length > 0) {
                console.log(`Insertando ${pedidoData.detalles.length} detalles...`);
                
                const queryDetalle = `
                    INSERT INTO detallepedidos_web (
                        id_pedido, id_producto, cantidad, precio_unitario,
                        subtotal_linea, marca, descripcion, descrip_corta,
                        categoria, imagen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                for (const detalle of pedidoData.detalles) {
                    await connection.execute(queryDetalle, [
                        id_pedido,
                        detalle.id_producto,
                        detalle.cantidad,
                        detalle.precio_unitario,
                        detalle.subtotal_linea,
                        detalle.marca || '',
                        detalle.descripcion || '',
                        detalle.descrip_corta || '',
                        detalle.categoria || '',
                        detalle.imagen || ''
                    ]);
                }
                console.log('Detalles insertados correctamente');
            } else {
                console.log('No hay detalles para insertar');
            }

            // Confirmar transacción
            await connection.commit();
            console.log('Transacción completada exitosamente');
            
            return {
                id_pedido: id_pedido,
                metodo_pago: pedidoData.metodo_pago || 'efectivo',
                estado_pago: estado_pago,
                numero_operacion: pedidoData.numero_operacion || null
            };

        } catch (error) {
            // Revertir transacción en caso de error
            if (connection) {
                await connection.rollback();
                console.log('Transacción revertida debido a error');
            }
            
            console.error('Error detallado en create pedido:', error);
            throw new Error(`Error al crear pedido: ${error.message}`);
            
        } finally {
            // Liberar conexión
            if (connection) {
                connection.release();
            }
        }
    }

    static async findByPedidosByClient(id_cliente) {
        try {
            const query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone,
                    -- Información de pago
                    pw.metodo_pago,
                    pw.estado_pago,
                    pw.numero_operacion,
                    pw.fecha_pago,
                    -- Calcular días desde el pedido
                    DATEDIFF(NOW(), pw.fecha_pedido) as dias_desde_pedido
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                WHERE pw.id_cliente = ?
                ORDER BY pw.fecha_pedido DESC
            `;
            const pedidos = await executeQuery(query, [id_cliente]);
            return pedidos;
        } catch (error) {
            throw new Error(`Error al buscar pedidos por cliente: ${error.message}`);
        }
    }

    // Método para obtener un pedido específico con sus detalles
    static async findById(id_pedido) {
        try {
            const queryPedido = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone,
                    c.dni,
                    -- Información de pago completa
                    pw.metodo_pago,
                    pw.estado_pago,
                    pw.numero_operacion,
                    pw.comprobante_pago,
                    pw.nombre_comprobante,
                    pw.fecha_pago,
                    pw.cliente_nombre,
                    pw.cliente_dni,
                    pw.cliente_email
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                WHERE pw.id_pedido = ?
            `;
            
            const pedido = await executeQuery(queryPedido, [id_pedido]);
            
            if (pedido.length === 0) {
                return null;
            }

            // Obtener detalles del pedido
            const queryDetalles = `
                SELECT 
                    dp.*
                FROM detallepedidos_web dp
                WHERE dp.id_pedido = ?
                ORDER BY dp.id_detalle
            `;
            
            const detalles = await executeQuery(queryDetalles, [id_pedido]);
            
            return {
                ...pedido[0],
                detalles: detalles
            };
            
        } catch (error) {
            throw new Error(`Error al buscar pedido por ID: ${error.message}`);
        }
    }

    // Método para actualizar el estado de pago (para administradores)
    static async updatePaymentStatus(id_pedido, estado_pago, observaciones = null) {
        let connection;
        try {
            connection = await getConnection();
            await connection.beginTransaction();

            const query = `
                UPDATE pedidos_web 
                SET 
                    estado_pago = ?,
                    fecha_pago = CASE 
                        WHEN ? = 'verificado' AND fecha_pago IS NULL THEN NOW()
                        ELSE fecha_pago 
                    END
                WHERE id_pedido = ?
            `;

            await connection.execute(query, [estado_pago, estado_pago, id_pedido]);

            // Registrar la actualización en un log si se desea
            if (observaciones) {
                const logQuery = `
                    INSERT INTO logs_pagos (
                        id_pedido, 
                        estado_anterior, 
                        estado_nuevo, 
                        observaciones, 
                        fecha_cambio
                    ) VALUES (?, ?, ?, ?, NOW())
                `;
                // Nota: Necesitarías crear la tabla logs_pagos si no existe
                // await connection.execute(logQuery, [id_pedido, estado_actual, estado_pago, observaciones]);
            }

            await connection.commit();
            return true;
            
        } catch (error) {
            if (connection) await connection.rollback();
            throw new Error(`Error al actualizar estado de pago: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    // Método para obtener pedidos por estado de pago (para administradores)
    static async findByPaymentStatus(estado_pago) {
        try {
            const query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone,
                    COUNT(dp.id_detalle) as total_productos,
                    SUM(dp.cantidad) as total_items
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                LEFT JOIN detallepedidos_web dp ON pw.id_pedido = dp.id_pedido
                WHERE pw.estado_pago = ?
                GROUP BY pw.id_pedido
                ORDER BY pw.fecha_pedido DESC
            `;
            const pedidos = await executeQuery(query, [estado_pago]);
            return pedidos;
        } catch (error) {
            throw new Error(`Error al buscar pedidos por estado de pago: ${error.message}`);
        }
    }

    // Método para obtener todos los pedidos (para administradores)
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone,
                    COUNT(dp.id_detalle) as total_productos
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                LEFT JOIN detallepedidos_web dp ON pw.id_pedido = dp.id_pedido
                WHERE 1=1
            `;
            
            const params = [];
            
            // Aplicar filtros
            if (filters.estado_pago) {
                query += ` AND pw.estado_pago = ?`;
                params.push(filters.estado_pago);
            }
            
            if (filters.metodo_pago) {
                query += ` AND pw.metodo_pago = ?`;
                params.push(filters.metodo_pago);
            }
            
            if (filters.fecha_desde) {
                query += ` AND DATE(pw.fecha_pedido) >= ?`;
                params.push(filters.fecha_desde);
            }
            
            if (filters.fecha_hasta) {
                query += ` AND DATE(pw.fecha_pedido) <= ?`;
                params.push(filters.fecha_hasta);
            }
            
            query += ` GROUP BY pw.id_pedido ORDER BY pw.fecha_pedido DESC`;
            
            const pedidos = await executeQuery(query, params);
            return pedidos;
            
        } catch (error) {
            throw new Error(`Error al buscar todos los pedidos: ${error.message}`);
        }
    }

}

module.exports = Pedidos;