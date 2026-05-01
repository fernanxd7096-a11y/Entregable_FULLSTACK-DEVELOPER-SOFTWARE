// ============================================
// Nova Salud - API Client
// ============================================
const API_BASE = '/api';

function getToken() { return localStorage.getItem('nova_token'); }
function getUser() { const u = localStorage.getItem('nova_user'); return u ? JSON.parse(u) : null; }
function setAuth(token, user) { localStorage.setItem('nova_token', token); localStorage.setItem('nova_user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('nova_token'); localStorage.removeItem('nova_user'); }
function isAuthenticated() { return !!getToken(); }

function logout() { clearAuth(); window.location.href = '/'; }

function checkAuth() {
    if (!isAuthenticated()) { window.location.href = '/'; return false; }
    return true;
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const config = {
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        ...options
    };
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        if (response.status === 401) { logout(); return null; }
        if (!response.ok) throw new Error(data.error || 'Error en la solicitud');
        return data;
    } catch (error) {
        throw error;
    }
}

const api = {
    login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => apiRequest('/auth/me'),
    // Productos
    getProductos: (params = '') => apiRequest(`/productos${params ? '?' + params : ''}`),
    getProducto: (id) => apiRequest(`/productos/${id}`),
    createProducto: (data) => apiRequest('/productos', { method: 'POST', body: JSON.stringify(data) }),
    updateProducto: (id, data) => apiRequest(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProducto: (id) => apiRequest(`/productos/${id}`, { method: 'DELETE' }),
    getAlertas: () => apiRequest('/productos/alertas'),
    // Categorías
    getCategorias: () => apiRequest('/categorias'),
    createCategoria: (data) => apiRequest('/categorias', { method: 'POST', body: JSON.stringify(data) }),
    updateCategoria: (id, data) => apiRequest(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategoria: (id) => apiRequest(`/categorias/${id}`, { method: 'DELETE' }),
    // Ventas
    getVentas: (params = '') => apiRequest(`/ventas${params ? '?' + params : ''}`),
    getVenta: (id) => apiRequest(`/ventas/${id}`),
    createVenta: (data) => apiRequest('/ventas', { method: 'POST', body: JSON.stringify(data) }),
    // Dashboard
    getStats: () => apiRequest('/dashboard/stats')
};

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-hide'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
}

function formatCurrency(amount) { return 'S/ ' + parseFloat(amount).toFixed(2); }
function formatDate(dateStr) { return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function formatDateTime(dateStr) { return new Date(dateStr).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
