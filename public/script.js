// Os dados pessoais (nome, cidade, coordenadas) ficam em config.js
// As frases do dia ficam em frases.js

// ---------- Palco fixo 1920x1080 (escala para qualquer tela) ----------
const stageEl = document.getElementById('stage');

function ajustarPalco() {
  const escala = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stageEl.style.transform = `translate(-50%, -50%) scale(${escala})`;
}
ajustarPalco();
window.addEventListener('resize', ajustarPalco);

// ---------- Relógio, data e frase do dia ----------
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const todayDateEl = document.getElementById('today-date');
const phraseEl = document.getElementById('today-phrase');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

let ultimoDia = -1;

function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  clockEl.textContent = `${hh}:${mm}`;
  dateEl.textContent = `${DIAS[now.getDay()]}, ${now.getDate()} ${MESES[now.getMonth()]}`;
  todayDateEl.textContent = `${now.getDate()} de ${MESES_LONGOS[now.getMonth()]}`;

  // número do dia (muda à meia-noite) -> escolhe a frase da lista
  const diaAtual = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  if (diaAtual !== ultimoDia) {
    ultimoDia = diaAtual;
    phraseEl.textContent = FRASES[diaAtual % FRASES.length];
  }
}
tickClock();
setInterval(tickClock, 1000);

// ---------- Tocando agora ----------
const npIdle = document.getElementById('np-idle');
const npActive = document.getElementById('np-active');
const npArt = document.getElementById('np-art');
const npTrack = document.getElementById('np-track');
const npArtist = document.getElementById('np-artist');
const npProgress = document.getElementById('np-progress');
const npTimeNow = document.getElementById('np-time-now');
const npTimeLeft = document.getElementById('np-time-left');
const iconPause = document.getElementById('icon-pause');
const iconPlay = document.getElementById('icon-play');
const queueEl = document.getElementById('queue');
const queueList = document.getElementById('queue-list');

// Estado atual da música (a barra de progresso anda sozinha entre as consultas)
let temMusica = false;
let tocando = false;
let progressoMs = 0;
let duracaoMs = 0;
let recebidoEm = 0;
let musicaId = null;
let timerConsulta = null;

function formatarTempo(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const seg = String(total % 60).padStart(2, '0');
  return `${min}:${seg}`;
}

function agendarConsulta(ms) {
  clearTimeout(timerConsulta);
  timerConsulta = setTimeout(fetchNowPlaying, ms);
}

function mostrarSilencio() {
  temMusica = false;
  tocando = false;
  musicaId = null;
  npIdle.hidden = false;
  npActive.hidden = true;
  queueEl.hidden = true;
  animarBarras();
}

function mostrarPlayPause() {
  iconPause.style.display = tocando ? 'block' : 'none';
  iconPlay.style.display = tocando ? 'none' : 'block';
}

async function fetchNowPlaying() {
  let proxima = 1000; // consulta a cada 1 segundo
  try {
    const res = await fetch('/api/now-playing');
    const data = await res.json();

    if (data.rateLimited) {
      proxima = (data.retryAfter || 5) * 1000; // Spotify pediu pra esperar
    } else if (!data.track) {
      mostrarSilencio();
    } else {
      const tocandoAntes = tocando;

      temMusica = true;
      tocando = data.playing;
      progressoMs = data.progressMs;
      duracaoMs = data.durationMs;
      recebidoEm = performance.now();

      npIdle.hidden = true;
      npActive.hidden = false;

      // música nova: troca capa, textos e busca a fila
      if (data.id !== musicaId) {
        musicaId = data.id;
        npTrack.textContent = data.track;
        npArtist.textContent = data.artist;
        if (data.albumArt) npArt.src = data.albumArt;
        fetchQueue();
      }

      mostrarPlayPause();
      if (tocando !== tocandoAntes) animarBarras();

      // se a música está acabando, consulta logo depois do fim
      const falta = duracaoMs - progressoMs;
      if (tocando && falta > 0 && falta < 1000) proxima = falta + 250;
    }
  } catch (err) {
    console.error('Erro ao buscar now-playing:', err);
    proxima = 3000;
  }
  agendarConsulta(proxima);
}

