// ============================================
// Nova Salud - Servidor Principal
// Sistema de Gestión de Botica
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nova_salud',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool accessible to routes
app.locals.pool = pool;

// Routes
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');
const usuariosRoutes = require('./routes/usuarios');

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'productos.html'));
});

app.get('/ventas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ventas.html'));
});

app.get('/historial', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'historial.html'));
});

app.get('/categorias', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'categorias.html'));
});

app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuarios.html'));
});

// Initialize database and create admin user
async function initializeDatabase() {
    try {
        console.log('⏳ Intentando conectar a MySQL...');
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL exitosa');

        // Check if admin user exists
        const [users] = await connection.query('SELECT id FROM usuarios WHERE email = ?', ['admin@novasalud.com']);
        
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, rol, es_super_admin) VALUES (?, ?, ?, ?, ?)',
                ['Administrador', 'admin@novasalud.com', hashedPassword, 'admin', true]
            );
            console.log('✅ Usuario administrador superior creado');
        } else {
            // Asegurar que el admin principal tenga es_super_admin = true
            await connection.query('UPDATE usuarios SET es_super_admin = TRUE WHERE email = ? AND rol = ?', ['admin@novasalud.com', 'admin']);
        }

        connection.release();
    } catch (error) {
        console.error('\n--- 🔴 ERROR DETECTADO 🔴 ---');
        console.error('Código de error:', error.code);
        console.error('Mensaje técnico:', error.message);
        console.error('-----------------------------\n');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`\n🏥 Nova Salud - Sistema de Gestión de Botica`);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Panel de control: http://localhost:${PORT}/dashboard\n`);
    initializeDatabase();
});
