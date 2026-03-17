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
    if (action === 'test') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      return res.status(200).json({ ok: true, message: 'SMTP работает!' });
    }
    
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
    
    else if (action === 'get') {
      // Читаем из нескольких папок
      const [inbox, sent, self] = await Promise.all([
        getMessagesFromFolder('INBOX'),
        getMessagesFromFolder('Отправленные'),
        getMessagesFromFolder('Письма себе')
      ]);
      
      // Объединяем все сообщения
      const allMessages = [...inbox, ...sent, ...self];
      
      // Сортируем по времени
      allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
      
      return res.status(200).json({ 
        ok: true, 
        messages: allMessages,
        stats: {
          inbox: inbox.length,
          sent: sent.length,
          self: self.length,
          total: allMessages.length
        }
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

// Функция для получения писем из конкретной папки
function getMessagesFromFolder(folderName) {
  return new Promise((resolve, reject) => {
    const imap = new Imap(MAIL_CONFIG.imap);
    const messages = [];
    
    imap.once('ready', () => {
      // Пробуем открыть папку
      imap.openBox(folderName, false, (err, box) => {
        if (err) {
          // Если папка не существует, возвращаем пустой массив
          console.log(`Папка ${folderName} не найдена`);
          imap.end();
          resolve([]);
          return;
        }
        
        console.log(`📬 Читаем папку ${folderName}, писем: ${box.messages.total}`);
        
        // Получаем последние 30 писем из папки
        imap.search(['ALL'], (err, results) => {
          if (err) {
            imap.end();
            resolve([]);
            return;
          }
          
          const lastMessages = results.slice(-30);
          
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
                let isOwn = false;
                
                if (parsed.from && parsed.from.text) {
                  from = parsed.from.text.split('<')[0].trim() || 'Неизвестный';
                  isOwn = parsed.from.text.includes(MAIL_CONFIG.user);
                }
                
                // Если письмо в папке "Отправленные", значит оно наше
                if (folderName === 'Отправленные' || folderName === 'Письма себе') {
                  isOwn = true;
                  // Для отправленных писем имя может быть в теме
                  if (parsed.subject && !parsed.subject.includes('Chat message')) {
                    from = parsed.subject;
                  }
                }
                
                messages.push({
                  id: parsed.messageId || Date.now() + Math.random(),
                  user: from,
                  text: parsed.text || parsed.subject || '...',
                  time: parsed.date || new Date().toISOString(),
                  folder: folderName,
                  isOwn: isOwn
                });
                
                processed++;
                if (processed === lastMessages.length) {
                  imap.end();
                }
              });
            });
          });
          
          fetch.once('end', () => {
            resolve(messages);
          });
          
          fetch.once('error', (err) => {
            console.log(`Ошибка чтения ${folderName}:`, err);
            resolve([]);
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      console.log(`Ошибка подключения к ${folderName}:`, err);
      resolve([]);
    });
    
    imap.connect();
  });
}
