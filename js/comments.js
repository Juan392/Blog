import { showToast } from './main.js';
import { API_BASE_URL } from './config.js';
import { USERS_URL } from './notificationsAndProfile.js';
import { getProfilePicUrl } from './utils.js';
import { BOOKS_URL, bindUpvoteEvents, shareBook } from './books.js';
import { STATIC_BASE_URL } from './config.js';

const COMMENTS_URL = `${API_BASE_URL}/comments`;
const Filter = window.BadWords ? new window.BadWords() : null;
const LIMIT = 10;
let currentPage = 1;
let currentOrder = 'newest';

window.toggleReplies = (commentId) => {
    const repliesContainer = document.getElementById(`replies-${commentId}`);
    if (repliesContainer) {
        repliesContainer.style.display = (repliesContainer.style.display === 'none' || repliesContainer.style.display === '') 
            ? 'block' 
            : 'none';
    }
};

window.toggleReplyBox = (commentId, userName) => {
    const box = document.getElementById(`reply-box-${commentId}`);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    if (box.style.display === 'block') {
        const textarea = box.querySelector('.reply-textarea');
        textarea.focus();
        textarea.value = `@${userName} `;
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
window.bookId = bookId;

    const filterContainer = document.createElement('div');
    filterContainer.innerHTML = `
        <div class="mb-3 d-flex justify-content-center gap-2">
            <button id="filter-newest" class="btn btn-outline-primary">Más nuevos</button>
            <button id="filter-oldest" class="btn btn-outline-primary">Más viejos</button>
            <button id="filter-most-likes" class="btn btn-outline-primary">Más likes</button>
        </div>
    `;
    document.querySelector('.comments-section').insertBefore(filterContainer, commentsContainer);

    bookContainer.innerHTML = '<p class="text-center text-muted">Cargando detalles del libro...</p>';
    commentsContainer.innerHTML = '<p class="text-center text-muted">Cargando comentarios...</p>';

    try {
        const [bookRes, commentsRes] = await Promise.all([
            fetch(`${BOOKS_URL}/${bookId}`, { credentials: 'include' }),
            fetch(`${BOOKS_URL}/${bookId}/comments?page=1&limit=${LIMIT}`, { credentials: 'include' })
        ]);

        if (!bookRes.ok) throw new Error((await bookRes.json()).message || 'No se pudo cargar el libro.');
        if (!commentsRes.ok) throw new Error((await commentsRes.json()).message || 'No se pudieron cargar los comentarios.');

        const book = await bookRes.json();
        const commentsData = await commentsRes.json();
        const comments = commentsData.comments || commentsData;
        const totalPages = commentsData.totalPages || 1;

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
                            <a href="${book.pdf_link}" target="_blank" class="btn btn-primary btn-sm me-2">Descargar PDF</a>
                            ${book.external_link ? `<a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm">Abrir enlace</a>` : ''}
                        </div><hr>
                        <div class="card-footer-actions d-flex justify-content-end align-items-center">
                            <a href="#" class="action-link me-3" id="share-book-link"">
                                <span class="material-symbols-outlined" style="font-size: 16px;">share</span> Compartir
                            </a>
                            <a href="#" class="action-link" onclick="saveBook(${book.id})">
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

        const userIds = [...new Set(comments.map(c => c.user_id))];
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
                usersMap[id] = 'Usuario desconocido';
            }
        }));

        function activateLazyLoading() {
    const lazyMedia = document.querySelectorAll('.lazy-media');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const media = entry.target;
                const source = media.querySelector('source');
                if (source) {
                    source.src = source.dataset.src;
                    media.load();
                } else {
                    media.src = media.dataset.src;
                }
                
                media.classList.remove('lazy-media');
                observer.unobserve(media);
            }
        });
    }, { rootMargin: "200px" }); 

    lazyMedia.forEach(media => observer.observe(media));
}

        function createCommentElement(comment) {
            const div = document.createElement('div');
            div.className = 'comment-card d-flex mb-3';
            div.id = `comment-${comment.id}`;
            div.dataset.userId = comment.user_id;
            const userName = usersMap[comment.user_id] || 'Usuario desconocido';
            const profilePicUrl = comment.profile_pic;
            const avatarHTML = profilePicUrl ? `
                <img src="${profilePicUrl}" alt="Avatar" class="comment-avatar me-3" 
                     style="width: 40px; height: 40px;" 
                     onerror="this.src = getProfilePicUrl(null); this.onerror = null; this.alt = 'Imagen por defecto';">
            ` : `<span class="material-symbols-outlined me-2" style="font-size: 40px; color: #666;">account_circle</span>`;

             console.log('Comentario:', comment.id, 'Media URL:', comment.media_url, 'Media Type:', comment.media_type);

    let contentHTML = comment.content;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = comment.content;
    contentHTML = tempDiv.innerText;
    const words = contentHTML.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith('@')) {
            let mentionCandidate = words.slice(i).join(' ').substring(1);
            const foundUser = Object.values(usersMap).find(u => mentionCandidate.startsWith(u));
            if (foundUser) {
                const mentionHTML = `<a href="#" class="mention-link">${foundUser}</a>`;
                contentHTML = contentHTML.replace(`@${foundUser}`, mentionHTML);
                break;
            }
        }
    }
