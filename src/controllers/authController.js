const User = require('../models/users');

const authController = {
  // Login básico
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validaciones básicas
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y password son requeridos'
        });
      }

      // Buscar usuario por email
      const user = await User.findByEmailForLogin(email);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Verificar password (comparación básica - en producción usar bcrypt)
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Actualizar último login
      await User.updateLastLogin(user.id);

      // Preparar respuesta del usuario (sin password)
      const userResponse = {
        id: user.id,
        names: user.names,
        email: user.email,
        dni: user.dni,
        phone: user.phone,
        email_verified_at: user.email_verified_at,
        avatar: user.avatar,
        created_at: user.created_at
      };

      res.json({
        success: true,
        message: 'Login exitoso',
        user: userResponse
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  // Verificar token (si usas JWT en el futuro)
  verifyToken: async (req, res) => {
    try {
      // Aquí puedes implementar verificación de JWT si lo necesitas
      res.json({
        success: true,
        message: 'Token válido'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }
  }
};

module.exports = authController;