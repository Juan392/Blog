import { getToken } from './auth.js';
import { showToast } from './main.js';
import { USERS_URL } from './notificationsAndProfile.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('edit-profile-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            if (!currentPassword) {
                return showToast('Debes ingresar tu contraseña actual para confirmar los cambios.');
            }

            const updatedData = {
                full_name: document.getElementById('edit-full-name').value,
                email: document.getElementById('edit-email').value,
                profile_pic: document.getElementById('edit-profile-pic').value,
                password: document.getElementById('edit-password').value
            };

            try {
                const response = await fetch(`${USERS_URL}/me`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                if (response.ok) {
                    showToast('Perfil actualizado exitosamente.');
                    window.location.href = 'profile.html';
                } else {
                    showToast('Error al actualizar el perfil.');
                }
            } catch (error) {
                showToast('Error de conexión.');
            }
        });
    }

    // Función para manejar la imagen por defecto en profile.html
    function setProfilePic() {
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            fetch(`${USERS_URL}/me`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            }).then(response => response.json()).then(user => {
                if (user.profile_pic) {
                    profilePic.src = user.profile_pic;
                } else {
                    profilePic.src = 'default-profile.png'; 
                }
            });
        }
    }

    setProfilePic();  
});