let mediaHTML = '';
    if (comment.media_url && comment.media_type) {
        let mediaSrc = comment.media_url;
        if (!mediaSrc.startsWith('http')) {
            mediaSrc = STATIC_BASE_URL + mediaSrc;
        }
        if (comment.media_type === 'image') {
            mediaHTML = `<img src="${mediaSrc}" alt="Media" class="lazy-media img-fluid mt-2" style="max-width: 300px;" onerror="this.onerror=null; this.alt='Error al cargar la imagen';">`;
        } else if (comment.media_type === 'video') {
            mediaHTML = `<video controls class="lazy-media mt-2" style="max-width: 300px;" preload="none"><source data-src="${mediaSrc}" type="video/mp4"></video>`;
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
        ${mediaHTML}
        <div class="comment-footer d-flex gap-3 align-items-center">
            <a href="#" onclick="likeComment('${comment.id}')" class="action-link">👍 ${comment.likes || 0} Likes</a>
            <a href="#" onclick="shareComment('${comment.id}')" class="action-link">📤 Compartir</a>
            <a href="#" onclick="toggleReplyBox('${comment.id}', '${userName}')" class="action-link">↩️ Responder</a>
        </div>
        <div class="reply-box-container mt-2" id="reply-box-${comment.id}" style="display:none;">
            <div class="d-flex">
                <textarea class="form-control me-2 reply-textarea" rows="2" placeholder="Responde a ${userName}..."></textarea>
                <div class="d-flex flex-column gap-1">
                    <label class="btn btn-secondary circular-button mb-0" title="Adjuntar archivo">
                        <span class="material-symbols-outlined">attach_file</span>
                        <input type="file" class="reply-file-input" style="display:none;" accept="image/*,video/*">
                    </label>
                    <button class="btn btn-primary circular-button send-reply-btn" type="button">
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
            <div class="reply-file-preview mt-1"></div>
        </div>
        <div class="replies" id="replies-${comment.id}"></div>
    </div>
`;


            // Manejar subida de archivos en reply
            const fileInput = div.querySelector('.reply-file-input');
            const previewDiv = div.querySelector('.reply-file-preview');
            fileInput.addEventListener('change', () => {
                previewDiv.innerHTML = '';
                const file = fileInput.files[0];
                if (!file) return;
                let preview;
                if (file.type.startsWith('image/')) {
                    preview = document.createElement('img');
                    preview.src = URL.createObjectURL(file);
                    preview.style.maxWidth = '120px';
                    preview.style.maxHeight = '80px';
                } else if (file.type.startsWith('video/')) {
                    preview = document.createElement('video');
                    preview.src = URL.createObjectURL(file);
                    preview.controls = true;
                    preview.style.maxWidth = '120px';
                    preview.style.maxHeight = '80px';
                }
                previewDiv.appendChild(preview);
            });

            const sendBtn = div.querySelector('.send-reply-btn');
            sendBtn.onclick = async () => {
                const textarea = div.querySelector('.reply-textarea');
                const content = textarea.value.trim();
                if (!content && !fileInput.files[0]) return showToast('El comentario no puede estar vacío.');

                if (Filter && Filter.isProfane(content)) {
                    showToast('❌ Contenido inapropiado detectado. No se puede enviar.');
                    return;
                }

                const formData = new FormData();
                formData.append('content', content);
                formData.append('parent_id', comment.id);
                if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

                try {
                    const res = await fetch(`${BOOKS_URL}/${bookId}/comments`, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                    const newComment = result;
                    const el = createCommentElement(newComment);
                    const repliesContainer = document.getElementById(`replies-${comment.id}`);
                    repliesContainer.appendChild(el);

                    textarea.value = '';
                    fileInput.value = '';
                    previewDiv.innerHTML = '';
                    div.style.display = 'none';
                } catch (err) {
                    showToast(err.message);
                }
            };

            return div;
        }

        async function loadCommentsSorted(bookId, order, page = 1, append = false) {
            if (!append) {
                commentsContainer.innerHTML = '<p class="text-center text-muted">Cargando comentarios...</p>';
                currentPage = 1;
            }
            currentOrder = order;
            try {
                const response = await fetch(`${BOOKS_URL}/${bookId}/comments?page=${page}&limit=${LIMIT}&order=${order}`, { credentials: 'include' });
                if (!response.ok) {
                    if (!append) commentsContainer.innerHTML = '<p class="text-danger text-center">Error al cargar comentarios.</p>';
                    return;
                }
                const data = await response.json();
                const newComments = data.comments || data;
                const totalPages = data.totalPages || 1;

                if (!append) commentsContainer.innerHTML = '';
                newComments.forEach(c => {
                    const el = createCommentElement(c);
                    commentsContainer.appendChild(el);
                });

                let loadMoreBtn = document.getElementById('load-more-comments');
                if (page < totalPages) {
                    if (!loadMoreBtn) {
                        loadMoreBtn = document.createElement('button');
                        loadMoreBtn.id = 'load-more-comments';
                        loadMoreBtn.className = 'btn btn-outline-primary d-block mx-auto mt-3';
                        loadMoreBtn.textContent = 'Cargar más comentarios';
                        loadMoreBtn.onclick = () => loadCommentsSorted(bookId, currentOrder, currentPage + 1, true);
                        commentsContainer.appendChild(loadMoreBtn);
                    }
                } else {
                    if (loadMoreBtn) loadMoreBtn.remove();
                }

                if (append) currentPage++;
            } catch (err) {
                if (!append) commentsContainer.innerHTML = '<p class="text-danger text-center">Error al cargar comentarios.</p>';
            }
        }

        loadCommentsSorted(bookId, 'newest');
        document.getElementById('filter-newest').addEventListener('click', () => loadCommentsSorted(bookId, 'newest'));
        document.getElementById('filter-oldest').addEventListener('click', () => loadCommentsSorted(bookId, 'oldest'));
        document.getElementById('filter-most-likes').addEventListener('click', () => loadCommentsSorted(bookId, 'most-likes'));

        commentFormContainer.innerHTML = `
            <div class="mt-4 d-flex">
                <textarea id="new-comment" class="form-control me-2" rows="3" placeholder="Escribe tu comentario..." aria-label="Comentario"></textarea>
                <div class="d-flex flex-column gap-1">
                    <label class="btn btn-secondary circular-button mb-0" title="Adjuntar archivo">
                        <span class="material-symbols-outlined">attach_file</span>
                        <input type="file" id="new-comment-file" style="display:none;" accept="image/*,video/*">
                    </label>
                    <button id="submit-comment" class="btn btn-primary circular-button" type="button">
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
            <div id="new-comment-preview" class="mt-1"></div>
        `;

        // Vista previa para nuevo comentario
        const newCommentFile = document.getElementById('new-comment-file');
        const newCommentPreview = document.getElementById('new-comment-preview');
        newCommentFile.addEventListener('change', () => {
            newCommentPreview.innerHTML = '';
            const file = newCommentFile.files[0];
            if (!file) return;
            let preview;
            if (file.type.startsWith('image/')) {
                preview = document.createElement('img');
                preview.src = URL.createObjectURL(file);
                preview.style.maxWidth = '120px';
                preview.style.maxHeight = '80px';
            } else if (file.type.startsWith('video/')) {
                preview = document.createElement('video');
                preview.src = URL.createObjectURL(file);
                preview.controls = true;
                preview.style.maxWidth = '120px';
                preview.style.maxHeight = '80px';
            }
            newCommentPreview.appendChild(preview);
        });

        document.getElementById('submit-comment').addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value.trim();
            if (!content && !newCommentFile.files[0]) return showToast('El comentario no puede estar vacío.');
            if (Filter && Filter.isProfane(content)) return showToast('❌ Contenido inapropiado detectado. No se puede enviar.');

            const formData = new FormData();
            formData.append('content', content);
            if (newCommentFile.files[0]) formData.append('file', newCommentFile.files[0]);

            try {
                const res = await fetch(`${BOOKS_URL}/${bookId}/comments`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Error al enviar el comentario.');

                const newComment = result;
                const el = createCommentElement(newComment);
                commentsContainer.appendChild(el);
                document.getElementById('new-comment').value = '';
                newCommentFile.value = '';
                newCommentPreview.innerHTML = '';
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
    try {
        const res = await fetch(`${BOOKS_URL}/comments/${commentId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({})
        });

        const result = await res.json();

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
            likeLink.innerHTML = `👍 ${result.likes || 0} Likes`;
            likeLink.style.pointerEvents = 'none'; 
        } else {
            showToast('Error al actualizar el contador de likes');
        }

        showToast('👍 Te gustó este comentario');
    } catch (err) {
        showToast(`❌ ${err.message}`);
    }
}

export async function shareComment(commentId) {
    const url = `${window.location.origin}/comments.html?comment_id=${commentId}`;
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
