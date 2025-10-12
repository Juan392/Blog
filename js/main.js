const API_BASE_URL = 'http://localhost:3000/api/auth';
const BOOKS_URL = 'http://localhost:3000/api/books';
const NOTIFICATIONS_URL = 'http://localhost:3000/api/notifications';

const getToken = () => localStorage.getItem('authToken');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

document.addEventListener('DOMContentLoaded', () => {
    const pagePath = window.location.pathname;

    if (pagePath.includes('register.html')) handleRegisterForm();
    else if (pagePath.includes('index.html')) handleLoginForm();

    if (!getToken() && !pagePath.includes('index.html') && !pagePath.includes('register.html')) {
        window.location.href = 'index.html';
    }

    loadNotifications();

    if (pagePath.includes('library.html')) loadBooks();
    else if (pagePath.includes('admin-dashboard.html')) handleAdminDashboard();
    else if (pagePath.includes('upload.html')) handleBookUpload();
    else if (pagePath.includes('comments.html')) handleCommentsPage();
    else if (pagePath.includes('profile.html')) handleProfilePage();
});

function handleLogout() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

function handleRegisterForm() {
    const form = document.querySelector('#register-form');
    if (!form) return console.log('❌ Formulario de registro no encontrado');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(form).entries());
        if (data.confirmPassword) delete data.confirmPassword;

        if (data.email && !isValidEmail(data.email)) {
            return alert("Por favor, introduce una dirección de correo electrónico válida.");
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(`Error: ${result.message || 'Error desconocido en el registro.'}`);
                return;
            }

            if (result.token) localStorage.setItem('authToken', result.token);
            alert(result.message || 'Registro exitoso.');
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Error de conexión:', error);
            alert('Error de conexión con el servidor.');
        }
    });
}

function handleLoginForm() {
    const form = document.querySelector('#login-form');
    if (!form) return console.log('❌ Formulario de login no encontrado');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(form).entries());

        if (data.email && !isValidEmail(data.email)) {
            return alert("Por favor, introduce una dirección de correo electrónico válida.");
        }

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(`Error: ${result.message || 'Error desconocido en el login.'}`);
                return;
            }

            if (!result.token) {
                alert('El servidor no devolvió un token. Verifica tu backend.');
                return;
            }

            localStorage.setItem('authToken', result.token);
            alert('Inicio de sesión exitoso.');
            window.location.href = 'library.html';

        } catch (error) {
            console.error('Error de conexión:', error);
            alert('Error de conexión con el servidor.');
        }
    });
}

async function loadNotifications() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    try {
        const response = await fetch(NOTIFICATIONS_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            console.warn('No se pudieron obtener notificaciones (404 o sin endpoint)');
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
        console.error('Error al cargar notificaciones:', error);
    }
}

