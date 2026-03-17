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

  try {
    // Просто тест SMTP
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
    
    // Просто тестовый ответ
    else if (action === 'get') {
      return res.status(200).json({
        ok: true,
        messages: [
          {
            id: 1,
            user: 'Тест',
            text: 'Это тестовое сообщение',
            time: new Date().toISOString()
          }
        ]
      });
    }
    
    else {
      return res.status(200).json({ 
        ok: true, 
        message: 'API работает. Используйте ?action=test или ?action=get' 
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
};
