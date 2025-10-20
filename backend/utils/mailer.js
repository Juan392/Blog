const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo de verificación a la dirección especificada.
 * @param {string} userEmail - El correo del destinatario.
 * @param {string} verificationToken - El token único para la verificación.
 */
async function sendVerificationEmail(userEmail, verificationToken) {
    const verificationUrl = `https://blog-production-bfac.up.railway.app/api/auth/verify-email?token=${verificationToken}`;

    try {
        await resend.emails.send({
            from: 'Academia Books <no-reply@academiabooks.com>',
            to: userEmail,
            subject: 'Verifica tu cuenta en Academia Books',
            html: `
                <h1>¡Bienvenido a Academia Books!</h1>
                <p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu cuenta. El enlace expirará en 24 horas.</p>
                <a href="${verificationUrl}" style="padding:10px 20px;color:white;background-color:#007bff;text-decoration:none;border-radius:5px;">
                    Verificar mi cuenta
                </a>
                <p>Si no te registraste en nuestro sitio, por favor ignora este correo.</p>
            `
        });
        console.log("✅ Correo de verificación enviado con éxito");
    } catch (error) {
        console.error(`❌ Error al enviar correo de verificación:`, error);
    }
}

module.exports = { sendVerificationEmail };
