const { executeQuery } = require('../config/database');

class User {
  // Buscar usuario por email para login
  static async findByEmailForLogin(email) {
    try {
      const query = `
        SELECT 
          id, names, email, password, dni, phone,
          email_verified_at, google_id, facebook_id, avatar,
          created_at, updated_at
        FROM clients_web 
        WHERE email = ?
      `;
      const users = await executeQuery(query, [email]);
      return users[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar usuario: ${error.message}`);
    }
  }

  // Verificar si el usuario existe por email
  static async emailExists(email) {
    try {
      const query = 'SELECT COUNT(*) as count FROM clients_web WHERE email = ?';
      const result = await executeQuery(query, [email]);
      return result[0].count > 0;
    } catch (error) {
      throw new Error(`Error al verificar email: ${error.message}`);
    }
  }

  // Actualizar último login (nuevo método)
  static async updateLastLogin(id) {
    try {
      const query = 'UPDATE clients_web SET updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await executeQuery(query, [id]);
      return true;
    } catch (error) {
      console.error('Error al actualizar último login:', error.message);
      return false;
    }
  }

  // Obtener todos los usuarios
  static async findAll() {
    try {
      const query = `
        SELECT 
          id, names, dni, phone, email, 
          email_verified_at, google_id, facebook_id, avatar,
          created_at, updated_at
        FROM clients_web 
        ORDER BY created_at DESC
      `;
      const users = await executeQuery(query);
      return users;
    } catch (error) {
      throw new Error(`Error al obtener usuarios: ${error.message}`);
    }
  }

  // Obtener usuario por ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          id, names, dni, phone, email,
          email_verified_at, google_id, facebook_id, avatar,
          created_at, updated_at
        FROM clients_web 
        WHERE id = ?
      `;
      const users = await executeQuery(query, [id]);
      return users[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }
  }


}

module.exports = User;