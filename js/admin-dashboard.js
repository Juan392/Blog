import { API_BASE_URL } from './config.js';
import { showToast } from './main.js';

export async function handleAdminDashboard(user) {
    if (user.role !== 'admin') {
        showToast('Acceso denegado.');
        window.location.href = 'library.html';
        return;
    }

    await loadStats();
    await loadUsers();

    document.getElementById('users-card').addEventListener('click', () => loadUsers());
    document.getElementById('books-card').addEventListener('click', () => loadBooksTable());
    document.getElementById('comments-card').addEventListener('click', () => loadCommentsTable());
}

async function loadStats() {
    try {
        const [usersRes, booksRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/users`, { credentials: 'include' }),
            fetch(`${API_BASE_URL}/books?limit=1000`, { credentials: 'include' }),
            fetch(`${API_BASE_URL}/books/comments/all`, { credentials: 'include' })
        ]);

        if (usersRes.ok) {
            const users = await usersRes.json();
            document.getElementById('total-users').textContent = users.length;
        }

        if (booksRes.ok) {
            const booksData = await booksRes.json();
            const books = Array.isArray(booksData) ? booksData : booksData.books || [];
            document.getElementById('total-books').textContent = books.length;
        } else {
            document.getElementById('total-books').textContent = '0';
        }

        if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            const comments = Array.isArray(commentsData) ? commentsData : commentsData.comments || [];
            document.getElementById('total-comments').textContent = comments.length;
        } else {
            document.getElementById('total-comments').textContent = '0';
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showToast('Error al cargar estadísticas.');
    }
}

async function loadUsers() {
    document.getElementById('management-title').textContent = 'User Management';
    const thead = document.getElementById('management-table-head');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Current Role</th>
            <th>Actions</th>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/users`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar usuarios.');

        const users = await response.json();
        const tbody = document.getElementById('management-table-body');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>
                    <select class="form-select" data-user-id="${user.id}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm update-role-btn" data-user-id="${user.id}">Update Role</button>
                    <button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.update-role-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userId;
                const select = document.querySelector(`select[data-user-id="${userId}"]`);
                const newRole = select.value;

                try {
                    const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ role: newRole })
                    });

                    if (res.ok) {
                        showToast('Rol actualizado exitosamente.');
                    } else {
                        showToast('Error al actualizar rol.');
                    }
                } catch (error) {
                    console.error('Error al actualizar rol:', error);
                    showToast('Error de conexión.');
                }
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userId;
                if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

                try {
                    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (res.ok) {
                        showToast('Usuario eliminado exitosamente.');
                        e.target.closest('tr').remove();
                    } else {
                        showToast('Error al eliminar usuario.');
                    }
                } catch (error) {
                    console.error('Error al eliminar usuario:', error);
                    showToast('Error de conexión.');
                }
            });
        });
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        document.getElementById('management-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar usuarios.</td></tr>';
        showToast('Error al cargar usuarios.');
    }
}

async function loadBooksTable() {
    document.getElementById('management-title').textContent = 'Book Management';
    const thead = document.getElementById('management-table-head');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Author</th>
            <th>Synopsis</th>
            <th>Actions</th>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/books?limit=1000`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar libros.');

        const booksData = await response.json();
        const books = Array.isArray(booksData) ? booksData : booksData.books || [];
        const tbody = document.getElementById('management-table-body');
        tbody.innerHTML = '';

        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.id}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.synopsis || 'N/A'}</td>
                <td>
                    <button class="btn btn-danger btn-sm delete-book-btn" data-book-id="${book.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.delete-book-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookId = e.target.dataset.bookId;
                if (!confirm('¿Estás seguro de que quieres eliminar este libro?')) return;

                try {
                    const res = await fetch(`${API_BASE_URL}/books/${bookId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (res.ok) {
                        showToast('Libro eliminado exitosamente.');
                        e.target.closest('tr').remove();
                    } else {
                        showToast('Error al eliminar libro.');
                    }
                } catch (error) {
                    console.error('Error al eliminar libro:', error);
                    showToast('Error de conexión.');
                }
            });
        });
    } catch (error) {
        console.error('Error al cargar libros:', error);
        document.getElementById('management-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar libros.</td></tr>';
        showToast('Error al cargar libros.');
    }
}

async function loadCommentsTable() {
    document.getElementById('management-title').textContent = 'Comment Management';
    const thead = document.getElementById('management-table-head');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Content</th>
            <th>User ID</th>
            <th>Book ID</th>
            <th>Actions</th>
        </tr>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/books/comments/all?limit=1000`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar comentarios.');

        const commentsData = await response.json();
        const comments = Array.isArray(commentsData) ? commentsData : commentsData.comments || [];
        const tbody = document.getElementById('management-table-body');
        tbody.innerHTML = '';

        comments.forEach(comment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${comment.id}</td>
                <td>${comment.content}</td>
                <td>${comment.user_id}</td>
                <td>${comment.book_id}</td>
                <td>
                    <button class="btn btn-danger btn-sm delete-comment-btn" data-comment-id="${comment.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Event listeners para eliminar comentarios
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;
                if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return;

                try {
                    const res = await fetch(`${API_BASE_URL}/books/comments/${commentId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (res.ok) {
                        showToast('Comentario eliminado exitosamente.');
                        e.target.closest('tr').remove();
                    } else {
                        showToast('Error al eliminar comentario.');
                    }
                } catch (error) {
                    console.error('Error al eliminar comentario:', error);
                    showToast('Error de conexión.');
                }
            });
        });
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        document.getElementById('management-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar comentarios.</td></tr>';
        showToast('Error al cargar comentarios.');
    }
}