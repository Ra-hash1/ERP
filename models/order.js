const pool = require('../config/db');

class Order {
  static async create(user_id, { target_delivery_date, items }, io) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderQuery = `
        INSERT INTO orders (user_id, status, target_delivery_date, payment_status)
        VALUES ($1, $2, $3, $4) RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [user_id, 'Pending', target_delivery_date || null, 'Pending']);
      const order = orderResult.rows[0];

      for (const item of items) {
        const productQuery = 'SELECT price, stock_quantity FROM inventory WHERE product_id = $1 FOR UPDATE';
        const productResult = await client.query(productQuery, [item.product_id]);
        const product = productResult.rows[0];
        if (!product || product.stock_quantity < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for ${item.product_id}`), {
            status: 400,
            code: 'STOCK_INSUFFICIENT',
          });
        }

        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.order_id, item.product_id, item.quantity, product.price]
        );

        await client.query('UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE product_id = $2', [
          item.quantity,
          item.product_id,
        ]);

        io.emit('stockUpdate', { product_id: item.product_id, stock_quantity: product.stock_quantity - item.quantity });
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAll({ limit = 10, offset = 0, user_id }) {
    const query = user_id
      ? 'SELECT * FROM orders WHERE user_id = $1 LIMIT $2 OFFSET $3'
      : 'SELECT * FROM orders LIMIT $1 OFFSET $2';
    const countQuery = user_id ? 'SELECT COUNT(*) FROM orders WHERE user_id = $1' : 'SELECT COUNT(*) FROM orders';
    const values = user_id ? [user_id, limit, offset] : [limit, offset];
    const [result, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, user_id ? [user_id] : []),
    ]);
    return { data: result.rows, total: parseInt(countResult.rows[0].count, 10) };
  }
}

module.exports = Order;