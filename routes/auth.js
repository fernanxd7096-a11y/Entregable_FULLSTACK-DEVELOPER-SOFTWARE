// ============================================
// Rutas de Autenticación
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = req.app.locals.pool;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND activo = TRUE', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
            process.env.JWT_SECRET || 'nova_salud_secret_key_2026',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [users] = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/register (admin only)
router.post('/register', authMiddleware, async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores pueden registrar usuarios' });
        }

        const { nombre, email, password, rol } = req.body;
        const pool = req.app.locals.pool;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, rol || 'vendedor']
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente', id: result.insertId });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
