const nodemailer = require('nodemailer');
const Imap = require('imap');

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
  },
  
  imap: {
    user: 'chat-helloworld@mail.ru',
    password: 'Uw5dyegGhHQaVwtagSvP',
    host: 'imap.mail.ru',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
};

module.exports = async function handler(req, res) {
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
    
    // ========== ТЕСТ IMAP ==========
    else if (action === 'test-imap') {
      const messages = await getSimpleMessages();
      return res.status(200).json({ ok: true, count: messages.length, messages });
    }
    
    // ========== ПОЛУЧЕНИЕ СООБЩЕНИЙ ==========
    else if (action === 'get') {
      const messages = await getSimpleMessages();
      return res.status(200).json({ ok: true, messages });
    }
    
    else {
      return res.status(200).json({ 
        ok: true, 
        message: 'Доступные действия: test, send, test-imap, get' 
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Простая функция получения писем
function getSimpleMessages() {
  return new Promise((resolve, reject) => {
    const imap = new Imap(MAIL_CONFIG.imap);
    const messages = [];
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Получаем последние 5 писем
        imap.search(['ALL'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          
          const lastMessages = results.slice(-5);
          
          if (lastMessages.length === 0) {
            imap.end();
            resolve([]);
            return;
          }
          
          let processed = 0;
          const fetch = imap.fetch(lastMessages, { 
            bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
            struct: true
          });
          
          fetch.on('message', (msg) => {
            const message = {};
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.on('end', () => {
                if (info.which === 'TEXT') {
                  message.text = buffer.slice(0, 200); // только начало текста
                } else {
                  // Парсим заголовки
                  const from = buffer.match(/From:.*?<(.+?)>/i) || buffer.match(/From:\s*(.+)/i);
                  const subject = buffer.match(/Subject:\s*(.+)/i);
                  const date = buffer.match(/Date:\s*(.+)/i);
                  
                  message.user = from ? from[1].split('@')[0] : 'Неизвестный';
                  message.subject = subject ? subject[1].trim() : 'Без темы';
                  message.time = date ? date[1].trim() : new Date().toISOString();
                }
              });
            });
            
            msg.once('end', () => {
              messages.push({
                id: Date.now() + Math.random(),
                user: message.user || 'Неизвестный',
                text: message.text || message.subject || '...',
                time: message.time || new Date().toISOString()
              });
              
              processed++;
              if (processed === lastMessages.length) {
                imap.end();
              }
            });
          });
          
          fetch.once('end', () => {
            resolve(messages.reverse());
          });
          
          fetch.once('error', (err) => {
            reject(err);
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      reject(err);
    });
    
    imap.connect();
  });
}
