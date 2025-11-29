const { executeQuery } = require('../config/database');

class User {
  static async findByEmailForLogin(email) {
    try {
      const query = `
        SELECT 
          id, names, email, password, dni, phone,
          email_verified_at, google_id, facebook_id, avatar,
          created_at, updated_at
        FROM clients_web 
        WHERE email = ? AND deleted_at IS NULL
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
      const query = 'SELECT COUNT(*) as count FROM clients_web WHERE email = ? AND deleted_at IS NULL';
      const result = await executeQuery(query, [email]);
      return result[0].count > 0;
    } catch (error) {
      throw new Error(`Error al verificar email: ${error.message}`);
    }
  }

}

module.exports = User;