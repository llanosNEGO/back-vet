const { executeQuery } = require('../config/database');

class Clients {
  static tableName = 'clients_web';

  static mapRow(row) {
    if (!row) return null;

    const normalizeDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    };

    return {
      id: row.id,
      names: row.names,
      dni: row.dni,
      phone: row.phone,
      email: row.email,
      email_verified_at: normalizeDate(row.email_verified_at),
      google_id: row.google_id,
      facebook_id: row.facebook_id,
      avatar: row.avatar,
      remember_token: row.remember_token,
      created_at: normalizeDate(row.created_at),
      updated_at: normalizeDate(row.updated_at),
      provider: row.google_id ? 'google' : (row.facebook_id ? 'facebook' : 'email'),
    };
  }

  static async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const results = await executeQuery(query, [id]);
    return results.length ? this.mapRow(results[0]) : null;
  }

  static async findByGoogleId(googleId) {
    const query = `SELECT * FROM ${this.tableName} WHERE google_id = ? LIMIT 1`;
    const results = await executeQuery(query, [googleId]);
    return results.length ? this.mapRow(results[0]) : null;
  }

  static async findByEmail(email) {
    const query = `SELECT * FROM ${this.tableName} WHERE email = ? LIMIT 1`;
    const results = await executeQuery(query, [email]);
    return results.length ? this.mapRow(results[0]) : null;
  }

  static async createFromGoogle({ names, email, googleId, avatar, emailVerifiedAt }) {
    const now = new Date();
    const query = `
      INSERT INTO ${this.tableName} (
        names, dni, phone, email, email_verified_at,
        google_id, facebook_id, password, avatar, remember_token,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      names,
      null,
      null,
      email,
      emailVerifiedAt,
      googleId,
      null,
      null,
      avatar,
      null,
      now,
      now
    ]);

    return this.findById(result.insertId);
  }

  static async updateFromGoogle(id, { names, email, googleId, avatar, emailVerifiedAt }) {
    const now = new Date();
    const query = `
      UPDATE ${this.tableName}
      SET names = ?, email = ?, google_id = ?, avatar = ?, email_verified_at = ?, updated_at = ?
      WHERE id = ?
    `;

    await executeQuery(query, [
      names,
      email,
      googleId,
      avatar,
      emailVerifiedAt,
      now,
      id
    ]);

    return this.findById(id);
  }
}

module.exports = Clients;
