// ============================================
// Rutas de Ventas
// ============================================
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/ventas
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { fecha_inicio, fecha_fin, limit } = req.query;
        let query = `SELECT v.*, u.nombre as vendedor_nombre FROM ventas v LEFT JOIN usuarios u ON v.usuario_id = u.id WHERE 1=1`;
        const params = [];
        if (fecha_inicio) { query += ' AND DATE(v.fecha_venta) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { query += ' AND DATE(v.fecha_venta) <= ?'; params.push(fecha_fin); }
        query += ' ORDER BY v.fecha_venta DESC';
        if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
        const [ventas] = await pool.query(query, params);
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// GET /api/ventas/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [ventas] = await pool.query(`SELECT v.*, u.nombre as vendedor_nombre FROM ventas v LEFT JOIN usuarios u ON v.usuario_id = u.id WHERE v.id = ?`, [req.params.id]);
        if (ventas.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
        const [detalles] = await pool.query(`SELECT dv.*, p.nombre as producto_nombre FROM detalle_ventas dv LEFT JOIN productos p ON dv.producto_id = p.id WHERE dv.venta_id = ?`, [req.params.id]);
        res.json({ ...ventas[0], detalles });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener venta' });
    }
});

// POST /api/ventas
router.post('/', authMiddleware, async (req, res) => {
    const pool = req.app.locals.pool;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { cliente_nombre, cliente_dni, metodo_pago, items } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'La venta debe tener al menos un producto' });

        for (const item of items) {
            const [producto] = await connection.query('SELECT id, nombre, stock FROM productos WHERE id = ? AND activo = 1', [item.producto_id]);
            if (producto.length === 0) { await connection.rollback(); return res.status(400).json({ error: `Producto ID ${item.producto_id} no encontrado` }); }
            if (producto[0].stock < item.cantidad) { await connection.rollback(); return res.status(400).json({ error: `Stock insuficiente para "${producto[0].nombre}". Disponible: ${producto[0].stock}` }); }
        }

        let subtotal = 0;
        const detalles = [];
        for (const item of items) {
            const [producto] = await connection.query('SELECT precio_venta FROM productos WHERE id = ?', [item.producto_id]);
            const precio = item.precio_unitario || producto[0].precio_venta;
            const itemSub = precio * item.cantidad;
            subtotal += itemSub;
            detalles.push({ producto_id: item.producto_id, cantidad: item.cantidad, precio_unitario: precio, subtotal: itemSub });
        }

        const igv = subtotal * 0.18;
        const total = subtotal + igv;

        const [ventaResult] = await connection.query(
            'INSERT INTO ventas (usuario_id, cliente_nombre, cliente_dni, subtotal, igv, total, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, cliente_nombre || 'Cliente General', cliente_dni || null, subtotal, igv, total, metodo_pago || 'efectivo']
        );
        const ventaId = ventaResult.insertId;

        for (const d of detalles) {
            await connection.query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)', [ventaId, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal]);
            await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [d.cantidad, d.producto_id]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Venta registrada exitosamente', id: ventaId, total });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: 'Error al registrar venta' });
    } finally {
        connection.release();
    }
});

module.exports = router;
