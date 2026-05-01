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

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/dashboard', dashboardRoutes);

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

// Initialize database and create admin user
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL exitosa');

        // Check if admin user exists
        const [users] = await connection.query('SELECT id FROM usuarios WHERE email = ?', ['admin@novasalud.com']);
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin@novasalud.com', hashedPassword, 'admin']
            );
            console.log('✅ Usuario administrador creado (admin@novasalud.com / admin123)');
        } else {
            // Update password in case it's the placeholder hash
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query('UPDATE usuarios SET password = ? WHERE email = ?', [hashedPassword, 'admin@novasalud.com']);
        }

        connection.release();
    } catch (error) {
        console.error('❌ Error de conexión a MySQL:', error.message);
        console.log('📋 Asegúrate de:');
        console.log('   1. Tener MySQL/XAMPP ejecutándose');
        console.log('   2. Haber creado la base de datos "nova_salud"');
        console.log('   3. Haber ejecutado el archivo database/schema.sql');
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`\n🏥 Nova Salud - Sistema de Gestión de Botica`);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Panel de control: http://localhost:${PORT}/dashboard\n`);
    initializeDatabase();
});
