// Migration script to update database schema for user management
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nova_salud',
        port: process.env.DB_PORT || 3306
    });

    console.log('Conectado a MySQL. Ejecutando migraciones...');

    // 1. Update ENUM to include 'empleado' instead of 'vendedor'
    try {
        await conn.query("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin','empleado','vendedor') DEFAULT 'empleado'");
        console.log('1. ENUM temporal actualizado');
    } catch(e) { console.log('1. ENUM:', e.message); }

    // 2. Migrate existing 'vendedor' to 'empleado'
    try {
        const [result] = await conn.query("UPDATE usuarios SET rol = 'empleado' WHERE rol = 'vendedor'");
        console.log('2. Roles migrados: ' + result.affectedRows + ' filas');
    } catch(e) { console.log('2. Migrate:', e.message); }

    // 3. Now remove 'vendedor' from ENUM
    try {
        await conn.query("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('admin','empleado') DEFAULT 'empleado'");
        console.log('3. ENUM final actualizado');
    } catch(e) { console.log('3. ENUM final:', e.message); }

    // 4. Add es_super_admin column
    try {
        await conn.query("ALTER TABLE usuarios ADD COLUMN es_super_admin BOOLEAN DEFAULT FALSE");
        console.log('4. Columna es_super_admin agregada');
    } catch(e) { console.log('4. es_super_admin:', e.message); }

    // 5. Mark default admin as super admin
    try {
        await conn.query("UPDATE usuarios SET es_super_admin = TRUE WHERE email = 'admin@novasalud.com'");
        console.log('5. Admin superior marcado');
    } catch(e) { console.log('5. Mark admin:', e.message); }

    await conn.end();
    console.log('\nMigracion completada!');
}

migrate().catch(e => { console.error('Error:', e.message); process.exit(1); });
