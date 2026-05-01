// ============================================
// Rutas de Dashboard
// ============================================
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;

        // Ventas de hoy
        const [ventasHoy] = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha_venta) = CURDATE()`);

        // Ventas del mes
        const [ventasMes] = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ventas WHERE MONTH(fecha_venta) = MONTH(CURDATE()) AND YEAR(fecha_venta) = YEAR(CURDATE())`);

        // Total productos activos
        const [totalProductos] = await pool.query('SELECT COUNT(*) as count FROM productos WHERE activo = 1');

        // Productos con stock bajo
        const [stockBajo] = await pool.query('SELECT COUNT(*) as count FROM productos WHERE stock <= stock_minimo AND activo = 1');

        // Top 5 productos más vendidos
        const [topProductos] = await pool.query(`
            SELECT p.nombre, SUM(dv.cantidad) as total_vendido, SUM(dv.subtotal) as total_ingresos
            FROM detalle_ventas dv
            JOIN productos p ON dv.producto_id = p.id
            JOIN ventas v ON dv.venta_id = v.id
            WHERE MONTH(v.fecha_venta) = MONTH(CURDATE()) AND YEAR(v.fecha_venta) = YEAR(CURDATE())
            GROUP BY p.id ORDER BY total_vendido DESC LIMIT 5
        `);

        // Ventas últimos 7 días
        const [ventasSemana] = await pool.query(`
            SELECT DATE(fecha_venta) as fecha, COUNT(*) as count, SUM(total) as total
            FROM ventas WHERE fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(fecha_venta) ORDER BY fecha ASC
        `);

        // Productos por categoría
        const [porCategoria] = await pool.query(`
            SELECT c.nombre, COUNT(p.id) as total
            FROM categorias c LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = 1
            WHERE c.activo = 1 GROUP BY c.id ORDER BY total DESC LIMIT 6
        `);

        res.json({
            ventas_hoy: ventasHoy[0],
            ventas_mes: ventasMes[0],
            total_productos: totalProductos[0].count,
            stock_bajo: stockBajo[0].count,
            top_productos: topProductos,
            ventas_semana: ventasSemana,
            por_categoria: porCategoria
        });
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
