/* =============================================
   WEATHER APP — app.js
   =============================================
   Replace the API_KEY value below with your
   free key from https://openweathermap.org/api
   ============================================= */

const API_KEY = '51fdb4d418ea9ea0611e168dfe90f65f';

/* ---------- DOM References ---------- */
const root    = document.getElementById('weather-root');
const input   = document.getElementById('city-input');
const btnC    = document.getElementById('btn-c');
const btnF    = document.getElementById('btn-f');
const themeBtn = document.getElementById('theme-btn');
const locateBtn = document.getElementById('locate-btn');

/* ---------- App State ---------- */
let unit      = 'C';       // 'C' or 'F'
let lightMode = false;
let cachedData = null;     // stores last successful fetch

/* =============================================
   WEATHER ICON MAP
   Maps OWM condition codes → emoji
   ============================================= */
function getIcon(main, desc = '') {
  if (main === 'Clear')        return '☀️';
  if (main === 'Thunderstorm') return '⛈️';
  if (main === 'Drizzle')      return '🌦️';
  if (main === 'Rain')         return desc.includes('heavy') ? '🌧️' : '🌦️';
  if (main === 'Snow')         return '❄️';
  if (main === 'Clouds') {
    if (desc.includes('few'))      return '🌤️';
    if (desc.includes('scattered')) return '⛅';
    return '☁️';
  }
  // Atmosphere group (mist, fog, haze, dust…)
  const atmos = { Mist: '🌫️', Smoke: '🌫️', Haze: '🌫️', Fog: '🌫️', Dust: '🌪️', Sand: '🌪️', Tornado: '🌪️' };
  return atmos[main] || '🌡️';
}

/* =============================================
   BACKGROUND THEME
   Sets a class on #weather-root based on condition
   ============================================= */
function getBgClass(main) {
  const map = {
    Clear: 'sunny', Clouds: 'cloudy',
    Rain: 'rainy', Drizzle: 'rainy',
    Snow: 'snow', Thunderstorm: 'thunder',
  };
  return map[main] || '';
}

/* =============================================
   UNIT HELPERS
   ============================================= */
function toF(c)       { return Math.round(c * 9 / 5 + 32); }
function dispTemp(c)  { return unit === 'C' ? Math.round(c) + '°C' : toF(c) + '°F'; }
function dispWind(ms) { return unit === 'C' ? Math.round(ms * 3.6) + ' km/h' : Math.round(ms * 2.237) + ' mph'; }

/* =============================================
   DATE HELPERS
   ============================================= */
function formatDateLong(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}
function formatDayShort(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}

/* =============================================
   STATE MANAGEMENT
   Controls which panel is visible
   ============================================= */
function showState(name) {
  ['loading', 'error', 'empty'].forEach(s => {
    document.getElementById('state-' + s).classList.remove('show');
  });
  document.getElementById('weather-content').style.display = 'none';

  if (name === 'content') {
    document.getElementById('weather-content').style.display = 'block';
  } else {
    const el = document.getElementById('state-' + name);
    if (el) el.classList.add('show');
  }
}

function showError(title, sub = '') {
  document.getElementById('err-title').textContent = title;
  document.getElementById('err-sub').textContent   = sub;
  showState('error');
}

/* =============================================
   RENDER
   Fills the UI with fetched weather data
   ============================================= */
