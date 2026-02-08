const API_BASE_URL = 'http://localhost:3000/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.clearToken();
                window.electronAPI.navigate('login');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        this.setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    }

    async getTransactions(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/transactions?${params}`);
    }

    async createTransaction(data) {
        return await this.request('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateTransaction(id, data) {
        return await this.request(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteTransaction(id) {
        return await this.request(`/transactions/${id}`, {
            method: 'DELETE'
        });
    }

    async confirmTransaction(id) {
        return await this.request(`/transactions/${id}/confirm`, {
            method: 'POST'
        });
    }

    async getStats(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/transactions/stats?${params}`);
    }

    async getAnomalies(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/transactions/anomalies?${params}`);
    }

    async getCategories(scope = null) {
        const params = scope ? `?scope=${scope}` : '';
        return await this.request(`/categories${params}`);
    }

    async createCategory(data) {
        return await this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/audit-logs?${params}`);
    }
}

const api = new API();

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('vi-VN');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    toast.style.animation = 'slideIn 0.3s ease';

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
