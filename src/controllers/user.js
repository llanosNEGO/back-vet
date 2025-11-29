const User = require('../models/users');

const userController = {
  // Obtener todos los usuarios
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll();
      
      res.json({
        success: true,
        data: users,
        count: users.length,
        message: `${users.length} usuarios encontrados`
      });
    } catch (error) {
      console.error('Error en getAllUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener usuarios'
      });
    }
  },

  // Obtener usuario por ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error en getUserById:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener usuario'
      });
    }
  },

  // Buscar usuarios por nombre
  searchUsers: async (req, res) => {
    try {
      const { name } = req.query;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'El parámetro "name" es requerido'
        });
      }

      const users = await User.searchByName(name.trim());
      
      res.json({
        success: true,
        data: users,
        count: users.length,
        searchTerm: name,
        message: users.length > 0 
          ? `${users.length} usuarios encontrados` 
          : 'No se encontraron usuarios'
      });
    } catch (error) {
      console.error('Error en searchUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Error al buscar usuarios'
      });
    }
  },

};

module.exports = userController;