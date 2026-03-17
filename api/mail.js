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
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    // ========== ТЕСТ SMTP ==========
    if (action === 'test-smtp') {
      const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
      await transporter.verify();
      res.status(200).json({ ok: true, message: 'SMTP работает' });
    }
    
    // ========== ТЕСТ IMAP ==========
    else if (action === 'test-imap') {
      console.log('📡 Тестируем IMAP...');
      
      const imap = new Imap(MAIL_CONFIG.imap);
      
      // Оборачиваем в Promise
      const result = await new Promise((resolve, reject) => {
        imap.once('ready', () => {
          console.log('✅ IMAP соединение установлено');
          
          imap.openBox('INBOX', false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('✅ Папка INBOX открыта');
            
            // Получаем последние 3 письма для проверки
            imap.search(['ALL'], (err, results) => {
              if (err) {
                reject(err);
                return;
              }
              
              const lastMessages = results.slice(-3);
              console.log(`📨 Найдено писем: ${results.length}`);
              
              if (lastMessages.length > 0) {
                const fetch = imap.fetch(lastMessages, { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'] });
                
                const messages = [];
                fetch.on('message', (msg) => {
                  const messageInfo = {};
                  
                  msg.on('body', (stream, info) => {
                    let buffer = '';
                    stream.on('data', (chunk) => {
                      buffer += chunk.toString('utf8');
                    });
                    stream.on('end', () => {
                      messageInfo.headers = buffer;
                    });
                  });
                  
                  msg.once('end', () => {
                    messages.push(messageInfo);
                  });
                });
                
                fetch.once('end', () => {
                  imap.end();
                  resolve({ success: true, count: results.length, messages: messages.length });
                });
              } else {
                imap.end();
                resolve({ success: true, count: 0 });
              }
            });
          });
        });
        
        imap.once('error', (err) => {
          reject(err);
        });
        
        imap.once('end', () => {
          console.log('📡 IMAP соединение закрыто');
        });
        
        imap.connect();
      });
      
      res.status(200).json({ 
        ok: true, 
        message: 'IMAP работает!', 
        details: result 
      });
    }
    
    // ========== ОТПРАВКА СООБЩЕНИЯ ==========
    else if (action === 'send') {
      const { user, text } = req.body || {};
      
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
      console.log('📥 Получаем последние сообщения...');
      
      const messages = await new Promise((resolve, reject) => {
        const imap = new Imap(MAIL_CONFIG.imap);
        const results = [];
        
        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }
            
            imap.search(['ALL'], (err, uids) => {
              if (err) {
                reject(err);
                return;
              }
              
              const lastUids = uids.slice(-20); // последние 20 писем
              
              if (lastUids.length === 0) {
                imap.end();
                resolve([]);
                return;
              }
              
              const fetch = imap.fetch(lastUids, { 
                bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
                struct: true
              });
              
              fetch.on('message', (msg, seqno) => {
                const message = { id: seqno };
                
                msg.on('body', (stream, info) => {
                  if (info.which === 'TEXT') {
                    let text = '';
                    stream.on('data', (chunk) => { text += chunk.toString('utf8'); });
                    stream.on('end', () => { message.text = text; });
                  } else {
                    let header = '';
                    stream.on('data', (chunk) => { header += chunk.toString('utf8'); });
                    stream.on('end', () => { 
                      // Парсим заголовки простым способом
                      const fromMatch = header.match(/FROM[^<]*<([^>]+)/i);
                      const subjectMatch = header.match(/SUBJECT[^:]*:\s*(.+)/i);
                      const dateMatch = header.match(/DATE[^:]*:\s*(.+)/i);
                      
                      message.user = fromMatch ? fromMatch[1].split('@')[0] : 'Неизвестный';
                      message.subject = subjectMatch ? subjectMatch[1].trim() : 'Без темы';
                      message.time = dateMatch ? dateMatch[1].trim() : new Date().toISOString();
                    });
                  }
                });
                
                msg.once('end', () => {
                  if (message.user && message.text) {
                    results.push(message);
                  }
                });
              });
              
              fetch.once('end', () => {
                imap.end();
                resolve(results);
              });
            });
          });
        });
        
        imap.once('error', reject);
        imap.connect();
      });
      
      res.status(200).json({ 
        ok: true, 
        messages: messages.reverse()
      });
    }
    
    else {
      res.status(400).json({ 
        error: 'Доступные действия: test-smtp, test-imap, send, get' 
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500.json({ 
      ok: false, 
      error: error.message 
    });
  }
};
