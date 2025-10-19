import { showToast } from './main.js';
import { API_BASE_URL } from './config.js';
import { handleLogout } from './auth.js';
import { getProfilePicUrl } from './utils.js';

export const NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;
export const USERS_URL = `${API_BASE_URL}/users`;

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
        badge.textContent = notifications.length || '';
        badge.style.display = notifications.length > 0 ? 'block' : 'none';
        notificationIcon.onclick = async () => {
            showNotificationBox(notifications);
            try {
                await Promise.all(notifications.map(notif => 
                    fetch(`${NOTIFICATIONS_URL}/${notif.id}/read`, {
                        method: 'PUT',
                        credentials: 'include'
                    })
                ));
                badge.textContent = '';
                badge.style.display = 'none';
            } catch (error) {
                console.error('Error al marcar notificaciones como leídas:', error);
            }
        };
        } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        badge.style.display = 'none';
    }
}

function showNotificationBox(notifications, isMobile = false) {
    const existingBox = document.getElementById('notification-box');
    if (existingBox) existingBox.remove();

    const notificationBox = document.createElement('div');
    notificationBox.id = 'notification-box';
    notificationBox.className = 'card p-3 notification-box';

    if (isMobile) {
        // Posición para móvil: debajo de los botones en el offcanvas
        const offcanvasBody = document.querySelector('.offcanvas-body');
        if (offcanvasBody) {
            offcanvasBody.appendChild(notificationBox);
            Object.assign(notificationBox.style, {
                width: '100%',
                marginTop: '1rem',
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                borderRadius: '12px',
                backgroundColor: 'var(--color-surface)',
            });
        }
    } else {

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
        document.body.appendChild(notificationBox);
    }

    if (notifications.length > 0) {
        notificationBox.innerHTML = `
            <h5 style="color: var(--color-text-primary); margin-bottom: 10px;">Notificaciones recientes:</h5>
            <ul id="notification-list" class="list-group list-group-flush"></ul>
        `;
        const notificationList = notificationBox.querySelector('#notification-list');

        notifications.forEach(notif => {
            const senderPic = getProfilePicUrl(notif.sender_profile_pic);
            const senderName = notif.sender_name || 'Usuario';
            const itemHTML = `
                <li class="list-group-item d-flex align-items-center gap-2 notification-item"
                    style="border-radius: 12px; background-color: var(--color-surface); margin-bottom: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); cursor: pointer;"
                    onclick="handleNotificationClick('${notif.id}', '${notif.type}', ${notif.related_id})">
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
        `;
    }

    const closeBox = (e) => {
        if (!notificationBox.contains(e.target)) {
            if (isMobile) {
                notificationBox.remove();
            } else {
                document.body.removeChild(notificationBox);
            }
            document.removeEventListener('click', closeBox);
        }
    };
    setTimeout(() => document.addEventListener('click', closeBox), 0);
}

async function handleNotificationClick(notificationId, type, relatedId) {
    if (!relatedId) {
        showToast('❌ No se puede redirigir: ID relacionado faltante.');
        return;
    }
    try {
        await fetch(`${NOTIFICATIONS_URL}/${notificationId}/read`, {
            method: 'PUT',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
    }
    // Redirigir
    if (type === 'reply') window.location.href = `comments.html?comment_id=${relatedId}`;
    else if (type === 'book_upload') window.location.href = `comments.html?book_id=${relatedId}`;
    else showToast('❌ Tipo de notificación desconocido.');
}

document.addEventListener('click', async (e) => {
    const notifIcon = e.target.closest('#mobile-notification-icon');
    if (!notifIcon) return;

    e.preventDefault();
    e.stopPropagation();

    console.log('✅ Click en icono de notificaciones móviles');

    try {
        const response = await fetch(NOTIFICATIONS_URL, { credentials: 'include' });
        if (!response.ok) return;

        const notifications = await response.json();
        const badge = document.getElementById('mobile-notification-badge');

        if (badge) {
            badge.textContent = notifications.length || '';
            badge.style.display = notifications.length > 0 ? 'block' : 'none';
        }
        showNotificationBox(notifications, true);
        await Promise.all(
            notifications.map((n) =>
                fetch(`${NOTIFICATIONS_URL}/${n.id}/read`, {
                    method: 'PUT',
                    credentials: 'include',
                })
            )
        );

        if (badge) {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    } catch (err) {
        console.error('❌ Error al manejar notificaciones móviles:', err);
    }
});


const limit = 5;

export async function handleProfilePage() {
    const contentContainer = document.getElementById('profile-content-container');
    try {
        const user = await loadUserProfile();
        if (!user) return;

        setupEventListeners(user, contentContainer);
        displaySavedBooks(user.id, contentContainer, 1);

    } catch (error) {
        if (contentContainer) {
            contentContainer.innerHTML = `<p class="text-danger text-center mt-3">Error al cargar el perfil.</p>`;
        }
    }
}

async function loadUserProfile() {
    const response = await fetch(`${USERS_URL}/me`, { credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo obtener la información del perfil.');

    const user = await response.json();

    document.querySelector('.profile-name').textContent = user.full_name || 'Nombre no disponible';
    document.querySelector('.profile-email').textContent = user.email || 'Sin correo';
    document.querySelector('.profile-role').textContent = `Rol: ${user.role || 'user'}`;

    const profileUrl = getProfilePicUrl(user.profile_pic);

    document.querySelectorAll('.profile-pic-header, #profile-pic-main').forEach(img => img.src = profileUrl);

    return user;
}

function setupEventListeners(user, contentContainer) {
    document.getElementById('show-saved-books')?.addEventListener('click', () => displaySavedBooks(user.id, contentContainer, 1));
    document.getElementById('show-activity')?.addEventListener('click', () => displayUserActivity(contentContainer, 1));

    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
        document.getElementById('edit-profile-form').style.display = 'block';
        contentContainer.style.display = 'none';
    });
    document.getElementById('edit-profile-form-element')?.addEventListener('submit', handleProfileUpdate);

    const profilePicWrapper = document.getElementById('profile-pic-wrapper');
    if (profilePicWrapper) {
        profilePicWrapper.addEventListener('click', () => document.getElementById('profile-pic-input')?.click());
        document.getElementById('profile-pic-input')?.addEventListener('change', handleProfilePicUpload);
    }

    document.getElementById('logout-button')?.addEventListener('click', handleLogout);
}

async function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_pic', file);

    try {
        const res = await fetch(`${USERS_URL}/me/profile-pic`, {
            method: 'PATCH',
            credentials: 'include',
            body: formData
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al subir la imagen.');
        }

        const data = await res.json();
        showToast('Imagen de perfil actualizada.');

        const newUrl = getProfilePicUrl(data.profile_pic);
        document.querySelectorAll('.profile-pic-header, #profile-pic-main').forEach(img => img.src = newUrl);

    } catch (error) {
        showToast(`Error: ${error.message}`);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const updatedData = {
        email: document.getElementById('edit-email')?.value,
        password: document.getElementById('edit-password')?.value || null,
        current_password: document.getElementById('current-password')?.value
    };

    if (!updatedData.current_password) {
        return showToast('Debes ingresar tu contraseña actual para guardar los cambios.');
    }

    try {
        const res = await fetch(`${USERS_URL}/me`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'No se pudo actualizar el perfil.');
        }

        showToast('Perfil actualizado exitosamente.');
        setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
        showToast(`Error: ${error.message}`);
    }
}

async function displaySavedBooks(userId, container, page) {
    container.innerHTML = '<p class="text-center">Cargando libros guardados...</p>';
    try {
        const response = await fetch(`${USERS_URL}/${userId}/bookmarks?page=${page}&limit=${limit}`, { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudieron cargar los libros guardados.');

        const data = await response.json();
        container.innerHTML = '<h4>📑 Libros Guardados</h4>';

        const books = data.books || [];
        if (books.length === 0) {
            container.innerHTML += '<p class="text-muted">No tienes libros guardados.</p>';
            return;
        }

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'card book-card mb-3 hover-card'; 
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${book.title}</h5>
                    <p class="card-text">Por ${book.author || 'Autor desconocido'}</p>
                    <a href="comments.html?book_id=${book.id}" class="stretched-link"></a>
                </div>
            `;
            container.appendChild(card);
        });

        renderPagination(container, data.totalPages || 1, page, (newPage) => displaySavedBooks(userId, container, newPage));

    } catch (error) {
        container.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}
async function displayUserActivity(container, page) {
    container.innerHTML = '<p class="text-center">Cargando actividad...</p>';
    try {
        const response = await fetch(`${USERS_URL}/me/activity?page=${page}&limit=${limit}`, { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudo cargar la actividad.');

        const data = await response.json();
        container.innerHTML = '<h4>Mi Actividad</h4>';

        const activities = data.activities || [];
        if (activities.length === 0) {
            container.innerHTML += '<p class="text-muted">Aún no tienes actividad registrada.</p>';
            return;
        }

        activities.forEach(item => {
            let link = '#', label = '', contentHTML = '';
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
                    link = `comments.html?book_id=${item.related_id}`;
                    label = '📚 Libro subido';
                    break;
                default:
                    label = '🕓 Actividad reciente';
            }

            // Si no hay detalles, mostramos una imagen
            if (!item.details || item.details === 'Imagen') {
                contentHTML = `<img src="path_to_default_image.png" alt="Imagen" class="activity-img">`;
            } else {
                contentHTML = `<p class="card-text">${item.details}</p>`;
            }

            const card = document.createElement('div');
            card.className = 'card activity-card mb-3 hover-card';
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${label}</h5>
                    ${contentHTML}
                    <small class="text-muted">${new Date(item.date).toLocaleString()}</small>
                    <a href="${link}" class="stretched-link"></a>
                </div>
            `;
            container.appendChild(card);
        });

        renderPagination(container, data.totalPages || 1, page, (newPage) => displayUserActivity(container, newPage));

    } catch (error) {
        container.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

function renderPagination(container, totalPages, currentPage, onPageClick) {
    if (totalPages <= 1) return;
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'd-flex justify-content-center mt-3';
    paginationDiv.innerHTML = `<button class="btn btn-outline-primary me-2" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button><span class="align-self-center">Página ${currentPage} de ${totalPages}</span><button class="btn btn-outline-primary ms-2" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
    container.appendChild(paginationDiv);
    paginationDiv.querySelector('button:first-child').addEventListener('click', () => onPageClick(currentPage - 1));
    paginationDiv.querySelector('button:last-child').addEventListener('click', () => onPageClick(currentPage + 1));
}
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
            console.error('Error al cargar imagen de perfil en header:', error);}
        }
        
window.handleNotificationClick = handleNotificationClick;
