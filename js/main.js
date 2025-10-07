const API_BASE_URL = 'http://localhost:3000/api';

//HELPERS
const getToken = () => localStorage.getItem('authToken');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- ROUTER PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const pagePath = window.location.pathname;

    // Rutas públicas: si el usuario ya está logueado, lo redirige a la biblioteca.
    if (pagePath.includes('index.html') || pagePath.includes('register.html')) {
        if (getToken()) {
            window.location.href = 'library.html';
            return;
        }
        handleAuthForms(pagePath.includes('register.html') ? 'register' : 'login');
    }

    // Rutas protegidas: si no hay token, lo redirige a la página de login.
    if (!getToken() && !pagePath.includes('index.html') && !pagePath.includes('register.html')) {
        window.location.href = 'index.html';
        return;
    }

    // Si el usuario está logueado, cargamos las notificaciones en cualquier página.
    loadNotifications();

    // Selector para ejecutar la función de la página correspondiente.
    if (pagePath.includes('library.html')) {
        loadBooks();
    } else if (pagePath.includes('admin-dashboard.html')) {
        handleAdminDashboard();
    } else if (pagePath.includes('upload.html')) {
        handleBookUpload();
    } else if (pagePath.includes('comments.html')) {
        handleCommentsPage();
    } else if (pagePath.includes('profile.html')) {
        handleProfilePage();
    }
});

// --- LÓGICA DE AUTENTICACIÓN ---
function handleLogout() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

function handleAuthForms(mode) {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const endpoint = mode === 'register' ? `${API_BASE_URL}/auth/register` : `${API_BASE_URL}/auth/login`;

        if (data.email && !isValidEmail(data.email)) {
            return alert("Por favor, introduce una dirección de correo electrónico válida.");
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                if (mode === 'login') {
                    localStorage.setItem('authToken', result.token);
                    window.location.href = 'library.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            alert('Error de conexión con el servidor.');
        }
    });
}

// --- LÓGICA DE NOTIFICACIONES ---
async function loadNotifications() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            console.error('No se pudieron cargar las notificaciones. Estado:', response.status);
            return;
        }

        const notifications = await response.json();

        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error de conexión al cargar notificaciones:', error);
    }
}


// --- LÓGICA DE PÁGINAS ---

async function loadBooks() {
    const mainContainer = document.querySelector('.library-container');
    if (!mainContainer) return;
    mainContainer.innerHTML = '<p class="text-center">Cargando libros...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/books`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('No se pudieron cargar los libros.');

        const books = await response.json();

        if (books.length === 0) {
            mainContainer.innerHTML = '<p class="text-center">Aún no hay libros en la biblioteca.</p>';
            return;
        }

        mainContainer.innerHTML = '';
        books.forEach(book => {
            const bookCardHTML = `
            <div class="card book-card mb-4">
                <div class="card-body p-4 d-flex">
                    <div class="upvote-section text-center me-4">
                        <a href="#" class="text-decoration-none upvote-button" data-book-id="${book.id}">
                            <span class="material-symbols-outlined">arrow_upward</span>
                        </a>
                        <span class="fw-bold d-block" id="upvotes-count-${book.id}">${((book.upvotes || 0) / 1000).toFixed(1)}K</span>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="card-title text-uppercase">${book.title}</h5>
                        <p class="card-author text-muted mb-2">Por ${book.author}</p>
                        <p class="card-synopsis">${book.synopsis || ''}</p>
                        <div class="action-buttons mb-3">
                            <a href="#" class="btn btn-primary btn-sm"><span class="material-symbols-outlined" style="font-size: 16px;">download</span> Descargar PDF</a>
                        </div><hr>
                        <div class="card-footer-actions d-flex justify-content-between align-items-center">
                            <a href="comments.html?book_id=${book.id}" class="comments-link">Ver comentarios</a>
                            <div>
                                <a href="#" class="action-link me-3"><span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir</a>
                                <a href="#" class="action-link"><span class="material-symbols-outlined" style="font-size: 16px;">bookmark</span> Guardar</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            mainContainer.insertAdjacentHTML('beforeend', bookCardHTML);
        });
        bindUpvoteEvents();
    } catch (error) {
        mainContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
}

function handleBookUpload() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            const response = await fetch(`${API_BASE_URL}/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (response.ok) {
                alert('¡Libro publicado con éxito!');
                window.location.href = 'library.html';
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert('Error de conexión al subir el libro.');
        }
    });
}

