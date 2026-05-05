const http = require('http');
function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
            let chunks = '';
            res.on('data', c => chunks += c);
            res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); } catch(e) { resolve({ status: res.statusCode, data: chunks }); } });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}
async function test() {
    console.log('=== Login Super Admin ===');
    const login = await request('POST', '/api/auth/login', { email: 'admin@novasalud.com', password: 'admin123' });
    console.log('Status:', login.status);
    console.log('Response:', JSON.stringify(login.data, null, 2));
    if (login.status !== 200) { console.log('Login failed!'); return; }
    const token = login.data.token;

    console.log('\n=== Crear Empleado ===');
    const emp = await request('POST', '/api/usuarios', { nombre: 'Carlos Lopez', email: 'carlos@novasalud.com', password: 'test123', rol: 'empleado' }, token);
    console.log('Status:', emp.status, '| Data:', JSON.stringify(emp.data));

    console.log('\n=== Crear Admin ===');
    const adm = await request('POST', '/api/usuarios', { nombre: 'Ana Garcia', email: 'ana@novasalud.com', password: 'admin456', rol: 'admin' }, token);
    console.log('Status:', adm.status, '| Data:', JSON.stringify(adm.data));

    console.log('\n=== Listar Usuarios ===');
    const users = await request('GET', '/api/usuarios', null, token);
    console.log('Status:', users.status);
    if (Array.isArray(users.data)) {
        users.data.forEach(u => console.log('  -', u.nombre, '|', u.email, '| rol:', u.rol, '| super:', u.es_super_admin, '| activo:', u.activo));
    } else { console.log(JSON.stringify(users.data)); }

    console.log('\n=== Empleado intenta acceder a usuarios (debe fallar) ===');
    const empLogin = await request('POST', '/api/auth/login', { email: 'carlos@novasalud.com', password: 'test123' });
    if (empLogin.status === 200) {
        const empUsers = await request('GET', '/api/usuarios', null, empLogin.data.token);
        console.log('Acceso:', empUsers.status, JSON.stringify(empUsers.data));
    } else { console.log('Login empleado fallo'); }

    console.log('\n=== Admin normal intenta crear usuario (debe fallar) ===');
    const admLogin = await request('POST', '/api/auth/login', { email: 'ana@novasalud.com', password: 'admin456' });
    if (admLogin.status === 200) {
        const tryCreate = await request('POST', '/api/usuarios', { nombre: 'Test', email: 'test@test.com', password: '123456', rol: 'empleado' }, admLogin.data.token);
        console.log('Intento crear:', tryCreate.status, JSON.stringify(tryCreate.data));
    } else { console.log('Login admin fallo'); }

    console.log('\nTests completados!');
}
test().catch(e => console.error('Error:', e.message));
