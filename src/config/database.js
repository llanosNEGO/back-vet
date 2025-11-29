const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    console.log(`📊 Base de datos: ${process.env.MYSQL_DATABASE}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    return false;
  }
};

// Función para ejecutar consultas
const executeQuery = async (query, params = []) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    console.error('Error en la consulta:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Función para obtener una conexión del pool
const getConnection = async () => {
  return await pool.getConnection();
};

// Manejar eventos del pool
pool.on('connection', (connection) => {
  console.log('🔄 Nueva conexión establecida con MySQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de MySQL:', err);
});

// Exportar funciones y pool
module.exports = {
  pool,
  testConnection,
  executeQuery,
  getConnection,
  dbConfig
};