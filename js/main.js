import { API_BASE_URL, STATIC_BASE_URL } from './config.js';
import { handleRegisterForm, handleLoginForm } from './auth.js';
import { loadNotifications, handleProfilePage, loadHeaderProfile } from './notificationsAndProfile.js';
import { loadBooks, handleBookUpload } from './books.js';
import { handleCommentsPage } from './comments.js';

export function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#007bff';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '10px';
        toast.style.fontSize = '14px';
        toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}

async function checkSession() {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (!res.ok) {
            window.location.href = 'index.html';
            return null;
        }
        return await res.json();
    } catch (error) {
        window.location.href = 'index.html';
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const pagePath = window.location.pathname;

    if (pagePath.includes('register.html')) {
        handleRegisterForm();
        return;
    } else if (pagePath.includes('index.html')) {
        handleLoginForm();
        return;
    }

    const user = await checkSession();
    if (!user) return;

    if (user.role === 'admin') {
        const adminBtn = document.getElementById('admin-dashboard-btn');
        if (adminBtn) {
            adminBtn.style.display = 'block';
            adminBtn.addEventListener('click', () => window.location.href = 'admin-dashboard.html');
        }
    }

    document.querySelectorAll('.upload-book-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = 'upload.html';
        });
    });

    try {
        loadNotifications();
        loadHeaderProfile(user);
    } catch (error) {
        showToast('Error al cargar elementos del header.');
    }

    if (pagePath.includes('library.html')) {
        loadBooks(user);
    } else if (pagePath.includes('admin-dashboard.html')) {
        import('./admin-dashboard.js').then(module => module.handleAdminDashboard(user));
    } else if (pagePath.includes('upload.html')) {
        handleBookUpload(user);
    } else if (pagePath.includes('comments.html')) {
        handleCommentsPage(user);
    } else if (pagePath.includes('profile.html')) {
        handleProfilePage(user);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = 'index.html';
            } catch (error) {
                showToast('Error al cerrar sesión.');
            }
        });
    }
});