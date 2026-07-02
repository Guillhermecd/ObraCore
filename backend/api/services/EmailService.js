const nodemailer = require('nodemailer');

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };
}

function frontendUrl(path) {
  const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

module.exports = {
  createTransporter() {
    return nodemailer.createTransport(smtpConfig());
  },

  async verify() {
    const transporter = this.createTransporter();
    await transporter.verify();
  },

  async sendMail({ to, subject, text }) {
    if (process.env.EMAIL_ENABLED === 'false') {
      sails.log.info(`E-mail desabilitado. Mensagem ignorada para ${to}: ${subject}`);
      return;
    }

    const transporter = this.createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@bimd.local',
      to,
      subject,
      text,
    });
  },

  async sendVerificationEmail(user) {
    const link = frontendUrl(`/verify-email?token=${encodeURIComponent(user.emailVerificationToken)}`);
    await this.sendMail({
      to: user.email,
      subject: 'Valide seu e-mail',
      text: `Olá${user.name ? `, ${user.name}` : ''}.\n\nValide seu e-mail acessando: ${link}`,
    });
  },

  async sendPasswordResetEmail(user) {
    const link = frontendUrl(`/reset-password/${encodeURIComponent(user.passwordResetToken)}`);
    await this.sendMail({
      to: user.email,
      subject: 'Redefinição de senha',
      text: `Olá${user.name ? `, ${user.name}` : ''}.\n\nRedefina sua senha acessando: ${link}`,
    });
  },
};
