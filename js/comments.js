// ===================================================================================
// 💬 comments.js - Lógica para la página de comentarios (cargar, filtrar, responder)
// ===================================================================================

import { showToast } from './main.js';
import { API_BASE_URL } from './config.js';
import { USERS_URL } from './notificationsAndProfile.js';
import { getProfilePicUrl } from './utils.js';
// Importamos funciones necesarias desde books.js
import { BOOKS_URL, bindUpvoteEvents, shareBook } from './books.js';

const COMMENTS_URL = `${API_BASE_URL}/comments`;
const Filter = window.BadWords ? new window.BadWords() : null;

// Hacemos la función accesible globalmente para los `onclick`
window.toggleReplies = (commentId) => {
    const repliesContainer = document.getElementById(`replies-${commentId}`);
    if (repliesContainer) {
        repliesContainer.style.display = (repliesContainer.style.display === 'none' || repliesContainer.style.display === '') 
            ? 'block' 
            : 'none';
    }
};

export async function handleCommentsPage() {
    const bookContainer = document.getElementById('book-detail-container');
    const commentsContainer = document.getElementById('comments-list');
    const commentFormContainer = document.getElementById('comment-form-container');
    window.likeComment = likeComment;
    window.shareComment = shareComment;

    if (!bookContainer || !commentsContainer || !commentFormContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book_id');
    if (!bookId) {
        bookContainer.innerHTML = '<p class="text-danger text-center">ID de libro no especificado.</p>';
        return;
    }

    const filterContainer = document.createElement('div');
    filterContainer.innerHTML = `
        <div class="mb-3 d-flex justify-content-center gap-2">
            <button id="filter-newest" class="btn btn-outline-primary">Más nuevos <span class="material-symbols-outlined">new_releases</span></button>
            <button id="filter-oldest" class="btn btn-outline-primary">Más viejos <span class="material-symbols-outlined">history</span></button>
            <button id="filter-most-likes" class="btn btn-outline-primary">Más likes <span class="material-symbols-outlined">thumb_up</span></button>
        </div>
    `;
    document.querySelector('.comments-section').insertBefore(filterContainer, commentsContainer);

    // === Datos iniciales de libro y comentarios ===
    bookContainer.innerHTML = '<p class="text-center text-muted">Cargando detalles del libro...</p>';
    commentsContainer.innerHTML = '<p class="text-center text-muted">Cargando comentarios...</p>';

    try {
        const [bookRes, commentsRes] = await Promise.all([
            fetch(`${BOOKS_URL}/${bookId}`, { credentials: 'include' }),
            fetch(`${BOOKS_URL}/${bookId}/comments`, { credentials: 'include' })
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
                        <span class="fw-bold d-block" id="upvotes-count-${book.id}">${book.upvotes || 0}</span>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="card-title text-uppercase">${book.title}</h5>
                        <p class="card-author text-muted mb-2">Por ${book.author}</p>
                        <p class="card-synopsis">${book.synopsis || ''}</p>
                        <div class="action-buttons mb-3">
                            <a href="${book.pdf_link}" target="_blank" class="btn btn-primary btn-sm me-2">
                                <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Descargar PDF
                            </a>
                            ${book.external_link ? `
                                <a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span> Abrir enlace
                                </a>` : ''}
                        </div><hr>
                        <div class="card-footer-actions d-flex justify-content-end align-items-center">
                            <a href="#" class="action-link me-3" id="share-book-link">
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

        const shareLink = document.querySelector('.action-link.me-3');
        if (shareLink) {
            shareLink.addEventListener('click', (e) => {
                e.preventDefault();
                shareBook(book.id);
            });
        }

        // === Preparar map de usuarios para mentions ===
        const commentList = Array.isArray(comments)
            ? comments
            : (comments.comments || []);

        const userIds = [...new Set(commentList.map(c => c.user_id))];

        const usersMap = {};
        await Promise.all(userIds.map(async id => {
            try {
                const res = await fetch(`${USERS_URL}/${id}`, { credentials: 'include' });
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

    // === Crear elementos de comentario con mentions resaltadas ===
    function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-card d-flex mb-3';
    div.id = `comment-${comment.id}`;
    div.dataset.userId = comment.user_id;
    const userName = usersMap[comment.user_id] || 'Usuario desconocido';

    const profilePicUrl = comment.profile_pic;
    console.log(`Intentando cargar imagen para usuario: ${profilePicUrl}`);  

    const avatarHTML = profilePicUrl ? `
        <img src="${profilePicUrl}" alt="Avatar" class="comment-avatar me-3" 
             style="width: 40px; height: 40px;" 
             onerror="this.src = getProfilePicUrl(null); this.onerror = null; this.alt = 'Imagen por defecto';">
    ` : `<span class="material-symbols-outlined me-2" style="font-size: 40px; color: #666;">account_circle</span>`;

    let contentHTML = comment.content;
    const words = comment.content.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith('@')) {
            let mentionCandidate = words.slice(i).join(' ').substring(1);
            const foundUser = Object.values(usersMap).find(u => mentionCandidate.startsWith(u));
            if (foundUser) {
                const mentionHTML = `<a href="#" class="mention-link">@${foundUser}</a>`;
                contentHTML = contentHTML.replace(`@${foundUser}`, mentionHTML);
                break;
            }
        }
    }

    div.innerHTML = `
        ${avatarHTML}
        <div class="flex-grow-1">
            <div class="comment-header d-flex justify-content-between align-items-start">
                <span class="comment-author">${userName}</span>
                <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
            </div>
            <p class="comment-content">${contentHTML}</p>
            <div class="comment-footer d-flex gap-3 align-items-center">
                <a href="#" onclick="likeComment('${comment.id}')" class="action-link">
                    <span class="material-symbols-outlined" style="font-size: 16px;">thumb_up</span> ${comment.likes || 0} Likes
                </a>
                <a href="#" onclick="shareComment('${comment.id}')" class="action-link">
                    <span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir
                </a>
                <a href="#" onclick="toggleReplyBox('${comment.id}', '${userName}')" class="action-link">
                    <span class="material-symbols-outlined" style="font-size: 16px;">reply</span> Responder
                </a>

            </div>
            <div class="reply-box-container mt-2" id="reply-box-${commentId}" style="display:none;">
                <div class="input-group">
                    <textarea class="form-control mb-1 reply-textarea" rows="2" placeholder="Responde a ${userName}..."></textarea>
                    <button class="btn btn-primary btn-sm send-reply-btn" type="button">
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
            <div class="replies" id="replies-${comment.id}"></div>  
        </div>
    `;
    return div;
}

        // === Función de carga y orden de comentarios ===
        async function loadCommentsSorted(bookId, order) {
            commentsContainer.innerHTML = '<p class="text-center text-muted">Cargando comentarios...</p>';
            try {
                const response = await fetch(`${BOOKS_URL}/${bookId}/comments`, { credentials: 'include' });
                if (!response.ok) {
                    commentsContainer.innerHTML = '<p class="text-danger text-center">Error al cargar comentarios.</p>';
                    return;
                }

                const comments = await response.json();
                let sortedComments = [...commentList];


                switch (order) {
                    case 'newest':
                        sortedComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        break;
                    case 'oldest':
                        sortedComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                        break;
                    case 'most-likes':
                        sortedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                        break;
                }

                commentsContainer.innerHTML = '';
                sortedComments.forEach(c => {
                    const el = createCommentElement(c);
                    commentsContainer.appendChild(el);
                });
            } catch (err) {
                console.error(err);
                commentsContainer.innerHTML = '<p class="text-danger text-center">Error al cargar comentarios.</p>';
            }
        }

        // === Inicializar filtro por defecto (más nuevos) ===
        loadCommentsSorted(bookId, 'newest');
        document.getElementById('filter-newest').addEventListener('click', () => loadCommentsSorted(bookId, 'newest'));
        document.getElementById('filter-oldest').addEventListener('click', () => loadCommentsSorted(bookId, 'oldest'));
        document.getElementById('filter-most-likes').addEventListener('click', () => loadCommentsSorted(bookId, 'most-likes'));

        // === Toggle reply box con mención automática ===
        window.toggleReplyBox = (commentId, userName) => {
            const box = document.getElementById(`reply-box-${commentId}`);
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
            if (box.style.display === 'block') {
                const textarea = box.querySelector('.reply-textarea');
                textarea.focus();
                textarea.value = `@${userName} `;
            }

            const sendBtn = box.querySelector('.send-reply-btn');
            sendBtn.onclick = async () => {
                const content = box.querySelector('.reply-textarea').value.trim();
                if (!content) return showToast('El comentario no puede estar vacío.');

                if (Filter && Filter.isProfane(content)) {
                    showToast('❌ Contenido inapropiado detectado. No se puede enviar.');
                    return;
                }

                try {
                    const res = await fetch(`${BOOKS_URL}/${bookId}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ content, parent_id: commentId })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                    const newComment = result;
                    const el = createCommentElement(newComment);
                    commentsContainer.appendChild(el);  
                    box.querySelector('.reply-textarea').value = '';
                    box.style.display = 'none';
                } catch (err) {
                    showToast(err.message);
                }
            };
        };

        // === Formulario principal de comentario ===
        commentFormContainer.innerHTML = `
            <div class="mt-4 input-group comment-input-wrapper">
                <textarea id="new-comment" class="form-control mb-0" rows="3" placeholder="Escribe tu comentario..." aria-label="Comentario"></textarea>
                <button id="submit-comment" class="btn btn-primary circular-button" type="button">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </div>
        `;
        document.getElementById('submit-comment').addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value.trim();
            if (!content) return showToast('El comentario no puede estar vacío.');
            if (Filter && Filter.isProfane(content)) return showToast('❌ Contenido inapropiado detectado. No se puede enviar.');

            try {
                const res = await fetch(`${BOOKS_URL}/${bookId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content, parent_id: null })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                const newComment = result;
                const el = createCommentElement(newComment);
                commentsContainer.appendChild(el);
                document.getElementById('new-comment').value = '';
            } catch (err) {
                showToast(err.message);
            }
        });

    } catch (err) {
        bookContainer.innerHTML = `<p class="text-danger text-center">${err.message}</p>`;
        commentsContainer.innerHTML = '';
    }
}

export async function likeComment(commentId) {
    console.log('Enviando like para commentId:', commentId);

    try {
        const res = await fetch(`${BOOKS_URL}/comments/${commentId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const result = await res.json();
        console.log('Respuesta del backend:', result);  

        const commentCard = document.getElementById(`comment-${commentId}`);
        const likeLink = commentCard ? commentCard.querySelector('.action-link') : null;

        if (!res.ok) {
            if (result.message === 'Ya has dado like a este comentario.') {
                if (likeLink) likeLink.style.pointerEvents = 'none';
                showToast('Ya habías dado like a este comentario.');
            } else {
                throw new Error(result.message || 'Error al dar me gusta');
            }
            return;
        }

        if (likeLink) {
            likeLink.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">thumb_up</span> ${result.likes || 0} Likes`;
            likeLink.style.pointerEvents = 'none'; 
        } else {
            console.error('Elemento .action-link no encontrado en el comentario');
            showToast('Error al actualizar el contador de likes');
        }

        showToast('👍 Te gustó este comentario');
    } catch (err) {
        console.error('Error en likeComment:', err);
        showToast(`❌ ${err.message}`);
    }
}

export async function shareComment(commentId) {
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

export function replyToComment(commentId, userName) {
    const textarea = document.getElementById('new-comment');
    if (textarea) {
        textarea.value = `@${userName} `;
        textarea.focus();
        showToast(`Respondiendo a ${userName}`);
    } else {
        showToast('❌ No se encontró el área de comentarios');
    }
}

function renderFlatComments(comments, container, createCommentElementFn) {
    container.innerHTML = '';
    comments.forEach(c => {
        const el = createCommentElementFn(c);
        container.appendChild(el);
    });
}