async function loadBooks() {
    const mainContainer = document.querySelector('.library-container');
    if (!mainContainer) return;
    mainContainer.innerHTML = '<p class="text-center">Cargando libros...</p>';

    try {
        const response = await fetch(BOOKS_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('No se pudieron cargar los libros.');
        const books = await response.json();

        if (!books || books.length === 0) {
            mainContainer.innerHTML = '<p class="text-center">Aún no hay libros en la biblioteca.</p>';
            return;
        }

        mainContainer.innerHTML = '';
        books.forEach(book => {
            const upvotes = book.upvotes || 0;
            const commentsCount = book.comments_count || 0;
            const externalButton = book.external_link
                ? `<a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm me-2">
                        <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span> Abrir enlace
                   </a>`
                : '';

            const bookCardHTML = `
                <div class="card book-card mb-4">
                    <div class="card-body p-4 d-flex">
                        <div class="upvote-section text-center me-4">
                            <a href="#" class="text-decoration-none upvote-button" data-book-id="${book.id}">
                                <span class="material-symbols-outlined">arrow_upward</span>
                            </a>
                            <span class="fw-bold d-block" id="upvotes-count-${book.id}">
                                ${(upvotes / 1).toFixed(1)}
                            </span>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="card-title text-uppercase">${book.title}</h5>
                            <p class="card-author text-muted mb-2">Por ${book.author}</p>
                            <p class="card-synopsis">${book.synopsis || ''}</p>
                            <div class="action-buttons mb-3">
                                <a href="#" class="btn btn-primary btn-sm me-2">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Descargar PDF
                                </a>
                                ${externalButton}
                                <a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span> Abrir enlace
                                </a>
                            </div>
                            <div class="book-stats mb-2">
                                <span class="me-3"><strong>${commentsCount}</strong> comentarios</span>
                            </div>
                            <hr>
                            <div class="card-footer-actions d-flex justify-content-between align-items-center">
                                <a href="comments.html?book_id=${book.id}" class="comments-link">Ver comentarios</a>
                                <div>
                                    <a href="#" class="action-link me-3">
                                        <span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir
                                    </a>
                                    <a href="#" class="action-link">
                                        <span class="material-symbols-outlined" style="font-size: 16px;">bookmark</span> Guardar
                                    </a>
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

function bindUpvoteEvents() {
    document.querySelectorAll('.upvote-button').forEach(button => {
        if (button.dataset.listenerAttached) return;
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const bookId = button.dataset.bookId;

            try {
                const response = await fetch(`${BOOKS_URL}/${bookId}/upvote`, {
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

async function handleProfilePage() {
    const nameEl = document.querySelector('.profile-name');
    const emailEl = document.querySelector('.profile-email');
    const roleEl = document.querySelector('.profile-role');
    const editBtn = document.getElementById('edit-profile-btn');

    try {
        const response = await fetch(`http://localhost:3000/api/users/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('No se pudo obtener la información del perfil.');

        const user = await response.json();

        if (nameEl) nameEl.textContent = user.full_name || 'Usuario sin nombre';
        if (emailEl) emailEl.textContent = user.email || 'Sin correo';
        if (roleEl) roleEl.textContent = `Rol: ${user.role || 'user'}`;

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                window.location.href = 'edit-profile.html';
            });
        }

    } catch (error) {
        console.error('❌ Error al cargar perfil:', error);
        if (nameEl) nameEl.textContent = 'Error al cargar el perfil';
        if (emailEl) emailEl.textContent = '';
        if (roleEl) roleEl.textContent = '';
    }
}

