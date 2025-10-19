import { API_BASE_URL } from './config.js'; 
import { showToast } from './main.js'; 
import { USERS_URL } from './notificationsAndProfile.js'; 

// -------------------- CONSTANTES --------------------
export const AUTH_URL = `${API_BASE_URL}/auth`;
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// -------------------- REGISTRO --------------------
export function handleRegisterForm() {
    const form = document.querySelector('#register-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.confirmPassword) delete data.confirmPassword;

        if (data.email && !isValidEmail(data.email)) {
            return showToast("Por favor, introduce una dirección de correo electrónico válida.");
        }

        try {
            const response = await fetch(`${AUTH_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            if (!response.ok) return showToast(`Error: ${result.message || 'Error desconocido.'}`);

            showToast(result.message || 'Registro exitoso.');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            showToast('Error de conexión con el servidor.');
        }
    });
}

// -------------------- LOGIN --------------------
export function handleLoginForm() {
    const form = document.querySelector('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        if (data.email && !isValidEmail(data.email)) {
            return showToast("Por favor, introduce una dirección de correo electrónico válida.");
        }

        try {
            const response = await fetch(`${AUTH_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            if (!response.ok) return showToast(`Error: ${result.message || 'Error desconocido.'}`);

            showToast('Inicio de sesión exitoso.');
            window.location.href = 'library.html';
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            showToast('Error de conexión con el servidor.');
        }
    });
}

// -------------------- LOGOUT --------------------
export function handleLogout() {
    fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        window.location.href = 'index.html';
    });
}

// -------------------- OBTENER USUARIO AUTENTICADO --------------------
export async function getCurrentUser() {
    try {
        const response = await fetch(`${USERS_URL}/me`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            console.warn('⚠️ No se pudo obtener el usuario actual:', response.status);
            return null;
        }

        const user = await response.json();
        console.log('👤 Usuario actual obtenido:', user);
        return user;
    } catch (error) {
        console.error('❌ Error obteniendo el usuario actual:', error);
        return null;
    }
}
