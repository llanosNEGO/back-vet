const axios = require('axios');
const Clients = require('../models/clients');

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const getProfileFromGoogle = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Token de acceso no recibido');
  }

  const response = await axios.get(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

const buildUserPayload = (profile) => {
  const googleId = profile.sub || profile.id;
  const fullName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ').trim();

  return {
    googleId,
    email: profile.email,
    names: fullName || profile.email,
    avatar: profile.picture || null,
    emailVerifiedAt: profile.email_verified ? new Date() : null,
  };
};

const authController = {
  googleLogin: async (req, res) => {
    try {
      const { accessToken, profile } = req.body;

      if (!accessToken && !profile) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere accessToken o profile para procesar el login con Google',
        });
      }

      let googleProfile = profile;
      if (!googleProfile || !googleProfile.sub) {
        try {
          googleProfile = await getProfileFromGoogle(accessToken);
        } catch (err) {
          console.error('No se pudo validar el token de Google', err);
          return res.status(401).json({
            success: false,
            error: 'No se pudo validar el token de Google',
          });
        }
      }

      const userPayload = buildUserPayload(googleProfile);

      if (!userPayload.googleId || !userPayload.email) {
        return res.status(400).json({
          success: false,
          error: 'El perfil de Google no contiene información suficiente',
        });
      }

      const normalizedEmailVerifiedAt = userPayload.emailVerifiedAt;

      let user = await Clients.findByGoogleId(userPayload.googleId);

      if (user) {
        user = await Clients.updateFromGoogle(user.id, {
          ...userPayload,
          emailVerifiedAt: normalizedEmailVerifiedAt || (user.email_verified_at ? new Date(user.email_verified_at) : null),
        });
      } else {
        const userByEmail = await Clients.findByEmail(userPayload.email);
        if (userByEmail) {
          user = await Clients.updateFromGoogle(userByEmail.id, {
            ...userPayload,
            emailVerifiedAt: normalizedEmailVerifiedAt || (userByEmail.email_verified_at ? new Date(userByEmail.email_verified_at) : null),
          });
        } else {
          user = await Clients.createFromGoogle({
            ...userPayload,
            emailVerifiedAt: normalizedEmailVerifiedAt,
          });
        }
      }

      return res.json({
        success: true,
        provider: 'google',
        user,
      });
    } catch (error) {
      console.error('Error en login con Google:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno al procesar el login con Google',
      });
    }
  },
};

module.exports = authController;