async function handleCommentsPage() {
    const bookContainer = document.getElementById('book-detail-container');
    const commentsContainer = document.getElementById('comments-list');
    const commentFormContainer = document.getElementById('comment-form-container');

    if (!bookContainer || !commentsContainer || !commentFormContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    if (!bookId) {
        bookContainer.innerHTML = '<p class="text-danger text-center">ID de libro no especificado.</p>';
        return;
    }

    bookContainer.innerHTML = '<p class="text-center text-muted">Cargando detalles del libro...</p>';
    commentsContainer.innerHTML = '<p class="text-center text-muted">Cargando comentarios...</p>';

    try {
        const [bookRes, commentsRes] = await Promise.all([
            fetch(`http://localhost:3000/api/books/${bookId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            fetch(`http://localhost:3000/api/books/${bookId}/comments`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
        ]);

        if (!bookRes.ok) throw new Error((await bookRes.json()).message || 'No se pudo cargar el libro.');
        if (!commentsRes.ok) throw new Error((await commentsRes.json()).message || 'No se pudieron cargar los comentarios.');

        const book = await bookRes.json();
        const comments = await commentsRes.json();

        bookContainer.innerHTML = `
            <div class="card book-card mb-4">
                <div class="card-body p-4 d-flex">
                    <div class="upvote-section text-center me-4">
                        <a href="#" class="text-decoration-none upvote-button" data-book-id="${book.id}">
                            <span class="material-symbols-outlined">arrow_upward</span>
                        </a>
                        <span class="fw-bold d-block" id="upvotes-count-${book.id}">${book.upvotes || 0} Upvotes</span>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="card-title text-uppercase">${book.title}</h5>
                        <p class="card-author text-muted mb-2">Por ${book.author}</p>
                        <p class="card-synopsis">${book.synopsis || ''}</p>
                        <div class="action-buttons mb-3">
                            <a href="${book.pdf_link}" target="_blank" class="btn btn-primary btn-sm me-2">
                                <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Descargar PDF
                            </a>
                            <a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm">
                                <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span> Abrir enlace
                            </a>
                        </div><hr>
                        <div class="card-footer-actions d-flex justify-content-end align-items-center">
                            <a href="#" class="action-link me-3">
                                <span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir
                            </a>
                            <a href="#" class="action-link">
                                <span class="material-symbols-outlined" style="font-size: 16px;">bookmark</span> Guardar
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        bindUpvoteEvents();

        const userIds = [...new Set(comments.map(c => c.user_id))];
        const usersMap = {};
        await Promise.all(userIds.map(async id => {
            try {
                const res = await fetch(`http://localhost:3000/api/users/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
                if (res.ok) {
                    const data = await res.json();
                    usersMap[id] = data.username || data.full_name || 'Usuario desconocido';
                } else {
                    usersMap[id] = 'Usuario desconocido';
                }
            } catch (err) {
                console.error(err);
                usersMap[id] = 'Usuario desconocido';
            }
        }));

        function createCommentElement(comment) {
            const div = document.createElement('div');
            div.className = 'comment-card d-flex mb-3';
            div.id = `comment-${comment.id}`;
            const userName = usersMap[comment.user_id] || 'Usuario desconocido';
            div.innerHTML = `
                <img src="https://i.pravatar.cc/50?u=${userName}" alt="Avatar" class="comment-avatar me-3">
                <div class="flex-grow-1">
                    <div class="comment-header d-flex justify-content-between align-items-start">
                        <span class="comment-author">${userName}</span>
                        <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                    </div>
                    <p class="comment-content">${comment.content}</p>
                    <div class="comment-footer d-flex gap-3 align-items-center">
                        <a href="#" onclick="likeComment('${comment.id}')" class="action-link">
                            <span class="material-symbols-outlined" style="font-size: 16px;">thumb_up</span> ${comment.likes || 0} Likes
                        </a>
                        <a href="#" onclick="shareComment('${comment.id}')" class="action-link">
                            <span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir
                        </a>
                        <a href="#" onclick="toggleReplyBox('${comment.id}')" class="action-link">
                            <span class="material-symbols-outlined" style="font-size: 16px;">reply</span> Responder
                        </a>
                    </div>
                    <div class="reply-box-container mt-2" id="reply-box-${comment.id}" style="display:none;">
                        <textarea class="form-control mb-1 reply-textarea" rows="2" placeholder="Responde a ${userName}..."></textarea>
                        <button class="btn btn-primary btn-sm send-reply-btn">
                            <span class="material-symbols-outlined">send</span>
                        </button>
                    </div>
                    <div class="replies ms-4"></div>
                </div>
            `;
            return div;
        }

        const commentMap = {};
        const roots = [];
        comments.forEach(c => commentMap[c.id] = { ...c, children: [] });
        comments.forEach(c => {
            if (c.parent_id && commentMap[c.parent_id]) {
                commentMap[c.parent_id].children.push(commentMap[c.id]);
            } else {
                roots.push(commentMap[c.id]);
            }
        });

        function renderCommentsTree(commentsArray, container) {
            commentsArray.forEach(c => {
                const el = createCommentElement(c);
                container.appendChild(el);
                if (c.children.length > 0) {
                    renderCommentsTree(c.children, el.querySelector('.replies'));
                }
            });
        }

        commentsContainer.innerHTML = '';
        if (roots.length === 0) {
            commentsContainer.innerHTML = '<p class="text-center text-muted">No hay comentarios aún. ¡Sé el primero!</p>';
        } else {
            renderCommentsTree(roots, commentsContainer);
        }

        commentFormContainer.innerHTML = `
            <div class="mt-4">
                <textarea id="new-comment" class="form-control mb-2" rows="3" placeholder="Escribe tu comentario..."></textarea>
                <button id="submit-comment" class="btn btn-primary btn-sm">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </div>
        `;

        window.toggleReplyBox = (commentId) => {
            const box = document.getElementById(`reply-box-${commentId}`);
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
            if (box.style.display === 'block') box.querySelector('.reply-textarea').focus();

            const sendBtn = box.querySelector('.send-reply-btn');
            sendBtn.onclick = async () => {
                const content = box.querySelector('.reply-textarea').value.trim();
                if (!content) return alert('El comentario no puede estar vacío.');

                try {
                    const res = await fetch(`http://localhost:3000/api/books/${bookId}/comments`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getToken()}`
                        },
                        body: JSON.stringify({ content, parent_id: commentId })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                    const newComment = { ...result, children: [] };
                    commentMap[newComment.id] = newComment;

                    const el = createCommentElement(newComment);
                    const parentEl = document.getElementById(`comment-${commentId}`).querySelector('.replies');
                    parentEl.appendChild(el);
                    commentMap[commentId].children.push(newComment);

                    box.querySelector('.reply-textarea').value = '';
                    box.style.display = 'none';
                } catch (err) {
                    alert(err.message);
                }
            };
        };

        document.getElementById('submit-comment').addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value.trim();
            if (!content) return alert('El comentario no puede estar vacío.');

            try {
                const res = await fetch(`http://localhost:3000/api/books/${bookId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify({ content, parent_id: null })
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                const newComment = { ...result, children: [] };
                commentMap[newComment.id] = newComment;
                const el = createCommentElement(newComment);
                commentsContainer.appendChild(el);
                roots.push(newComment);

                document.getElementById('new-comment').value = '';
            } catch (err) {
                alert(err.message);
            }
        });

    } catch (err) {
        bookContainer.innerHTML = `<p class="text-danger text-center">${err.message}</p>`;
        commentsContainer.innerHTML = '';
    }
}

