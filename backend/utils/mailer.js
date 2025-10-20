const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_APP_PASSWORD 
    }
});

/**
 * Envía un correo de verificación a la dirección especificada.
 * @param {string} userEmail El correo del destinatario.
 * @param {string} verificationToken El token único para la verificación.
 */
async function sendVerificationEmail(userEmail, verificationToken) {
    const verificationUrl = `https://blog-production-bfac.up.railway.app/api/auth/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"Academia Books" <${process.env.EMAIL_USER}>`, 
        to: userEmail,
        subject: 'Verifica tu cuenta en Academia Books',
        html: `
            <h1>¡Bienvenido a Academia Books!</h1>
            <p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu cuenta. El enlace expirará en 24 horas.</p>
            <a href="${verificationUrl}" style="padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
                Verificar mi cuenta
            </a>
            <p>Si no te registraste en nuestro sitio, por favor ignora este correo.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo de verificación enviado`);
    } catch (error) {
        console.error(`❌ Error al enviar correo de verificación:`);
    }
}

module.exports = { sendVerificationEmail };