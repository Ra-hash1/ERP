const pool = require('../config/db');

class Activity {
  static async log(user_id, action, details) {
    const query = `
      INSERT INTO activity_logs (user_id, action, details)
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await pool.query(query, [user_id, action, details]);
    return result.rows[0];
  }
}

module.exports = Activity;