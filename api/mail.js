const nodemailer = require('nodemailer');

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
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.ru',
        port: 465,
        secure: true,
        auth: {
          user: 'chat-helloworld@mail.ru',
          pass: 'Uw5dyegGhHQaVwtagSvP'
        }
      });
      
      await transporter.verify();
      
      return res.status(200).json({ 
        ok: true, 
        message: 'SMTP работает!'
      });
    }
    
    // ========== ТЕСТОВЫЕ СООБЩЕНИЯ ==========
    else if (action === 'get') {
      return res.status(200).json({
        ok: true,
        messages: [
          {
            id: 1,
            user: 'Система',
            text: 'Чат работает!',
            time: new Date().toISOString()
          }
        ]
      });
    }
    
    // ========== ОТПРАВКА ==========
    else if (action === 'send') {
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.ru',
        port: 465,
        secure: true,
        auth: {
          user: 'chat-helloworld@mail.ru',
          pass: 'Uw5dyegGhHQaVwtagSvP'
        }
      });
      
      await transporter.sendMail({
        from: 'chat-helloworld@mail.ru',
        to: 'chat-helloworld@mail.ru',
        subject: user || 'Чат',
        text: text || 'Пустое сообщение'
      });
      
      return res.status(200).json({ ok: true, message: 'Отправлено' });
    }
    
    else {
      return res.status(200).json({ 
        ok: true, 
        message: 'Доступные действия: test, get, send' 
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
};