async function handleProfilePage() {
    document.getElementById('logout-button')?.addEventListener('click', handleLogout);

    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('No se pudo cargar la información del perfil.');

        const user = await response.json();

        const nameElement = document.querySelector('.profile-name');
        const emailElement = document.querySelector('.profile-email');

        if(nameElement) nameElement.textContent = user.full_name;
        if(emailElement) emailElement.textContent = user.email;

    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

async function handleCommentsPage() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book_id');
    const bookContainer = document.getElementById('book-detail-container');
    const commentsContainer = document.querySelector('.comments-list');
    const commentForm = document.getElementById('newCommentForm');

    if (!bookId || !bookContainer || !commentsContainer || !commentForm) {
        document.body.innerHTML = '<h1>Error: Faltan elementos en la página o no se especificó un libro.</h1>';
        return;
    }
    
    try {
        const [bookRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/books/${bookId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            fetch(`${API_BASE_URL}/books/${bookId}/comments`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
        ]);

        if (!bookRes.ok || !commentsRes.ok) throw new Error('No se pudo cargar la información del libro o los comentarios.');

        const book = await bookRes.json();
        const comments = await commentsRes.json();

        bookContainer.innerHTML = `<div class="card book-card mb-4"><div class="card-body p-4"><h2>${book.title}</h2><p class="text-muted">Por ${book.author}</p><p>${book.synopsis || ''}</p></div></div>`;
        
        commentsContainer.innerHTML = '';
        if (comments.length > 0) {
            comments.forEach(comment => renderComment(comment, commentsContainer, 'beforeend'));
        } else {
            commentsContainer.innerHTML = '<p>Aún no hay comentarios. ¡Sé el primero!</p>';
        }

    } catch (error) {
        bookContainer.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const commentTextarea = document.getElementById('newCommentText');
        const content = commentTextarea.value.trim();
        if (!content) return;

        try {
            const response = await fetch(`${API_BASE_URL}/books/${bookId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ content })
            });
            const newComment = await response.json();
            
            if (response.ok) {
                if(commentsContainer.querySelector('p')) commentsContainer.innerHTML = '';
                renderComment(newComment, commentsContainer, 'afterbegin');
                commentTextarea.value = '';
            } else {
                alert(`Error: ${newComment.message}`);
            }
        } catch (error) {
            alert('Error de conexión al publicar el comentario.');
        }
    });
}

function renderComment(comment, container, position) {
    const commentHTML = `
        <div class="d-flex align-items-start mb-3 border-bottom pb-3">
            <span class="material-symbols-outlined fs-3 me-3 text-secondary">account_circle</span>
            <div class="flex-grow-1">
                <h6 class="fw-bold mb-1">${comment.full_name} <small class="text-muted fw-normal"> - ${new Date(comment.created_at).toLocaleString()}</small></h6>
                <p class="mb-1">${comment.content}</p>
            </div>
        </div>`;
    container.insertAdjacentHTML(position, commentHTML);
}

function bindUpvoteEvents() {
    document.querySelectorAll('.upvote-button').forEach(button => {
        if (button.dataset.listenerAttached) return;
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const bookId = button.dataset.bookId;
            
            try {
                const response = await fetch(`${API_BASE_URL}/books/${bookId}/upvote`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const result = await response.json();

                if (response.ok) {
                    const countElement = document.getElementById(`upvotes-count-${bookId}`);
                    countElement.textContent = `${(result.newUpvotes / 1000).toFixed(1)}K`;
                    button.classList.add('voted');
                    button.style.pointerEvents = 'none';
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                alert('Error de conexión al votar.');
            }
        });
        button.dataset.listenerAttached = 'true';
    });
}

async function handleAdminDashboard() {
    const userTableBody = document.getElementById('user-management-table-body');
    if (!userTableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('No tienes permiso para ver esta página.');
        
        const users = await response.json();
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const userRowHTML = `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}">${user.role.toUpperCase()}</span></td>
                    <td><button class="btn btn-sm btn-outline-primary toggle-role-btn" data-user-id="${user.id}" data-current-role="${user.role}">${user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}</button></td>
                </tr>`;
            userTableBody.insertAdjacentHTML('beforeend', userRowHTML);
        });
        assignRoleToggleEvents();
    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

function assignRoleToggleEvents() {
    document.querySelectorAll('.toggle-role-btn').forEach(button => {
        if(button.dataset.listenerAttached) return;
        button.addEventListener('click', async (event) => {
            const userId = event.target.dataset.userId;
            const currentRole = event.target.dataset.currentRole;
            const newRole = currentRole === 'admin' ? 'user' : 'admin';

            if (!confirm(`¿Seguro que quieres cambiar el rol del usuario ${userId} a "${newRole}"?`)) return;

            try {
                const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ role: newRole })
                });
                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    handleAdminDashboard();
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                alert('Error de conexión al intentar cambiar el rol.');
            }
        });
        button.dataset.listenerAttached = 'true';
    });
}