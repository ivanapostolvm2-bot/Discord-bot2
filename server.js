const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let botProcess = null;
let botStatus = 'Offline 🔴';
let botLogs = '';

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="bg">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Bot Panel</title>
      <style>
        body { font-family: sans-serif; background: #121214; color: #fff; padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .card { background: #202225; padding: 20px; border-radius: 8px; width: 100%; max-width: 600px; box-sizing: border-box; }
        h2 { text-align: center; color: #5865F2; margin-top: 0; }
        label { font-weight: bold; margin-top: 10px; display: block; }
        input, textarea { width: 100%; padding: 10px; margin-top: 5px; border-radius: 5px; border: 1px solid #4f545c; background: #2f3136; color: #fff; box-sizing: border-box; }
        textarea { height: 140px; font-family: monospace; }
        #logs { height: 120px; background: #000; color: #0f0; overflow-y: scroll; white-space: pre-wrap; font-size: 12px; }
        .buttons { display: flex; gap: 10px; margin: 15px 0; }
        button { flex: 1; padding: 12px; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-start { background: #43b581; color: white; }
        .btn-stop { background: #f04747; color: white; }
        #status-display { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Управление на Discord Бот</h2>
        <div id="status-display">Статус: <span id="status">${botStatus}</span></div>

        <label>Discord Token:</label>
        <input type="password" id="token" placeholder="Постави bot токена">

        <label>Код на бота (index.js):</label>
        <textarea id="code" placeholder="Постави JavaScript кода..."></textarea>

        <div class="buttons">
          <button class="btn-start" onclick="startBot()">▶ Старт</button>
          <button class="btn-stop" onclick="stopBot()">⏹ Стоп</button>
        </div>

        <label>Конзола (Грешки / Логове):</label>
        <div id="logs">Чакане за стартиране...</div>
      </div>

      <script>
        async function startBot() {
          const token = document.getElementById('token').value.trim();
          const code = document.getElementById('code').value;
          if (!token || !code) return alert('Попълни токена и кода!');

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
          document.getElementById('logs').innerText = data.logs || 'Няма логове.';
        }

        setInterval(checkStatus, 2000);
      </script>
    </body>
    </html>
  `);
});

app.get('/api/status', (req, res) => {
  res.json({ status: botStatus, logs: botLogs });
});

app.post('/api/start', (req, res) => {
  const { token, code } = req.body;
  if (botProcess) return res.json({ message: 'Ботът вече е пуснат! Цъкни Стоп първо.' });

  botLogs = 'Стартиране...\n';
  fs.writeFileSync('temp_bot.js', code);

  botProcess = spawn('node', ['temp_bot.js'], {
    env: { ...process.env, DISCORD_TOKEN: token }
  });

  botStatus = 'Online 🟢';

  botProcess.stdout.on('data', (data) => {
    botLogs += data.toString();
  });

  botProcess.stderr.on('data', (data) => {
    botLogs += 'ГРЕШКА: ' + data.toString();
  });

  botProcess.on('close', (code) => {
    botLogs += `\n[Процесът спря с код ${code}]`;
    botProcess = null;
    botStatus = 'Offline 🔴';
  });

  res.json({ message: 'Ботът се стартира!' });
});

app.post('/api/stop', (req, res) => {
  if (!botProcess) return res.json({ message: 'Ботът не работи.' });
  botProcess.kill('SIGTERM');
  botProcess = null;
  botStatus = 'Offline 🔴';
  botLogs += '\n[Спрян от потребителя]';
  res.json({ message: 'Ботът беше спрян!' });
});

app.listen(PORT, () => {
  console.log(`Панелът слуша на ${PORT}`);
});
