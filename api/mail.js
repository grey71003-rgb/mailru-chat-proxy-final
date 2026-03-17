const imaps = require('imap-simple');
const nodemailer = require('nodemailer');

const MAIL_CONFIG = {
  imap: {
    user: 'chat-helloworld@mail.ru',
    password: 'Uw5dyegGhHQaVwtagSvP',
    host: 'imap.mail.ru',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    // Добавляем подробное логирование
    debug: console.log,
    log: console.log
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
  
  const { action } = req.query;

  try {
    if (action === 'test') {
      const result = {
        smtp: false,
        imap: false,
        logs: []
      };
      
      // Тест SMTP
      try {
        console.log('📧 Тест SMTP...');
        const transporter = nodemailer.createTransport(MAIL_CONFIG.smtp);
        await transporter.verify();
        result.smtp = true;
        result.logs.push('✅ SMTP OK');
      } catch (e) {
        result.logs.push(`❌ SMTP ошибка: ${e.message}`);
      }
      
      // Тест IMAP
      try {
        console.log('📡 Тест IMAP...');
        const connection = await imaps.connect(MAIL_CONFIG.imap);
        result.logs.push('✅ IMAP соединение установлено');
        
        await connection.openBox('INBOX');
        result.logs.push('✅ Папка INBOX открыта');
        
        await connection.end();
        result.imap = true;
      } catch (e) {
        result.logs.push(`❌ IMAP ошибка: ${e.message}`);
        if (e.cause) result.logs.push(`Причина: ${e.cause}`);
      }
      
      res.status(200).json(result);
    }
    
    else if (action === 'simple-imap') {
      // Максимально упрощенный IMAP тест
      const Imap = require('imap');
      
      const imap = new Imap({
        user: 'chat-helloworld@mail.ru',
        password: 'Uw5dyegGhHQaVwtagSvP',
        host: 'imap.mail.ru',
        port: 993,
        tls: true
      });
      
      imap.once('ready', () => {
        res.status(200).json({ ok: true, message: 'IMAP готов' });
        imap.end();
      });
      
      imap.once('error', (err) => {
        res.status(500).json({ ok: false, error: err.message });
      });
      
      imap.connect();
    }
    
    else {
      res.status(400).json({ error: 'Используйте action=test или action=simple-imap' });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
};
