# 📝 Blog Full-Stack

Una plataforma de blog moderna y funcional construida con el stack MERN. Permite a los usuarios crear, leer, actualizar y eliminar artículos, así como interactuar con el contenido.

![DEMO_BLOG](https://i.imgur.com/8IVgCT9.png) ---

## 📜 Tabla de Contenidos

1.  [Descripción del Proyecto](#-descripción-del-proyecto)
2.  [🚀 Características Principales](#-características-principales)
3.  [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
4.  [⚙️ Instalación y Uso Local](#️-instalación-y-uso-local)
5.  [📂 Estructura del Proyecto](#-estructura-del-proyecto)
6.  [🌐 Endpoints de la API](#-endpoints-de-la-api)
7.  [🤝 Contribuciones](#-contribuciones)
8.  [📄 Licencia](#-licencia)
9.  [📧 Contacto](#-contacto)

---

## 📖 Descripción del Proyecto

Este proyecto es una aplicación web completa que simula una plataforma de blogs. Fue desarrollado para demostrar habilidades en el desarrollo full-stack, abarcando desde la autenticación de usuarios hasta la gestión de contenido a través de una API RESTful. La aplicación cuenta con un diseño limpio y está orientada a una experiencia de usuario intuitiva.

---

## 🚀 Características Principales

* **Autenticación de Usuarios**: Sistema completo de registro e inicio de sesión con JSON Web Tokens (JWT).
* **Gestión de Artículos (CRUD)**: Los usuarios autenticados pueden crear, editar y eliminar sus propios artículos.
* **Interfaz Interactiva**: Frontend construido con React para una experiencia de usuario rápida y dinámica.
* **Diseño Responsivo**: La interfaz se adapta a diferentes tamaños de pantalla (móvil, tablet, escritorio).
* **API RESTful**: Backend robusto construido con Node.js y Express para gestionar todos los recursos.

---

## 🛠️ Tecnologías Utilizadas

A continuación se listan las tecnologías y herramientas principales que se utilizaron para construir este proyecto:

### **Frontend**
* **React.js**: Biblioteca principal para la interfaz de usuario.
* **React Router**: Para la gestión de rutas en el lado del cliente.
* **Axios**: Para realizar peticiones HTTP a la API.
* **Bootstrap / Tailwind CSS**: Para el diseño y los estilos.
* **Vite**: Como herramienta de construcción y servidor de desarrollo.

### **Backend**
* **Node.js**: Entorno de ejecución de JavaScript.
* **Express.js**: Framework para construir la API REST.
* **MongoDB**: Base de datos NoSQL para almacenar la información.
* **Mongoose**: ODM para modelar los datos de la aplicación.
* **JSON Web Token (JWT)**: Para la autenticación y autorización.
* **Bcrypt.js**: Para el hasheo de contraseñas.
* **Dotenv**: Para la gestión de variables de entorno.

---

## ⚙️ Instalación y Uso Local

Sigue estos pasos para levantar el proyecto en tu máquina local.

### **Pre-requisitos**
* Tener instalado [Node.js](https://nodejs.org/) (versión 16 o superior).
* Tener instalado [Git](https://git-scm.com/).
* Una instancia de MongoDB (local o en la nube como MongoDB Atlas).

### **Pasos**

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/Juan392/Blog.git](https://github.com/Juan392/Blog.git)
    cd Blog
    ```

2.  **Instala las dependencias del Backend:**
    ```bash
    cd backend
    npm install
    ```

3.  **Configura las variables de entorno del Backend:**
    * Crea un archivo `.env` en la carpeta `backend`.
    * Añade las siguientes variables (reemplazando los valores):
        ```
        PORT=5000
        MONGO_URI=tu_string_de_conexion_a_mongodb
        JWT_SECRET=tu_secreto_para_jwt
        ```

4.  **Inicia el servidor Backend:**
    ```bash
    npm start
    ```

5.  **Instala las dependencias del Frontend (en una nueva terminal):**
    ```bash
    cd frontend
    npm install
    ```

6.  **Inicia la aplicación Frontend:**
    ```bash
    npm run dev
    ```

¡Listo! La aplicación debería estar corriendo en `http://localhost:5173` (o el puerto que indique Vite) y conectada a tu servidor backend.

---

## 📂 Estructura del Proyecto

<img width="353" height="682" alt="image" src="https://github.com/user-attachments/assets/358b1a8d-56f0-4a3d-8d05-ddc013e8e9be" />}


---

## 🌐 Endpoints de la API

| Método HTTP | Ruta                  | Descripción                                   | Requiere Auth |
|-------------|-----------------------|-----------------------------------------------|---------------|
| `POST`      | `/api/users/register` | Registra un nuevo usuario.                    | No            |
| `POST`      | `/api/users/login`    | Inicia sesión y devuelve un token JWT.        | No            |
| `GET`       | `/api/posts`          | Obtiene una lista de todos los artículos.     | No            |
| `GET`       | `/api/posts/:id`      | Obtiene un artículo por su ID.                | No            |
| `POST`      | `/api/posts`          | Crea un nuevo artículo.                       | Sí            |
| `PUT`       | `/api/posts/:id`      | Actualiza un artículo existente.              | Sí            |
| `DELETE`    | `/api/posts/:id`      | Elimina un artículo.                          | Sí            |


---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar este proyecto, por favor sigue estos pasos:

1.  Haz un "Fork" del repositorio.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y haz "Commit" (`git commit -m 'Añade nueva funcionalidad'`).
4.  Haz "Push" a tu rama (`git push origin feature/nueva-funcionalidad`).
5.  Abre un "Pull Request".

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 📧 Contacto

**Juan Reyes** * **GitHub**: [Juan392](https://github.com/Juan392)
