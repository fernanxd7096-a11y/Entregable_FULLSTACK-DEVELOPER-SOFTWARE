require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fix() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nova_salud',
        port: process.env.DB_PORT || 3306
    });
    
    // Check current admin
    const [users] = await conn.query('SELECT id, nombre, email, rol, es_super_admin, password FROM usuarios WHERE email = ?', ['admin@novasalud.com']);
    console.log('Admin actual:', { id: users[0]?.id, rol: users[0]?.rol, es_super_admin: users[0]?.es_super_admin, pwdLen: users[0]?.password?.length });
    
    // Re-hash password
    const hash = await bcrypt.hash('admin123', 10);
    await conn.query('UPDATE usuarios SET password = ?, es_super_admin = TRUE WHERE email = ?', [hash, 'admin@novasalud.com']);
    console.log('Password re-hasheado');
    
    // Verify
    const valid = await bcrypt.compare('admin123', hash);
    console.log('Verificacion:', valid);
    
    await conn.end();
}
fix().catch(e => console.error(e.message));
