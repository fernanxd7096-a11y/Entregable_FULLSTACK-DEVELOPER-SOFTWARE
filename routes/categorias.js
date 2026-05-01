// ============================================
// Rutas de Categorías
// ============================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/categorias
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [categorias] = await pool.query(`
            SELECT c.*, COUNT(p.id) as total_productos 
            FROM categorias c 
            LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = 1
            WHERE c.activo = 1
            GROUP BY c.id 
            ORDER BY c.nombre ASC
        `);
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// GET /api/categorias/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [categorias] = await pool.query('SELECT * FROM categorias WHERE id = ? AND activo = 1', [req.params.id]);
        if (categorias.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        res.json(categorias[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categoría' });
    }
});

// POST /api/categorias
router.post('/', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const [existing] = await pool.query('SELECT id FROM categorias WHERE nombre = ? AND activo = 1', [nombre]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
        }

        const [result] = await pool.query(
            'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion || null]
        );

        res.status(201).json({ message: 'Categoría creada exitosamente', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

// PUT /api/categorias/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { nombre, descripcion } = req.body;

        await pool.query(
            'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, req.params.id]
        );

        res.json({ message: 'Categoría actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
});

// DELETE /api/categorias/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        await pool.query('UPDATE categorias SET activo = FALSE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

module.exports = router;