// Barra e tempos andam localmente 5x por segundo
function atualizarProgresso() {
  if (!temMusica) return;
  let atual = progressoMs;
  if (tocando) atual += performance.now() - recebidoEm;
  atual = Math.min(atual, duracaoMs);

  npProgress.style.width = `${(atual / duracaoMs) * 100}%`;
  npTimeNow.textContent = formatarTempo(atual);
  npTimeLeft.textContent = '-' + formatarTempo(duracaoMs - atual);
}
setInterval(atualizarProgresso, 200);

fetchNowPlaying();

// ---------- Em foco (fila) ----------
async function fetchQueue() {
  try {
    const res = await fetch('/api/queue');
    const data = await res.json();
    desenharFila(data.queue || []);
  } catch (err) {
    console.error('Erro ao buscar fila:', err);
  }
}

function desenharFila(lista) {
  queueList.innerHTML = '';
  queueEl.hidden = lista.length === 0;

  lista.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'queue-item';

    const img = document.createElement('img');
    if (item.albumArt) img.src = item.albumArt;
    img.alt = '';

    const texto = document.createElement('div');
    texto.className = 'queue-text';

    const titulo = document.createElement('div');
    titulo.className = 'queue-title';
    titulo.textContent = item.track;

    const artista = document.createElement('div');
    artista.className = 'queue-artist';
    artista.textContent = item.artist;

    texto.appendChild(titulo);
    texto.appendChild(artista);
    linha.appendChild(img);
    linha.appendChild(texto);
    queueList.appendChild(linha);
  });
}

// atualiza a fila de vez em quando (caso você adicione músicas nela)
setInterval(() => { if (temMusica) fetchQueue(); }, 15000);

// ---------- Barrinhas (discretas e lentas) ----------
const barsEl = document.getElementById('bars');
const QTD_BARRAS = 28;
for (let i = 0; i < QTD_BARRAS; i++) {
  barsEl.appendChild(document.createElement('span'));
}

function animarBarras() {
  const barras = barsEl.children;
  for (let i = 0; i < barras.length; i++) {
    const formato = Math.sin(Math.PI * (i + 0.5) / QTD_BARRAS); // mais alta no meio
    const altura = tocando ? 3 + Math.random() * 26 * formato : 3;
    barras[i].style.height = `${altura}px`;
  }
}
setInterval(animarBarras, 900);

// ---------- Clima ----------
const ATTR = 'fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"';
const ICONES = {
  sol: `<svg viewBox="0 0 24 24" ${ATTR}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  lua: `<svg viewBox="0 0 24 24" ${ATTR}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
  nuvem: `<svg viewBox="0 0 24 24" ${ATTR}><path d="M7 18h10.5a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.3 9.6 4.2 4.2 0 0 0 7 18z"/></svg>`,
  chuva: `<svg viewBox="0 0 24 24" ${ATTR}><path d="M7 15h10.5a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.3 6.6 4.2 4.2 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>`,
};

async function updateWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    const clima = data.current_weather;

    document.getElementById('weather-temp').textContent = Math.round(clima.temperature) + '°C';

    let icone = ICONES.nuvem;
    if (clima.weathercode <= 1) icone = clima.is_day ? ICONES.sol : ICONES.lua;
    if (clima.weathercode >= 51) icone = ICONES.chuva;
    document.getElementById('weather-icon').innerHTML = icone;
  } catch (err) {
    console.error('Erro ao buscar temperatura:', err);
  }
}
updateWeather();
setInterval(updateWeather, 10 * 60 * 1000);

// ---------- Estatísticas do servidor ----------
async function updateSystemStats() {
  try {
    const res = await fetch('/api/system-stats');
    const data = await res.json();
    document.getElementById('stat-cpu').textContent = data.cpu + '%';
    document.getElementById('stat-ram').textContent = data.ram + '%';
  } catch (err) {
    console.error('Erro ao buscar stats do servidor:', err);
  }
}
updateSystemStats();
setInterval(updateSystemStats, 5000);

// ---------- Nome e cidade (vêm do config.js) ----------
document.getElementById('user-name').textContent = CONFIG.displayName;
document.getElementById('weather-city').textContent = CONFIG.cityName;
