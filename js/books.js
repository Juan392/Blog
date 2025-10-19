import { showToast } from './main.js';
import { API_BASE_URL, STATIC_BASE_URL } from './config.js';

export const BOOKS_URL = `${API_BASE_URL}/books`;
let currentPage = 1;
const LIMIT = 10;

const filter = window.Filter ? new window.Filter() : null;

function sanitizeContent(content) {
    if (window.DOMPurify) {
        return window.DOMPurify.sanitize(content);
    }
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function validateBookInput(title, synopsis) {
    if (!title || title.trim().length === 0) return 'El título no puede estar vacío.';
    if (title.length > 100) return 'El título no puede exceder 100 caracteres.';
    if (!synopsis || synopsis.trim().length === 0) return 'La sinopsis no puede estar vacía.';
    if (synopsis.length > 500) return 'La sinopsis no puede exceder 500 caracteres.';
    if (filter && filter.isProfane(title + ' ' + synopsis)) return '❌ Contenido inapropiado detectado. No se puede subir el libro.';
    return null;
}

export async function loadBooks(page = 1) {
    const mainContainer = document.querySelector('.library-container');
    const paginationContainer = document.querySelector('.pagination-container') || document.createElement('div');
    paginationContainer.className = 'pagination-container d-flex justify-content-center mt-4';

    if (!mainContainer) {
        console.error('Contenedor .library-container no encontrado.');
        return;
    }

    mainContainer.innerHTML = '<p class="text-center">Cargando libros...</p>';

    try {
        const response = await fetch(`${BOOKS_URL}?page=${page}&limit=${LIMIT}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'No se pudieron cargar los libros.');
        }

        const data = await response.json();
        const books = Array.isArray(data) ? data : data.books || [];
        const totalPages = data.totalPages || 1;

        if (books.length === 0) {
            mainContainer.innerHTML = '<p class="text-center">No hay libros disponibles.</p>';
            return;
        }

        mainContainer.innerHTML = '';

        books.forEach(book => {
            const upvotes = book.upvotes || 0;
            const commentsCount = book.comments_count || 0;
            const displayUpvotes = upvotes >= 1000 ? `${(upvotes / 1000).toFixed(1)}K` : upvotes;

            const sanitizedTitle = sanitizeContent(book.title);
            const sanitizedSynopsis = sanitizeContent(book.synopsis || '');

            const bookCardHTML = `
                <div class="card book-card mb-4">
                    <div class="card-body p-4 d-flex">
                        <div class="upvote-section text-center me-4">
                            <a href="#" class="text-decoration-none upvote-button" data-book-id="${book.id}">
                                <span class="material-symbols-outlined">arrow_upward</span>
                            </a>
                            <span class="fw-bold d-block" id="upvotes-count-${book.id}">${displayUpvotes}</span>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="card-title text-uppercase">${sanitizedTitle}</h5>
                            <p class="card-author text-muted mb-2">Por ${sanitizeContent(book.author)}</p>
                            <p class="card-synopsis">${sanitizedSynopsis}</p>
                            <div class="action-buttons mb-3">
                                <a href="${book.pdf_url ? STATIC_BASE_URL + book.pdf_url : '#'}" 
                                    target="_blank" 
                                    class="btn btn-primary btn-sm me-2">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span> Descargar PDF
                                </a>
                                ${book.external_link ? `
                                <a href="${book.external_link}" target="_blank" class="btn btn-primary btn-sm">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span> Abrir enlace
                                </a>` : ''}
                            </div>
                            <div class="book-stats mb-2">
                                <span class="me-3"><strong>${commentsCount}</strong> comentarios</span>
                            </div>
                            <hr>
                            <div class="card-footer-actions d-flex justify-content-between align-items-center">
                                <a href="comments.html?book_id=${book.id}" class="comments-link">Ver comentarios</a>
                                <div>
                                    <a href="#" class="action-link me-3" onclick="shareBook(${book.id})">
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
            bindUpvoteEvents();
        });

        // Paginación
        paginationContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `btn btn-sm mx-1 ${i === page ? 'btn-primary' : 'btn-outline-primary'}`;
            btn.onclick = () => loadBooks(i);
            paginationContainer.appendChild(btn);
        }

        if (page < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = '>';
            nextBtn.className = 'btn btn-sm btn-outline-primary mx-1';
            nextBtn.onclick = () => loadBooks(page + 1);
            paginationContainer.appendChild(nextBtn);
        }

        if (!paginationContainer.parentElement)
            mainContainer.insertAdjacentElement('afterend', paginationContainer);

    } catch (error) {
        console.error('Error en loadBooks:', error);
        mainContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        showToast('Error al cargar libros: ' + error.message);
    }
}

export function bindUpvoteEvents() {
    document.querySelectorAll('.upvote-button').forEach(button => {
        if (button.dataset.listenerAttached) return;

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const bookId = button.dataset.bookId;

            try {
                const response = await fetch(`${BOOKS_URL}/${bookId}/upvote`, {
                    method: 'POST',
                    credentials: 'include'
                });

                const result = await response.json();

                if (response.ok) {
                    const countElement = document.getElementById(`upvotes-count-${bookId}`);
                    const newCount = result.newUpvotes || result.upvotes || result.book?.upvotes || 0;
                    countElement.textContent = newCount >= 1000 ? `${(newCount / 1000).toFixed(1)}K` : newCount;

                    button.classList.add('voted');
                    button.style.pointerEvents = 'none';

                    showToast('¡Tu voto ha sido registrado!');
                } else {
                    showToast(result.message || 'Ya votaste este libro.');
                    if (result.message?.includes('Ya votaste')) {
                        button.classList.add('voted');
                        button.style.pointerEvents = 'none';
                    }
                }
            } catch (error) {
                console.error('Error al votar:', error);
                showToast('Error de conexión al votar.');
            }
        });
        button.dataset.listenerAttached = 'true';
    });
}

export async function handleBookUpload() {
    const form = document.querySelector('#upload-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form); 
        const title = formData.get('title');
        const synopsis = formData.get('synopsis');
        const error = validateBookInput(title, synopsis);
        if (error) return showToast(error);

        try {
            const response = await fetch(BOOKS_URL, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al subir el libro.');
            }

            showToast('📚 Libro subido exitosamente.');
            window.location.href = 'library.html';
        } catch (error) {
            console.error('Error al subir el libro:', error);
            showToast('❌ Error de conexión con el servidor: ' + error.message);
        }
    });
}

export async function deleteBook(bookId) {
    try {
        const response = await fetch(`${BOOKS_URL}/${bookId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al borrar el libro.');

        showToast('🗑️ Libro borrado exitosamente.');
        if (document.querySelector('.admin-books-container')) {
            document.querySelector(`#book-${bookId}`).remove();
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Error al borrar el libro');
    }
}

export async function shareBook(bookId) {
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
