const nodemailer = require('nodemailer');

const MAIL_CONFIG = {
  user: 'chat-helloworld@mail.ru',
  password: 'Uw5dyegGhHQaVwtagSvP',
  
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  const { user, text } = req.body || {};

  try {
    // ========== ТЕСТ SMTP ==========
    if (action === 'test') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      return res.status(200).json({ ok: true, message: 'SMTP работает!' });
    }
    
    // ========== ОТПРАВКА ==========
    else if (action === 'send') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      
      await transporter.sendMail({
        from: MAIL_CONFIG.user,
        to: MAIL_CONFIG.user,
        subject: user || 'Чат',
        text: text || '...'
      });
      
      return res.status(200).json({ ok: true, message: 'Отправлено' });
    }
    
    // ========== ВРЕМЕННО ТЕСТОВЫЕ СООБЩЕНИЯ ==========
    else if (action === 'get') {
      return res.status(200).json({
        ok: true,
        messages: [
          {
            id: 1,
            user: 'Система',
            text: 'Чат работает! Отправьте сообщение, чтобы проверить',
            time: new Date().toISOString()
          }
        ]
      });
    }
    
    else {
      return res.status(200).json({ 
        ok: true, 
        message: 'Доступные действия: test, send, get' 
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    return res.status(500).json({ error: error.message });
  }
};
