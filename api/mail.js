const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const MAIL_CONFIG = {
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;
  const { user, text } = req.body || {};

  try {
    // ========== ТЕСТ ==========
    if (action === 'test-smtp') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      return res.status(200).json({ ok: true, message: 'SMTP работает' });
    }
    
    // ========== ПОЛУЧЕНИЕ ПИСЕМ ==========
    else if (action === 'get') {
      console.log('📥 Загружаем письма из почты...');
      
      const messages = await getMessagesFromMail();
      return res.status(200).json({ ok: true, messages });
    }
    
    // ========== ОТПРАВКА ==========
    else if (action === 'send') {
      console.log('📤 Отправляем письмо...');
      
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      
      await transporter.sendMail({
        from: MAIL_CONFIG.smtp.auth.user,
        to: MAIL_CONFIG.smtp.auth.user,
        subject: user,
        text: text
      });
      
      return res.status(200).json({ ok: true, message: 'Отправлено' });
    }
    
    else {
      return res.status(400).json({ error: 'Неизвестное действие' });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Функция для получения писем из почты
async function getMessagesFromMail() {
  return new Promise((resolve, reject) => {
    const imap = new Imap(MAIL_CONFIG.imap);
    const messages = [];
    
    imap.once('ready', () => {
      console.log('✅ IMAP подключен');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`📬 Папка INBOX открыта, всего писем: ${box.messages.total}`);
        
        // Получаем последние 20 писем
        imap.search(['ALL'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          
          const lastMessages = results.slice(-20); // последние 20
          
          if (lastMessages.length === 0) {
            imap.end();
            resolve([]);
            return;
          }
          
          let processed = 0;
          const fetch = imap.fetch(lastMessages, { bodies: '' });
          
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) return;
                
                // Извлекаем отправителя и текст
                const from = parsed.from?.text || 'Неизвестный';
                const user = from.split('<')[0].trim() || 'Неизвестный';
                
                messages.push({
                  id: parsed.messageId || Date.now(),
                  user: user,
                  text: parsed.text || parsed.subject || '...',
                  time: parsed.date || new Date().toISOString()
                });
              });
            });
            
            msg.once('end', () => {
              processed++;
              if (processed === lastMessages.length) {
                imap.end();
              }
            });
          });
          
          fetch.once('error', (err) => {
            reject(err);
          });
          
          fetch.once('end', () => {
            console.log(`✅ Загружено ${messages.length} писем`);
            resolve(messages.reverse()); // Переворачиваем, чтобы новые были внизу
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
