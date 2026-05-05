// ============================================
// Rutas de Productos
// ============================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/productos - Listar todos los productos
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { search, categoria, stock_bajo, activo } = req.query;

        let query = `
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (categoria) {
            query += ' AND p.categoria_id = ?';
            params.push(categoria);
        }

        if (stock_bajo === 'true') {
            query += ' AND p.stock <= p.stock_minimo';
        }

        if (activo !== undefined) {
            query += ' AND p.activo = ?';
            params.push(activo === 'true' ? 1 : 0);
        } else {
            query += ' AND p.activo = 1';
        }

        query += ' ORDER BY p.nombre ASC';

        const [productos] = await pool.query(query, params);
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET /api/productos/alertas - Productos con stock bajo
router.get('/alertas', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.stock <= p.stock_minimo AND p.activo = 1
            ORDER BY p.stock ASC
        `);
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// GET /api/productos/alertas-vencidos - Productos vencidos
router.get('/alertas-vencidos', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre,
                   DATEDIFF(CURDATE(), p.fecha_vencimiento) as dias_vencido
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.fecha_vencimiento IS NOT NULL 
              AND p.fecha_vencimiento < CURDATE() 
              AND p.activo = 1
            ORDER BY p.fecha_vencimiento ASC
        `);
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener alertas de vencimiento' });
    }
});

// GET /api/productos/:id - Obtener un producto
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [productos] = await pool.query(`
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.id = ?
        `, [req.params.id]);

        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(productos[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// POST /api/productos - Crear producto
// POST /api/productos - Crear producto
router.post('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { 
            nombre, descripcion, categoria_id, precio_compra, 
            precio_venta, stock, stock_minimo, unidad, fecha_vencimiento 
        } = req.body;

        // 1. Validaciones básicas existentes
        if (!nombre || !precio_venta) {
            return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
        }

        // 2. Validación de Fecha de Vencimiento
        if (fecha_vencimiento) {
            const fechaVenc = new Date(fecha_vencimiento);
            const hoy = new Date();
            
            // Ponemos las horas a 0 para comparar solo las fechas (día/mes/año)
            hoy.setHours(0, 0, 0, 0);

            if (fechaVenc < hoy) {
                return res.status(400).json({ 
                    error: 'No se puede registrar un producto con fecha de vencimiento pasada.',
                    vencido: true 
                });
            }
        }

        const [result] = await pool.query(
            `INSERT INTO productos (nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, unidad, fecha_vencimiento) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, descripcion || null, categoria_id || null, precio_compra || 0, precio_venta, stock || 0, stock_minimo || 10, unidad || 'unidad', fecha_vencimiento || null]
        );

        res.status(201).json({ 
            message: 'Producto creado exitosamente', 
            id: result.insertId 
        });

    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, unidad, fecha_vencimiento, activo } = req.body;

        const [existing] = await pool.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await pool.query(
            `UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, precio_compra = ?, precio_venta = ?, 
             stock = ?, stock_minimo = ?, unidad = ?, fecha_vencimiento = ?, activo = ? WHERE id = ?`,
            [nombre, descripcion, categoria_id || null, precio_compra, precio_venta, stock, stock_minimo, unidad, fecha_vencimiento || null, activo !== undefined ? activo : true, req.params.id]
        );

        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        await pool.query('UPDATE productos SET activo = FALSE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
