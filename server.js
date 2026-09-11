const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let botProcess = null;
let botStatus = 'Offline 🔴';

// Уеб интерфейс
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="bg">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Bot Panel</title>
      <style>
        body { font-family: sans-serif; background: #121214; color: #fff; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .card { background: #202225; padding: 20px; border-radius: 8px; width: 100%; max-width: 600px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        h2 { text-align: center; margin-top: 0; color: #5865F2; }
        label { font-weight: bold; margin-top: 10px; display: block; }
        input, textarea { width: 100%; padding: 10px; margin-top: 5px; border-radius: 5px; border: 1px solid #4f545c; background: #2f3136; color: #fff; box-sizing: border-box; }
        textarea { height: 200px; font-family: monospace; resize: vertical; }
        .buttons { display: flex; gap: 10px; margin-top: 15px; }
        button { flex: 1; padding: 12px; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-start { background: #43b581; color: white; }
        .btn-stop { background: #f04747; color: white; }
        #status-display { text-align: center; margin: 15px 0; font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Управление на Discord Бот</h2>
        <div id="status-display">Статус: <span id="status">${botStatus}</span></div>

        <label>Discord Token:</label>
        <input type="password" id="token" placeholder="Постави bot токена тук">

        <label>Код на бота (index.js):</label>
        <textarea id="code" placeholder="Постави JavaScript кода тук..."></textarea>

        <div class="buttons">
          <button class="btn-start" onclick="startBot()">▶ Старт</button>
          <button class="btn-stop" onclick="stopBot()">⏹ Стоп</button>
        </div>
      </div>

      <script>
        async function startBot() {
          const token = document.getElementById('token').value.trim();
          const code = document.getElementById('code').value;

          if (!token || !code) {
            alert('Моля, попълни и токена, и кода!');
            return;
          }

          const res = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, code })
          });
          const data = await res.json();
          alert(data.message);
          checkStatus();
        }

        async function stopBot() {
          const res = await fetch('/api/stop', { method: 'POST' });
          const data = await res.json();
          alert(data.message);
          checkStatus();
        }

        async function checkStatus() {
          const res = await fetch('/api/status');
          const data = await res.json();
          document.getElementById('status').innerText = data.status;
        }

        setInterval(checkStatus, 3000);
      </script>
    </body>
    </html>
  `);
});

// API статус
app.get('/api/status', (req, res) => {
  res.json({ status: botStatus });
});

// Стартиране на процеса
app.post('/api/start', (req, res) => {
  const { token, code } = req.body;

  if (botProcess) {
    return res.json({ message: 'Ботът вече работи! Натисни Стоп първо, ако искаш да го рестартираш.' });
  }

  // Записва кода във временен файл
  fs.writeFileSync('temp_bot.js', code);

  // Пуска файла в отделен процес с подадения токен
  botProcess = spawn('node', ['temp_bot.js'], {
    env: { ...process.env, DISCORD_TOKEN: token }
  });

  botStatus = 'Online 🟢';

  botProcess.stdout.on('data', (data) => console.log(`[BOT]: ${data}`));
  botProcess.stderr.on('data', (data) => console.error(`[BOT ГРЕШКА]: ${data}`));

  botProcess.on('close', (exitCode) => {
    console.log(`Ботът спря с код: ${exitCode}`);
    botProcess = null;
    botStatus = 'Offline 🔴';
  });

  res.json({ message: 'Ботът беше стартиран успешно!' });
});

// Спиране на процеса
app.post('/api/stop', (req, res) => {
  if (!botProcess) {
    return res.json({ message: 'Ботът не е стартиран.' });
  }

  botProcess.kill('SIGTERM');
  botProcess = null;
  botStatus = 'Offline 🔴';

  res.json({ message: 'Ботът беше спрян!' });
});

app.listen(PORT, () => {
  console.log(`Панелът работи на порт ${PORT}`);
});
