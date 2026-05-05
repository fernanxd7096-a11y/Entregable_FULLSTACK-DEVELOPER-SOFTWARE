// Script para crear la base de datos y tablas automáticamente
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setup() {
    const port = process.env.DB_PORT || 3307;
    console.log(`Conectando a MySQL en puerto ${port}...`);

    // Primero conectar sin base de datos para crearla
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: port,
        authPlugins: {
            auth_gssapi_client: () => () => Buffer.from('')
        }
    });

    console.log('✅ Conexión exitosa a MySQL');

    // Crear base de datos
    await conn.query('CREATE DATABASE IF NOT EXISTS nova_salud');
    console.log('✅ Base de datos nova_salud creada');

    await conn.query('USE nova_salud');

    // Crear tablas
    await conn.query(`CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol ENUM('admin', 'empleado') DEFAULT 'empleado',
        es_super_admin BOOLEAN DEFAULT FALSE,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('✅ Tabla usuarios creada');

    await conn.query(`CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Tabla categorias creada');

    await conn.query(`CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        categoria_id INT,
        precio_compra DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        precio_venta DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        stock_minimo INT NOT NULL DEFAULT 10,
        unidad VARCHAR(50) DEFAULT 'unidad',
        fecha_vencimiento DATE,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )`);
    console.log('✅ Tabla productos creada');

    await conn.query(`CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        cliente_nombre VARCHAR(200) DEFAULT 'Cliente General',
        cliente_dni VARCHAR(20),
        subtotal DECIMAL(10, 2) NOT NULL,
        igv DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        metodo_pago ENUM('efectivo', 'tarjeta', 'yape', 'plin', 'transferencia') DEFAULT 'efectivo',
        fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )`);
    console.log('✅ Tabla ventas creada');

    await conn.query(`CREATE TABLE IF NOT EXISTS detalle_ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        venta_id INT NOT NULL,
        producto_id INT,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
    )`);
    console.log('✅ Tabla detalle_ventas creada');

    // Insertar datos iniciales solo si no existen
    const [cats] = await conn.query('SELECT COUNT(*) as c FROM categorias');
    if (cats[0].c === 0) {
        await conn.query(`INSERT INTO categorias (nombre, descripcion) VALUES
            ('Analgésicos', 'Medicamentos para el dolor'),
            ('Antibióticos', 'Medicamentos para infecciones bacterianas'),
            ('Antiinflamatorios', 'Medicamentos para reducir inflamación'),
            ('Vitaminas', 'Suplementos vitamínicos'),
            ('Antigripales', 'Medicamentos para gripe y resfriado'),
            ('Dermatológicos', 'Productos para la piel'),
            ('Gastrointestinales', 'Medicamentos para el sistema digestivo'),
            ('Higiene Personal', 'Productos de cuidado personal'),
            ('Equipo Médico', 'Equipos y dispositivos médicos'),
            ('Otros', 'Otros productos')`);
        console.log('✅ Categorías iniciales insertadas');
    }

    const [prods] = await conn.query('SELECT COUNT(*) as c FROM productos');
    if (prods[0].c === 0) {
        await conn.query(`INSERT INTO productos (nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, unidad, fecha_vencimiento) VALUES
            ('Paracetamol 500mg', 'Tabletas analgésicas x 100', 1, 8.00, 15.00, 150, 20, 'caja', '2027-12-31'),
            ('Ibuprofeno 400mg', 'Tabletas antiinflamatorias x 50', 3, 6.50, 12.00, 80, 15, 'caja', '2027-06-30'),
            ('Amoxicilina 500mg', 'Cápsulas antibióticas x 30', 2, 12.00, 22.00, 45, 10, 'caja', '2027-03-15'),
            ('Vitamina C 1000mg', 'Tabletas efervescentes x 10', 4, 5.00, 10.00, 200, 25, 'tubo', '2028-01-15'),
            ('Antigripal Plus', 'Sobres para gripe x 12', 5, 7.50, 14.00, 120, 20, 'caja', '2027-09-30'),
            ('Omeprazol 20mg', 'Cápsulas x 30', 7, 4.50, 9.50, 90, 15, 'caja', '2027-08-20'),
            ('Loratadina 10mg', 'Tabletas antialérgicas x 20', 3, 3.50, 7.00, 60, 10, 'caja', '2027-11-30'),
            ('Alcohol 70', 'Frasco de 250ml', 8, 3.00, 6.00, 50, 10, 'frasco', '2028-06-30'),
            ('Mascarilla KN95', 'Paquete x 10 unidades', 9, 8.00, 15.00, 5, 20, 'paquete', '2028-12-31'),
            ('Curitas adhesivas', 'Caja x 100 unidades', 9, 4.00, 8.00, 35, 15, 'caja', '2028-12-31')`);
        console.log('✅ Productos de ejemplo insertados');
    }

    await conn.end();
    console.log('\n🎉 ¡Base de datos configurada correctamente!');
}

setup().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