function renderData({ current, forecast }) {
  const c    = current;
  const main = c.weather[0].main;
  const desc = c.weather[0].description;

  /* --- Current weather --- */
  document.getElementById('disp-city').textContent  = c.name + (c.sys?.country ? ', ' + c.sys.country : '');
  document.getElementById('disp-date').textContent  = formatDateLong(c.dt);
  document.getElementById('disp-temp').textContent  = dispTemp(c.main.temp);
  document.getElementById('disp-cond').textContent  = desc.charAt(0).toUpperCase() + desc.slice(1);
  document.getElementById('disp-feels').textContent = 'Feels like ' + dispTemp(c.main.feels_like);
  document.getElementById('disp-icon').textContent  = getIcon(main, desc);
  document.getElementById('disp-hum').textContent   = c.main.humidity + '%';
  document.getElementById('disp-wind').textContent  = dispWind(c.wind.speed);
  document.getElementById('disp-vis').textContent   = c.visibility ? (c.visibility / 1000).toFixed(1) + ' km' : 'N/A';

  /* --- Background theme --- */
  const bgClass = getBgClass(main);
  root.className = (lightMode ? 'light-mode ' : '') + bgClass;

  /* --- 5-day forecast ---
       OWM /forecast returns 3-hourly data; group by calendar day */
  const dailyMap = {};
  forecast.list.forEach(item => {
    const day = new Date(item.dt * 1000).toDateString();
    if (!dailyMap[day]) dailyMap[day] = [];
    dailyMap[day].push(item);
  });

  const days = Object.keys(dailyMap).slice(0, 5);
  const row  = document.getElementById('forecast-row');
  row.innerHTML = '';

  days.forEach(day => {
    const items = dailyMap[day];
    const temps = items.map(i => i.main.temp);
    const hi    = Math.max(...temps);
    const lo    = Math.min(...temps);
    const mid   = items[Math.floor(items.length / 2)];
    const icon  = getIcon(mid.weather[0].main, mid.weather[0].description);
    const label = formatDayShort(items[0].dt);

    row.innerHTML += `
      <div class="fc-card">
        <div class="fc-day">${label}</div>
        <span class="fc-icon">${icon}</span>
        <div class="fc-hi">${dispTemp(hi)}</div>
        <div class="fc-lo">${dispTemp(lo)}</div>
      </div>`;
  });

  showState('content');
}

/* =============================================
   API FETCH — by city name
   ============================================= */
async function fetchWeather(city) {
  showState('loading');
  try {
    const base = 'https://api.openweathermap.org/data/2.5';
    const [curRes, fcRes] = await Promise.all([
      fetch(`${base}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
      fetch(`${base}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
    ]);

    if (!curRes.ok) {
      if (curRes.status === 404) showError('City not found', 'Check the spelling and try again.');
      else if (curRes.status === 401) showError('Invalid API key', 'Replace 51fdb4d418ea9ea0611e168dfe90f65f in app.js.');
      else showError('Something went wrong', 'HTTP ' + curRes.status);
      return;
    }

    const current  = await curRes.json();
    const forecast = await fcRes.json();
    cachedData     = { current, forecast };
    renderData(cachedData);

  } catch (e) {
    showError('Network error', 'Check your connection and try again.');
  }
}

/* =============================================
   API FETCH — by coordinates (geolocation)
   ============================================= */
async function fetchByCoords(lat, lon) {
  showState('loading');
  try {
    const base = 'https://api.openweathermap.org/data/2.5';
    const [curRes, fcRes] = await Promise.all([
      fetch(`${base}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`${base}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
    ]);

    if (!curRes.ok) {
      showError(
        curRes.status === 401 ? 'Invalid API key' : 'Error ' + curRes.status,
        curRes.status === 401 ? 'Replace 51fdb4d418ea9ea0611e168dfe90f65f in app.js.' : ''
      );
      return;
    }

    const current  = await curRes.json();
    const forecast = await fcRes.json();
    cachedData     = { current, forecast };
    renderData(cachedData);

  } catch (e) {
    showError('Network error', 'Check your connection.');
  }
}

/* =============================================
   UNIT TOGGLE
   ============================================= */
function setUnit(u) {
  unit = u;
  btnC.classList.toggle('active', u === 'C');
  btnF.classList.toggle('active', u === 'F');
  if (cachedData) renderData(cachedData);  // re-render with new unit
}

btnC.addEventListener('click', () => setUnit('C'));
btnF.addEventListener('click', () => setUnit('F'));

/* =============================================
   DARK / LIGHT TOGGLE
   ============================================= */
function toggleTheme() {
  lightMode = !lightMode;
  themeBtn.textContent = lightMode ? '☀ Light' : '☾ Dark';
  if (cachedData) renderData(cachedData);  // re-apply bg class
  else root.classList.toggle('light-mode', lightMode);
}

themeBtn.addEventListener('click', toggleTheme);

/* =============================================
   SEARCH — Enter key
   ============================================= */
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && input.value.trim()) {
    fetchWeather(input.value.trim());
  }
});

/* =============================================
   GEOLOCATION BUTTON
   ============================================= */
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation unavailable', 'Your browser does not support location access.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => showError('Location denied', 'Allow location access or search manually.')
  );
});
