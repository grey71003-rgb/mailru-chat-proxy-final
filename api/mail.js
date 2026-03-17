const nodemailer = require('nodemailer');

const MAIL_CONFIG = {
  smtp: {
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
      user: 'chat-helloworld@mail.ru',
      pass: 'Uw5dyegGhHQaVwtagSvP'
    }
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    if (action === 'test') {
      console.log('📧 Тестируем SMTP подключение...');
      
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      
      // Отправляем тестовое письмо
      await transporter.sendMail({
        from: MAIL_CONFIG.smtp.auth.user,
        to: MAIL_CONFIG.smtp.auth.user,
        subject: 'Тест от чата',
        text: 'Если вы видите это письмо, SMTP работает!'
      });
      
      res.status(200).json({ ok: true, message: 'SMTP работает! Письмо отправлено' });
    } else {
      res.status(400).json({ error: 'Укажите action=test' });
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
};
