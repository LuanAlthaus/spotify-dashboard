// server.js
// Backend simples: autentica no Spotify (uma vez, via /login),
// guarda o refresh_token, e expõe /api/now-playing para o painel consultar.

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4123;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/callback`;
const TOKEN_FILE = path.join(__dirname, 'tokens.json');

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

function loadTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
}

app.use(express.static(path.join(__dirname, 'public')));

// Passo 1: abrir esta rota no navegador UMA VEZ para autorizar o app
app.get('/login', (req, res) => {
  const scope = 'user-read-currently-playing user-read-playback-state';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Passo 2: Spotify redireciona pra cá com o código de autorização
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Código de autorização ausente.');

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body,
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    saveTokens({ refresh_token: data.refresh_token });
    res.send('<h2>Conectado ao Spotify com sucesso! Pode fechar esta aba e abrir o painel.</h2>');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao autenticar: ' + err.message);
  }
});

async function getAccessToken() {
  const tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body,
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

// Rota que o painel consulta a cada poucos segundos
app.get('/api/now-playing', async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 204 || response.status === 202) {
      return res.json({ playing: false });
    }

    const data = await response.json();

    if (!data || !data.item) {
      return res.json({ playing: false });
    }

    res.json({
      playing: data.is_playing,
      track: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(', '),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url || null,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
    });
  } catch (err) {
    if (err.message === 'NOT_AUTHENTICATED') {
      return res.json({ playing: false, needsAuth: true });
    }
    console.error(err);
    res.status(500).json({ playing: false, error: err.message });
  }
});

function getCpuUsage() {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      let idleDiff = 0;
      let totalDiff = 0;
      for (let i = 0; i < start.length; i++) {
        const s = start[i].times;
        const e = end[i].times;
        const idle = e.idle - s.idle;
        const total = (e.user - s.user) + (e.nice - s.nice) + (e.sys - s.sys) + (e.idle - s.idle) + (e.irq - s.irq);
        idleDiff += idle;
        totalDiff += total;
      }
      const usage = Math.round(100 - (100 * idleDiff / totalDiff));
      resolve(usage);
    }, 200);
  });
}

// Rota que o painel consulta pra mostrar uso de CPU/RAM do servidor
app.get('/api/system-stats', async (req, res) => {
  const cpu = await getCpuUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ram = Math.round(100 * (totalMem - freeMem) / totalMem);
  res.json({ cpu, ram });
});

app.listen(PORT, () => {
  console.log(`Painel rodando em http://localhost:${PORT}`);
  console.log(`Se ainda não conectou o Spotify, acesse http://localhost:${PORT}/login uma vez.`);
});
