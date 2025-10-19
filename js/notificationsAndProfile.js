import { showToast } from './main.js';
import { API_BASE_URL } from './config.js';
import { handleLogout } from './auth.js';
import { getProfilePicUrl } from './utils.js';

export const NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;
export const USERS_URL = `${API_BASE_URL}/users`;

// ===============================
// 🔔 Cargar Notificaciones
// ===============================
export async function loadNotifications() {
    const badge = document.getElementById('notification-badge');
    const notificationIcon = document.getElementById('notification-icon');
    if (!badge || !notificationIcon) return;

    try {
        const response = await fetch(NOTIFICATIONS_URL, { credentials: 'include' });
        if (!response.ok) {
            badge.style.display = 'none';
            return;
        }

        const notifications = await response.json();
        console.log('🔔 Notificaciones recibidas:', notifications);

        badge.textContent = notifications.length || '';
        badge.style.display = notifications.length > 0 ? 'block' : 'none';

        // Evitar duplicar listeners
        notificationIcon.onclick = () => showNotificationBox(notifications);
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        badge.style.display = 'none';
    }
}

// ===============================
// 💬 Mostrar cuadro de notificaciones
// ===============================
function showNotificationBox(notifications) {
    const existingBox = document.getElementById('notification-box');
    if (existingBox) existingBox.remove();

    const notificationBox = document.createElement('div');
    notificationBox.id = 'notification-box';
    notificationBox.className = 'card p-3 notification-box';
    Object.assign(notificationBox.style, {
        position: 'fixed',
        top: '10%',
        right: '10px',
        width: '350px',
        zIndex: '1000',
        maxHeight: '500px',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        borderRadius: '12px',
        backgroundColor: 'var(--color-surface)',
    });

    if (notifications.length > 0) {
        notificationBox.innerHTML = `
            <h5 style="color: var(--color-text-primary); margin-bottom: 10px;">Notificaciones recientes:</h5>
            <ul id="notification-list" class="list-group list-group-flush"></ul>
            <button onclick="document.body.removeChild(document.getElementById('notification-box'))" 
                class="btn btn-primary mt-2 w-100">Cerrar</button>
        `;
        const notificationList = notificationBox.querySelector('#notification-list');

        notifications.forEach(notif => {
            const senderPic = getProfilePicUrl(notif.sender_profile_pic);
            const senderName = notif.sender_name || 'Usuario';
            const itemHTML = `
                <li class="list-group-item d-flex align-items-center gap-2 notification-item"
                    style="border-radius: 12px; background-color: var(--color-surface); margin-bottom: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); cursor: pointer;"
                    onclick="handleNotificationClick('${notif.type}', ${notif.related_id})">
                    <img src="${senderPic}" alt="Perfil" class="rounded-circle" width="40" height="40">
                    <div class="flex-grow-1">
                        <strong style="color: var(--color-text-primary);">${senderName}</strong>: 
                        <span style="color: var(--color-text-secondary);">${notif.message || 'Mensaje no disponible'}</span>
                        <div style="font-size: 0.75rem; color: var(--color-text-tertiary);">
                            ${new Date(notif.created_at).toLocaleString()}
                        </div>
                    </div>
                </li>
            `;
            notificationList.insertAdjacentHTML('beforeend', itemHTML);
        });
    } else {
        notificationBox.innerHTML = `
            <h5 style="color: var(--color-text-primary);">Notificaciones</h5>
            <p style="color: var(--color-text-secondary);">Por el momento no tienes notificaciones.</p>
            <button onclick="document.body.removeChild(document.getElementById('notification-box'))" 
                class="btn btn-primary mt-2 w-100">Cerrar</button>
        `;
    }

    document.body.appendChild(notificationBox);
}

// ===============================
// 🔗 Manejar clic en notificación
// ===============================
function handleNotificationClick(type, relatedId) {
    if (!relatedId) {
        showToast('❌ No se puede redirigir: ID relacionado faltante.');
        return;
    }
    if (type === 'reply') window.location.href = `comments.html?comment_id=${relatedId}`;
    else if (type === 'book_upload') window.location.href = `comments.html?book_id=${relatedId}`;
    else showToast('❌ Tipo de notificación desconocido.');
}

