import { API_BASE_URL , STATIC_BASE_URL} from './config.js';
import { handleRegisterForm, handleLoginForm } from './auth.js';
import { loadNotifications, handleProfilePage, loadHeaderProfile } from './notificationsAndProfile.js';
import { loadBooks, handleBookUpload } from './books.js';
import { handleCommentsPage } from './comments.js';

/**
 * Muestra un mensaje temporal (toast) en la pantalla.
 * @param {string} message - El mensaje a mostrar.
 */
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

/**
 * Función para comprobar si el usuario tiene sesión activa.
 * Llama al backend para verificar cookie HTTP-only.
 */
async function checkSession() {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (!res.ok) {
            window.location.href = 'index.html';
            return null;
        }
        const user = await res.json();
        return user;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        window.location.href = 'index.html';
        return null;
    }
}

/**
 * Event Listener principal que se ejecuta cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const pagePath = window.location.pathname;

    // Páginas públicas
    if (pagePath.includes('register.html')) {
        handleRegisterForm();
        return;
    } else if (pagePath.includes('index.html')) {
        handleLoginForm();
        return;
    }

    // Verificar sesión activa en backend
    const user = await checkSession();
    if (!user) return;

    // Carga elementos globales del header
    try {
        loadNotifications();
        loadHeaderProfile(user);
    } catch (error) {
        console.error('Error al cargar notificaciones o perfil del header:', error);
        showToast('Error al cargar elementos del header.');
    }

    // Enrutador principal basado en la ruta de la página actual
    if (pagePath.includes('library.html')) {
        loadBooks(user);
    } else if (pagePath.includes('admin-dashboard.html')) {
        import('./admin.js').then(module => module.handleAdminDashboard(user));
    } else if (pagePath.includes('upload.html')) {
        handleBookUpload(user);
    } else if (pagePath.includes('comments.html')) {
        handleCommentsPage(user);
    } else if (pagePath.includes('profile.html')) {
        handleProfilePage(user);
    }

    // Botón de logout global
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
                console.error('Error al cerrar sesión:', error);
                showToast('Error al cerrar sesión.');
            }
        });
    }
});
