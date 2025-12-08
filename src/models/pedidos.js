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

            console.log('Insertando pedido principal...');
            
            // 1. Insertar el pedido principal
            const queryPedido = `
                INSERT INTO pedidos_web (
                    id_cliente, subtotal, total, direccion_envio, 
                    telefono_contacto, notas, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [pedidoResult] = await connection.execute(queryPedido, [
                pedidoData.id_cliente,
                pedidoData.subtotal,
                pedidoData.total,
                pedidoData.direccion_envio,
                pedidoData.telefono_contacto,
                pedidoData.notas || '',
                pedidoData.estado || 'pendiente'
            ]);

            const id_pedido = pedidoResult.insertId;
            console.log(`Pedido principal creado con ID: ${id_pedido}`);

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
            
            return id_pedido;

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

    // ... los otros métodos permanecen igual, pero asegúrate de que usen executeQuery en lugar de connection
    static async findByPedidosByClient(id_cliente) {
        try {
            const query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone
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

    static async findById(id_pedido) {
        try {
            const query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone,
                    c.dni
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                WHERE pw.id_pedido = ?
            `;
            const pedidos = await executeQuery(query, [id_pedido]);
            return pedidos[0] || null;
        } catch (error) {
            throw new Error(`Error al buscar pedido por ID: ${error.message}`);
        }
    }

    static async findDetalleByPedido(id_pedido) {
        try {
            const query = `
                SELECT 
                    dp.*,
                    pw.id_cliente,
                    pw.estado as estado_pedido
                FROM detallepedidos_web dp
                INNER JOIN pedidos_web pw ON dp.id_pedido = pw.id_pedido
                WHERE dp.id_pedido = ?
            `;
            const detalles = await executeQuery(query, [id_pedido]);
            return detalles;
        } catch (error) {
            throw new Error(`Error al buscar detalle del pedido: ${error.message}`);
        }
    }

    static async updateEstado(id_pedido, nuevoEstado) {
        try {
            const query = `
                UPDATE pedidos_web 
                SET estado = ? 
                WHERE id_pedido = ?
            `;
            const result = await executeQuery(query, [nuevoEstado, id_pedido]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error al actualizar estado del pedido: ${error.message}`);
        }
    }

    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT 
                    pw.*,
                    c.names as nombre_cliente,
                    c.email,
                    c.phone
                FROM pedidos_web pw
                INNER JOIN clients_web c ON pw.id_cliente = c.id
                WHERE 1=1
            `;
            const values = [];

            // Filtros opcionales
            if (filters.estado) {
                query += ` AND pw.estado = ?`;
                values.push(filters.estado);
            }

            if (filters.fecha_desde) {
                query += ` AND DATE(pw.fecha_pedido) >= ?`;
                values.push(filters.fecha_desde);
            }

            if (filters.fecha_hasta) {
                query += ` AND DATE(pw.fecha_pedido) <= ?`;
                values.push(filters.fecha_hasta);
            }

            if (filters.id_cliente) {
                query += ` AND pw.id_cliente = ?`;
                values.push(filters.id_cliente);
            }

            query += ` ORDER BY pw.fecha_pedido DESC`;

            if (filters.limit) {
                query += ` LIMIT ?`;
                values.push(parseInt(filters.limit));
            }

            const pedidos = await executeQuery(query, values);
            return pedidos;
        } catch (error) {
            throw new Error(`Error al buscar todos los pedidos: ${error.message}`);
        }
    }

    static async getPedidoCompleto(id_pedido) {
        try {
            const pedido = await this.findById(id_pedido);
            if (!pedido) {
                return null;
            }

            const detalles = await this.findDetalleByPedido(id_pedido);
            
            return {
                ...pedido,
                detalles: detalles
            };
        } catch (error) {
            throw new Error(`Error al obtener pedido completo: ${error.message}`);
        }
    }

    static async getEstadisticas() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_pedidos,
                    SUM(total) as ingresos_totales,
                    AVG(total) as promedio_pedido,
                    estado,
                    COUNT(*) as cantidad_por_estado
                FROM pedidos_web
                GROUP BY estado
            `;
            const estadisticas = await executeQuery(query);
            return estadisticas;
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }

    static async delete(id_pedido) {
        let connection;
        try {
            connection = await getConnection();
            await connection.beginTransaction();

            // Eliminar detalles primero (por la FK)
            await connection.execute(
                'DELETE FROM detallepedidos_web WHERE id_pedido = ?',
                [id_pedido]
            );

            // Eliminar pedido
            const [result] = await connection.execute(
                'DELETE FROM pedidos_web WHERE id_pedido = ?',
                [id_pedido]
            );

            await connection.commit();
            return result.affectedRows > 0;

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            throw new Error(`Error al eliminar pedido: ${error.message}`);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

module.exports = Pedidos;