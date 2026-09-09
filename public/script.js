// ---------- CONFIGURAÇÃO ----------
// Edite os valores abaixo para personalizar o painel com seus dados.
const CONFIG = {
  displayName: 'Seu Nome',       // Nome mostrado ao lado da temperatura
  cityName: 'Sua Cidade',        // Nome da cidade mostrado no painel
  latitude: -25.4284,            // Latitude da sua cidade (para a previsão do tempo)
  longitude: -49.2733,           // Longitude da sua cidade
};

// ---------- Relógio ----------
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const secondsEl = document.getElementById('seconds');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  clockEl.textContent = `${hh}:${mm}`;
  secondsEl.textContent = ss;
  dateEl.textContent = `${DIAS[now.getDay()]}, ${now.getDate()} ${MESES[now.getMonth()]}`;
}
tickClock();
setInterval(tickClock, 1000);

// ---------- Now Playing ----------
const vinylEl = document.getElementById('vinyl');
const npIdle = document.getElementById('np-idle');
const npActive = document.getElementById('np-active');
const npArt = document.getElementById('np-art');
const npTrack = document.getElementById('np-track');
const npArtist = document.getElementById('np-artist');
const npProgress = document.getElementById('np-progress');

async function fetchNowPlaying() {
  try {
    const res = await fetch('/api/now-playing');
    const data = await res.json();

    if (!data.playing || !data.track) {
      npIdle.hidden = false;
      npActive.hidden = true;
      vinylEl.classList.remove('spinning');
      return;
    }

    npIdle.hidden = true;
    npActive.hidden = false;
    vinylEl.classList.add('spinning');

    npTrack.textContent = data.track;
    npArtist.textContent = data.artist;
    if (data.albumArt) npArt.src = data.albumArt;

    const pct = Math.min(100, (data.progressMs / data.durationMs) * 100);
    npProgress.style.width = `${pct}%`;
  } catch (err) {
    console.error('Erro ao buscar now-playing:', err);
  }
}

fetchNowPlaying();
setInterval(fetchNowPlaying, 5000);

// ---------- Clima ----------

async function updateWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    document.getElementById('weather-temp').textContent = temp + '°C';
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

// ---------- Aplicar nome e cidade configurados ----------
document.getElementById('weather-name').textContent = CONFIG.displayName;
document.getElementById('weather-city').textContent = CONFIG.cityName;
