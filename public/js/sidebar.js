// Sidebar component
function loadSidebar(activePage) {
    const user = getUser();
    const sidebar = document.getElementById('sidebar');

    // Link de usuarios solo visible para admin superior
    const usuariosLink = (user && user.es_super_admin)
        ? `<a href="/usuarios" class="nav-item ${activePage==='usuarios'?'active':''}"><span class="nav-icon">👥</span> Usuarios</a>`
        : '';

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h1>💊 Nova Salud</h1>
            <span>Sistema de Gestión</span>
        </div>
        <nav class="sidebar-nav">
            <a href="/dashboard" class="nav-item ${activePage==='dashboard'?'active':''}"><span class="nav-icon">📊</span> Dashboard</a>
            <a href="/ventas" class="nav-item ${activePage==='ventas'?'active':''}"><span class="nav-icon">🛒</span> Punto de Venta</a>
            <a href="/historial" class="nav-item ${activePage==='historial'?'active':''}"><span class="nav-icon">📋</span> Historial de Ventas</a>
            <a href="/productos" class="nav-item ${activePage==='productos'?'active':''}"><span class="nav-icon">📦</span> Productos</a>
            <a href="/categorias" class="nav-item ${activePage==='categorias'?'active':''}"><span class="nav-icon">🏷️</span> Categorías</a>
            ${usuariosLink}
        </nav>
        <div class="sidebar-footer">
            <div class="user-info">
                <div class="user-avatar">${user ? user.nombre.charAt(0).toUpperCase() : 'U'}</div>
                <div class="user-details">
                    <div class="user-name">${user ? user.nombre : 'Usuario'}</div>
                    <div class="user-role">${user ? (user.es_super_admin ? '⭐ Super Admin' : user.rol) : ''}</div>
                </div>
            </div>
            <button class="btn btn-outline btn-sm btn-block" onclick="logout()" style="margin-top:8px">🚪 Cerrar Sesión</button>
        </div>
    `;
}
