import { API_BASE_URL } from './config.js';
import { showToast } from './main.js';

export const AUTH_URL = `${API_BASE_URL}/auth`;
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) return showToast(`Error: ${result.message || 'Error desconocido.'}`);

            showToast(result.message || 'Registro exitoso.');
            window.location.href = 'index.html';
        } catch (error) {
            showToast('Error de conexión con el servidor.');
        }
    });
}

export function handleLoginForm() {
    const form = document.querySelector('#login-form');
    if (!form) return;
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        if (data.email && !isValidEmail(data.email)) {
            return showToast("Por favor, introduce un correo válido.");
        }
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Iniciando...';
        }

        try {
            const response = await fetch(`${AUTH_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            if (!response.ok) {
                if (response.status === 403) {
                    showToast(result.message || 'Tu cuenta no ha sido verificada.');
                } else {
                    showToast(result.message || 'Credenciales incorrectas.');
                }
                return;
            }
            showToast('Inicio de sesión exitoso.');
            window.location.href = 'library.html';

        } catch (error) {
            showToast('Error de conexión con el servidor.');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Log In';
            }
        }
    });
}

export function handleLogout() {
    fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
    }).finally(() => {
        window.location.href = 'index.html';
    });
}

export async function checkSession() {
    try {
        const response = await fetch(`${AUTH_URL}/me`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = 'index.html';
            return null;
        }

        return await response.json();
    } catch (error) {
        window.location.href = 'index.html';
        return null;
    }
}