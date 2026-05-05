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
            return res.status(401).json({ error: 'Usuario no encontrado. Verifica tu correo electrónico.' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña equivocada. Escribiste mal tu contraseña, inténtalo de nuevo.' });
        }

        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, es_super_admin: !!user.es_super_admin },
            process.env.JWT_SECRET || 'nova_salud_secret_key_2026',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, es_super_admin: !!user.es_super_admin }
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
        const [users] = await pool.query('SELECT id, nombre, email, rol, es_super_admin FROM usuarios WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const u = users[0];
        u.es_super_admin = !!u.es_super_admin;
        res.json(u);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/register (solo admin superior)
router.post('/register', authMiddleware, async (req, res) => {
    try {
        // Solo el admin superior puede registrar usuarios
        if (!req.user.es_super_admin) {
            return res.status(403).json({ error: 'Solo el administrador superior puede registrar usuarios' });
        }

        const { nombre, email, password, rol } = req.body;
        const pool = req.app.locals.pool;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        // Validar que el rol sea válido
        const rolesPermitidos = ['admin', 'empleado'];
        const rolFinal = rol || 'empleado';
        if (!rolesPermitidos.includes(rolFinal)) {
            return res.status(400).json({ error: 'Rol no válido. Use "admin" o "empleado"' });
        }

        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, rolFinal]
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente', id: result.insertId });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