// ===============================
// 👤 Perfil de usuario
// ===============================
export async function handleProfilePage() {
    const emailEl = document.querySelector('.profile-email');
    const roleEl = document.querySelector('.profile-role');
    const fullNameEl = document.querySelector('.profile-name');
    const activityContainer = document.getElementById('activity-container');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editForm = document.getElementById('edit-profile-form-element');
    const logoutButton = document.getElementById('logout-button');
    const profilePicHeader = document.getElementById('profile-pic-header');
    const profilePicMain = document.getElementById('profile-pic-main');
    const cameraOverlay = document.getElementById('camera-overlay');
    const profilePicWrapper = document.getElementById('profile-pic-wrapper');

    try {
        const response = await fetch(`${USERS_URL}/me`, { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudo obtener la información del perfil.');
        const user = await response.json();

        if (fullNameEl) fullNameEl.textContent = user.full_name || 'Nombre no disponible';
        if (emailEl) emailEl.textContent = user.email || 'Sin correo';
        if (roleEl) roleEl.textContent = `Rol: ${user.role || 'user'}`;

        const profileUrl = getProfilePicUrl(user.profile_pic);
        if (profilePicHeader) profilePicHeader.src = profileUrl;
        if (profilePicMain) profilePicMain.src = profileUrl;

        // Subir nueva imagen
        if (cameraOverlay && profilePicWrapper) {
            profilePicWrapper.addEventListener('mouseenter', () => cameraOverlay.style.display = 'block');
            profilePicWrapper.addEventListener('mouseleave', () => cameraOverlay.style.display = 'none');

            cameraOverlay.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('profile_pic', file);
                    try {
                        const res = await fetch(`${USERS_URL}/me/profile-pic`, {
                            method: 'PATCH',
                            credentials: 'include',
                            body: formData
                        });
                        if (res.ok) {
                            const data = await res.json();
                            showToast('Imagen de perfil actualizada exitosamente.');
                            const newUrl = getProfilePicUrl(data.profile_pic);
                            if (profilePicMain) profilePicMain.src = newUrl;
                            if (profilePicHeader) profilePicHeader.src = newUrl;
                        } else showToast('Error al actualizar la imagen de perfil.');
                    } catch {
                        showToast('Error de conexión al actualizar la imagen.');
                    }
                };
                input.click();
            });
        }

        // Actividad del usuario
        const activityResponse = await fetch(`${USERS_URL}/me/activity`, { credentials: 'include' });
        if (activityContainer) activityContainer.innerHTML = '';
        if (activityResponse.ok) {
            const activity = await activityResponse.json();
            const comments = Array.isArray(activity.comments) ? activity.comments : [];
            const books = Array.isArray(activity.books) ? activity.books : [];
            const allActivities = [
                ...comments.map(c => ({ type: c.parent_id ? 'reply' : 'comment', related_id: c.id, book_id: c.book_id, details: c.content, date: c.created_at })),
                ...books.map(b => ({ type: 'book_upload', related_id: b.id, details: b.title, date: b.created_at }))
            ];
            allActivities.slice(0, 10).forEach(item => {
                let link = '#', label = '';
                switch (item.type) {
                    case 'comment':
                        link = `comments.html?book_id=${item.book_id}&comment_id=${item.related_id}`;
                        label = '💬 Comentario realizado';
                        break;
                    case 'reply':
                        link = `comments.html?comment_id=${item.related_id}`;
                        label = '↩️ Respuesta a un comentario';
                        break;
                    case 'book_upload':
                        link = `book_detail.html?book_id=${item.related_id}`;
                        label = '📚 Libro subido';
                        break;
                    default:
                        label = '🕓 Actividad reciente';
                }
                const html = `<a href="${link}" class="activity-card list-group-item list-group-item-action d-flex flex-column mb-2 p-3"
                              style="border-radius:12px;background-color:var(--color-surface);box-shadow:0 4px 12px rgba(0,0,0,0.25);text-decoration:none;">
                              <h5 class="mb-1" style="color: var(--color-text-primary);">${label}</h5>
                              <p class="mb-1" style="color: var(--color-text-secondary);">${item.details || 'Sin detalles'}</p>
                              <small class="text-muted">${new Date(item.date).toLocaleString()}</small>
                              </a>`;
                activityContainer.insertAdjacentHTML('beforeend', html);
            });
        } else if (activityContainer) activityContainer.innerHTML = `<p class="text-danger text-center mt-3">Error al obtener actividad.</p>`;

        if (editProfileBtn) editProfileBtn.addEventListener('click', () => {
            editProfileForm.style.display = 'block';
            if (activityContainer) activityContainer.style.display = 'none';
        });

        if (editForm) editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                email: document.getElementById('edit-email').value,
                password: document.getElementById('edit-password')?.value || '',
                current_password: document.getElementById('current-password')?.value || ''
            };
            try {
                const res = await fetch(`${USERS_URL}/me`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                if (res.ok) {
                    showToast('Perfil actualizado exitosamente.');
                    setTimeout(() => window.location.reload(), 1500);
                } else showToast('Error al actualizar el perfil.');
            } catch {
                showToast('Error de conexión al actualizar.');
            }
        });

        if (logoutButton) logoutButton.addEventListener('click', handleLogout);

    } catch {
        if (activityContainer) activityContainer.innerHTML = `<p class="text-danger text-center mt-3">Error al cargar los datos del perfil.</p>`;
    }
}

// ===============================
// 👤 Cargar perfil en header
// ===============================
export async function loadHeaderProfile() {
    const headerProfileImg = document.getElementById('profile-pic-header');
    if (!headerProfileImg) return;

    try {
        const response = await fetch(`${USERS_URL}/me`, { credentials: 'include' });
        if (!response.ok) return;
        const user = await response.json();
        const profileUrl = getProfilePicUrl(user.profile_pic);
        headerProfileImg.src = profileUrl;
        headerProfileImg.alt = 'Imagen de perfil';
        headerProfileImg.onerror = () => headerProfileImg.src = getProfilePicUrl(null);
    } catch (error) {
        console.error('Error al cargar imagen de perfil en header:', error);
    }
}

window.handleNotificationClick = handleNotificationClick;
