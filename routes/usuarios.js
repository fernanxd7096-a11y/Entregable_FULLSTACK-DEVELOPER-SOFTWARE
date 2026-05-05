// ============================================
// Rutas de Gestión de Usuarios
// Solo accesible por el admin superior
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');

// Middleware: verificar que sea admin superior
function superAdminOnly(req, res, next) {
    if (!req.user.es_super_admin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo el administrador superior puede gestionar usuarios.' });
    }
    next();
}

// GET /api/usuarios - Listar todos los usuarios
router.get('/', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [usuarios] = await pool.query(
            'SELECT id, nombre, email, rol, es_super_admin, activo, created_at, updated_at FROM usuarios ORDER BY created_at DESC'
        );
        // Convert es_super_admin to boolean
        usuarios.forEach(u => u.es_super_admin = !!u.es_super_admin);
        res.json(usuarios);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/usuarios - Crear nuevo usuario
router.post('/', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const pool = req.app.locals.pool;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        // Validar rol
        const rolesPermitidos = ['admin', 'empleado'];
        const rolFinal = rol || 'empleado';
        if (!rolesPermitidos.includes(rolFinal)) {
            return res.status(400).json({ error: 'Rol no válido. Use "admin" o "empleado"' });
        }

        // Verificar email duplicado
        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido' });
        }

        // Validar contraseña mínima
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, rolFinal]
        );

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            id: result.insertId,
            usuario: { id: result.insertId, nombre, email, rol: rolFinal }
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, password, rol, activo } = req.body;
        const pool = req.app.locals.pool;

        // No permitir editar al super admin
        const [target] = await pool.query('SELECT es_super_admin FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (target[0].es_super_admin) {
            return res.status(403).json({ error: 'No se puede modificar al administrador superior' });
        }

        // Construir query dinámico
        const updates = [];
        const values = [];

        if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
        if (email) {
            // Verificar email duplicado
            const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
            }
            updates.push('email = ?');
            values.push(email);
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        if (rol) {
            const rolesPermitidos = ['admin', 'empleado'];
            if (!rolesPermitidos.includes(rol)) {
                return res.status(400).json({ error: 'Rol no válido' });
            }
            updates.push('rol = ?');
            values.push(rol);
        }
        if (typeof activo === 'boolean') {
            updates.push('activo = ?');
            values.push(activo);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
        }

        values.push(id);
        await pool.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// DELETE /api/usuarios/:id - Eliminar (desactivar) usuario
router.delete('/:id', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        // No permitir eliminar al super admin
        const [target] = await pool.query('SELECT es_super_admin FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (target[0].es_super_admin) {
            return res.status(403).json({ error: 'No se puede eliminar al administrador superior' });
        }

        await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [id]);
        res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/usuarios/:id/reactivar - Reactivar usuario
router.put('/:id/reactivar', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        const [target] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (target.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await pool.query('UPDATE usuarios SET activo = TRUE WHERE id = ?', [id]);
        res.json({ message: 'Usuario reactivado exitosamente' });
    } catch (error) {
        console.error('Error reactivando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