async function shareBook(bookId) {
    try {
        const url = `${window.location.origin}/book_detail.html?book_id=${bookId}`;
        if (navigator.share) {
            await navigator.share({
                title: 'Mira este libro 📚',
                text: 'Encontré un libro interesante, échale un vistazo:',
                url: url
            });
        } else {
            await navigator.clipboard.writeText(url);
            showToast('📋 Enlace copiado al portapapeles');
        }
    } catch (err) {
        console.error('Error al compartir:', err);
        showToast('❌ No se pudo compartir el libro');
    }
}

async function saveBook(bookId) {
    try {
        const savedBooks = JSON.parse(localStorage.getItem('savedBooks') || '[]');
        if (!savedBooks.includes(bookId)) {
            savedBooks.push(bookId);
            localStorage.setItem('savedBooks', JSON.stringify(savedBooks));
            showToast('📘 Libro guardado en tu lista');
        } else {
            showToast('ℹ️ Este libro ya está guardado');
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Error al guardar el libro');
    }
}

async function likeComment(commentId) {
    try {
        const res = await fetch(`http://localhost:3000/api/books/comments/${commentId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!res.ok) throw new Error((await res.json()).message || 'Error al dar me gusta');
        showToast('👍 Te gustó este comentario');
    } catch (err) {
        console.error(err);
        showToast('❌ No se pudo registrar el me gusta');
    }
}

async function shareComment(commentId) {
    const url = `${window.location.origin}/book_detail.html?comment_id=${commentId}`;
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Comentario interesante 💬',
                text: 'Mira este comentario sobre un libro:',
                url: url
            });
        } else {
            await navigator.clipboard.writeText(url);
            showToast('📋 Enlace al comentario copiado');
        }
    } catch (err) {
        console.error(err);
        showToast('❌ No se pudo compartir el comentario');
    }
}

function replyToComment(commentId, userName) {
    const textarea = document.getElementById('new-comment');
    if (textarea) {
        textarea.value = `@${userName} `;
        textarea.focus();
        showToast(`Respondiendo a ${userName}`);
    } else {
        showToast('❌ No se encontró el área de comentarios');
    }
}

function showToast(message) {
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
