-- ============================================
-- Nova Salud - Schema de Base de Datos
-- Sistema de Gestión de Botica
-- ============================================

CREATE DATABASE IF NOT EXISTS nova_salud;
USE nova_salud;

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'vendedor') DEFAULT 'vendedor',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de categorías de productos
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
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
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
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
);

-- Tabla de detalle de ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- ============================================
-- Datos iniciales
-- ============================================

-- Usuario administrador por defecto (password: admin123)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Administrador', 'admin@novasalud.com', '$2b$10$YourHashedPasswordHere', 'admin');

-- Categorías iniciales
INSERT INTO categorias (nombre, descripcion) VALUES
('Analgésicos', 'Medicamentos para el dolor'),
('Antibióticos', 'Medicamentos para infecciones bacterianas'),
('Antiinflamatorios', 'Medicamentos para reducir inflamación'),
('Vitaminas', 'Suplementos vitamínicos'),
('Antigripales', 'Medicamentos para gripe y resfriado'),
('Dermatológicos', 'Productos para la piel'),
('Gastrointestinales', 'Medicamentos para el sistema digestivo'),
('Higiene Personal', 'Productos de cuidado personal'),
('Equipo Médico', 'Equipos y dispositivos médicos'),
('Otros', 'Otros productos');

-- Productos de ejemplo
INSERT INTO productos (nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, stock_minimo, unidad, fecha_vencimiento) VALUES
('Paracetamol 500mg', 'Tabletas analgésicas x 100', 1, 8.00, 15.00, 150, 20, 'caja', '2027-12-31'),
('Ibuprofeno 400mg', 'Tabletas antiinflamatorias x 50', 3, 6.50, 12.00, 80, 15, 'caja', '2027-06-30'),
('Amoxicilina 500mg', 'Cápsulas antibióticas x 30', 2, 12.00, 22.00, 45, 10, 'caja', '2027-03-15'),
('Vitamina C 1000mg', 'Tabletas efervescentes x 10', 4, 5.00, 10.00, 200, 25, 'tubo', '2028-01-15'),
('Antigripal Plus', 'Sobres para gripe x 12', 5, 7.50, 14.00, 120, 20, 'caja', '2027-09-30'),
('Omeprazol 20mg', 'Cápsulas x 30', 7, 4.50, 9.50, 90, 15, 'caja', '2027-08-20'),
('Loratadina 10mg', 'Tabletas antialérgicas x 20', 3, 3.50, 7.00, 60, 10, 'caja', '2027-11-30'),
('Alcohol 70°', 'Frasco de 250ml', 8, 3.00, 6.00, 50, 10, 'frasco', '2028-06-30'),
('Mascarilla KN95', 'Paquete x 10 unidades', 9, 8.00, 15.00, 5, 20, 'paquete', '2028-12-31'),
('Curitas adhesivas', 'Caja x 100 unidades', 9, 4.00, 8.00, 35, 15, 'caja', '2028-12-31');
