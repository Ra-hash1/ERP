const pool = require('../config/db');

class Query {
  static async create({ user_id, query_text }, io) {
    const query = `
      INSERT INTO queries (user_id, query_text, query_status)
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await pool.query(query, [user_id, query_text, 'Open']);
    io.emit('newQuery', result.rows[0]);
    return result.rows[0];
  }

  static async respond(query_id, responded_by, response) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const responseQuery = `
        INSERT INTO query_responses (query_id, responded_by, response)
        VALUES ($1, $2, $3) RETURNING *
      `;
      const updateQuery = `
        UPDATE queries SET query_status = $1, last_updated = NOW()
        WHERE query_id = $2 RETURNING *
      `;
      await client.query(responseQuery, [query_id, responded_by, response]);
      const result = await client.query(updateQuery, ['In Progress', query_id]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAll({ limit = 10, offset = 0 }) {
    const query = 'SELECT * FROM queries LIMIT $1 OFFSET $2';
    const countQuery = 'SELECT COUNT(*) FROM queries';
    const [result, countResult] = await Promise.all([pool.query(query, [limit, offset]), pool.query(countQuery)]);
    return { data: result.rows, total: parseInt(countResult.rows[0].count, 10) };
  }
}

module.exports = Query;