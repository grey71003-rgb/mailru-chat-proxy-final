const imaps = require('imap-simple');
const nodemailer = require('nodemailer');

const MAIL_CONFIG = {
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
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    if (action === 'test') {
      console.log('Подключаемся к:', MAIL_CONFIG.imap.host + ':' + MAIL_CONFIG.imap.port);
      
      const connection = await imaps.connect(MAIL_CONFIG.imap);
      await connection.openBox('INBOX');
      await connection.end();
      
      res.status(200).json({ ok: true, message: 'Подключение работает!' });
    } else {
      res.status(400).json({ error: 'Укажите action=test' });
    }
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
};