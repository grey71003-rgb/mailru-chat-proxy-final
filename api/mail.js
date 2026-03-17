const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

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
    // ========== ТЕСТ ==========
    if (action === 'test') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      return res.status(200).json({ ok: true, message: 'SMTP работает!' });
    }
    
    // ========== ОТПРАВКА (во Входящие) ==========
    else if (action === 'send') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      
      // Отправляем письмо и сохраняем во Входящие
      await transporter.sendMail({
        from: MAIL_CONFIG.user,
        to: MAIL_CONFIG.user,
        subject: `[Чат] ${user}`,
        text: text,
        headers: {
          'X-Chat-Message': 'true',
          'X-Chat-User': user
        }
      });
      
      return res.status(200).json({ ok: true, message: 'Отправлено' });
    }
    
    // ========== ПОЛУЧЕНИЕ (из Входящих) ==========
    else if (action === 'get') {
      const messages = await getMessages();
      return res.status(200).json({ ok: true, messages });
    }
    
    else {
      return res.status(200).json({ ok: true, message: 'Используйте: test, send, get' });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
    return res.status(500).json({ error: error.message });
  }
};

function getMessages() {
  return new Promise((resolve, reject) => {
    const imap = new Imap(MAIL_CONFIG.imap);
    const messages = [];
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Получаем все письма
        imap.search(['ALL'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          
          const lastMessages = results.slice(-50); // последние 50
          
          if (lastMessages.length === 0) {
            imap.end();
            resolve([]);
            return;
          }
          
          let processed = 0;
          const fetch = imap.fetch(lastMessages, { bodies: '' });
          
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) return;
                
                // Определяем отправителя
                let from = 'Неизвестный';
                
                // Сначала проверяем заголовок X-Chat-User
                if (parsed.headers && parsed.headers['x-chat-user']) {
                  from = parsed.headers['x-chat-user'];
                }
                // Если нет, берем из темы
                else if (parsed.subject && parsed.subject.startsWith('[Чат]')) {
                  from = parsed.subject.replace('[Чат]', '').trim();
                }
                // Если ничего не нашли, берем из From
                else if (parsed.from && parsed.from.text) {
                  from = parsed.from.text.split('<')[0].trim() || 'Неизвестный';
                }
                
                messages.push({
                  id: parsed.messageId || Date.now() + Math.random(),
                  user: from,
                  text: parsed.text || parsed.subject || '...',
                  time: parsed.date || new Date().toISOString()
                });
                
                processed++;
                if (processed === lastMessages.length) {
                  imap.end();
                  // Сортируем по времени (старые сверху)
                  messages.sort((a, b) => new Date(a.time) - new Date(b.time));
                  resolve(messages);
                }
              });
            });
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
