const nodemailer = require('nodemailer');
const Imap = require('imap');

const MAIL_CONFIG = {
  email: 'chat-helloworld@mail.ru',
  password: 'Uw5dyegGhHQaVwtagSvP',
  imap: {
    user: 'chat-helloworld@mail.ru',
    password: 'Uw5dyegGhHQaVwtagSvP',
    host: 'imap.mail.ru',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  },
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
  // ========== ПРАВИЛЬНЫЕ CORS ЗАГОЛОВКИ ==========
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // ========== ОБРАБОТКА OPTIONS (preflight) ==========
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;
  const { user, text } = req.body || {};

  try {
    // ========== ТЕСТ SMTP ==========
    if (action === 'test-smtp') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      res.status(200).json({ ok: true, message: 'SMTP работает' });
    }
    
    // ========== ТЕСТ IMAP ==========
    else if (action === 'test-imap') {
      const imap = new Imap(MAIL_CONFIG.imap);
      
      await new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err) => {
            if (err) reject(err);
            else {
              imap.end();
              resolve();
            }
          });
        });
        imap.once('error', reject);
        imap.connect();
      });
      
      res.status(200).json({ ok: true, message: 'IMAP работает' });
    }
    
    // ========== ОТПРАВКА СООБЩЕНИЯ ==========
    else if (action === 'send') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      
      await transporter.sendMail({
        from: MAIL_CONFIG.smtp.auth.user,
        to: MAIL_CONFIG.smtp.auth.user,
        subject: user || 'Чат',
        text: text || 'Пустое сообщение'
      });
      
      res.status(200).json({ ok: true, message: 'Отправлено' });
    }
    
    // ========== ПОЛУЧЕНИЕ СООБЩЕНИЙ ==========
    else if (action === 'get') {
      // Простой ответ для теста
      res.status(200).json({ 
        ok: true, 
        messages: [
          {
            id: 1,
            user: 'Система',
            text: 'Добро пожаловать в чат!',
            time: new Date().toISOString()
          }
        ]
      });
    }
    
    else {
      res.status(400).json({ error: 'Неизвестное действие' });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
};
