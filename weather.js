/* ─────────────────────────────────────────────────────
   How's the Weather — weather.js
   Features:
     • Geocoding autocomplete (OpenWeatherMap)
     • Current conditions (temp, description, icon)
     • Stats: humidity, UV index, precipitation,
              wind speed, visibility, pressure
     • 24-hour / 3-hour-interval forecast
   ───────────────────────────────────────────────────── */

const API_KEY = '6a542d091fdd4087dae859ad139ea77c';
const BASE    = 'https://api.openweathermap.org';

// ── DOM refs ──────────────────────────────────────────
const searchInput    = document.getElementById('searchInput');
const clearBtn       = document.getElementById('clearBtn');
const suggestionsList= document.getElementById('suggestions');
const weatherSection = document.getElementById('weatherSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMsg       = document.getElementById('errorMsg');
const errorText      = document.getElementById('errorText');

const cityName       = document.getElementById('cityName');
const currentDate    = document.getElementById('currentDate');
const weatherIconImg = document.getElementById('weatherIcon');
const temperature    = document.getElementById('temperature');
const description    = document.getElementById('description');
const feelsLike      = document.getElementById('feelsLike');
const humidity       = document.getElementById('humidity');
const uvIndexEl      = document.getElementById('uvIndex');
const precipitation  = document.getElementById('precipitation');
const windEl         = document.getElementById('wind');
const visibilityEl   = document.getElementById('visibility');
const pressureEl     = document.getElementById('pressure');
const forecastScroll = document.getElementById('forecastScroll');

// ── Weather Background refs ──────────────────────────
const weatherBg        = document.getElementById('weatherBg');
const weatherParticles = document.getElementById('weatherParticles');
const sunEffect        = document.getElementById('sunEffect');
const cloudLayer       = document.getElementById('cloudLayer');

const moonEffect       = document.getElementById('moonEffect');
const starsLayer       = document.getElementById('starsLayer');

// ── State ─────────────────────────────────────────────
let debounceTimer = null;
let currentWeatherClass = '';
let isNighttime = false;

// ── Popular cities (shown on empty focus) ────────────
const POPULAR_CITIES = [
    { name: 'New York',    state: 'New York',      country: 'US', lat: 40.7128, lon: -74.0060 },
    { name: 'Los Angeles', state: 'California',    country: 'US', lat: 34.0522, lon: -118.2437 },
    { name: 'London',      state: '',               country: 'GB', lat: 51.5074, lon: -0.1278 },
    { name: 'Tokyo',       state: '',               country: 'JP', lat: 35.6762, lon: 139.6503 },
    { name: 'Paris',       state: '',               country: 'FR', lat: 48.8566, lon: 2.3522 },
    { name: 'Sydney',      state: 'New South Wales',country: 'AU', lat: -33.8688, lon: 151.2093 },
    { name: 'Dubai',       state: '',               country: 'AE', lat: 25.2048, lon: 55.2708 },
    { name: 'Chicago',     state: 'Illinois',       country: 'US', lat: 41.8781, lon: -87.6298 },
    { name: 'Toronto',     state: 'Ontario',        country: 'CA', lat: 43.6532, lon: -79.3832 },
    { name: 'Miami',       state: 'Florida',        country: 'US', lat: 25.7617, lon: -80.1918 },
];

// ── Search input events ───────────────────────────────
searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    clearBtn.style.display = val.length > 0 ? 'flex' : 'none';

    clearTimeout(debounceTimer);
    if (val.length === 0) {
        showPopularCities();
        return;
    }
    if (val.length < 2) { hideSuggestions(); return; }
    debounceTimer = setTimeout(() => fetchSuggestions(val), 280);
});

searchInput.addEventListener('focus', () => {
    const val = searchInput.value.trim();
    if (val.length === 0) {
        showPopularCities();
    } else if (val.length >= 2) {
        fetchSuggestions(val);
    }
});

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        hideSuggestions();
        if (val) searchByName(val);
    }
    if (e.key === 'Escape') hideSuggestions();
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    hideSuggestions();
    searchInput.focus();
});

// Hide suggestions when clicking outside
document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) hideSuggestions();
});

// ── Popular cities on empty focus ────────────────────
function showPopularCities() {
    suggestionsList.innerHTML = '';
    const header = document.createElement('li');
    header.className = 'suggestion-header';
    header.textContent = 'Popular Cities';
    suggestionsList.appendChild(header);

    POPULAR_CITIES.forEach(loc => {
        const label = [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = `<i class="fas fa-fire"></i><span>${loc.name}</span><span class="suggestion-region">${[loc.state, loc.country].filter(Boolean).join(', ')}</span>`;
        li.addEventListener('click', () => {
            searchInput.value      = label;
            clearBtn.style.display = 'flex';
            hideSuggestions();
            fetchWeatherByCoords(loc.lat, loc.lon, label);
        });
        suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = 'block';
}

// ── Autocomplete ──────────────────────────────────────
async function fetchSuggestions(query) {
    try {
        // Request up to 10 results so same-name cities (e.g. Portland) all appear
        const url = `${BASE}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${API_KEY}`;
        const res  = await fetch(url);
        const data = await res.json();
        renderSuggestions(Array.isArray(data) ? data : []);
    } catch {
        hideSuggestions();
    }
}

function renderSuggestions(locations) {
    suggestionsList.innerHTML = '';
    if (!locations.length) { hideSuggestions(); return; }

    // Deduplicate by rounded lat/lon to remove true duplicates,
    // but keep different cities with the same name (e.g. Portland OR vs Portland ME)
    const seen   = new Set();
    const unique = locations.filter(loc => {
        const key = `${loc.lat.toFixed(2)}|${loc.lon.toFixed(2)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.forEach(loc => {
        const label = [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
        const li    = document.createElement('li');
        li.setAttribute('role', 'option');
        const region = [loc.state, loc.country].filter(Boolean).join(', ');
        li.innerHTML = `<i class="fas fa-location-dot"></i><span>${loc.name}</span><span class="suggestion-region">${region}</span>`;
        li.addEventListener('click', () => {
            searchInput.value      = label;
            clearBtn.style.display = 'flex';
            hideSuggestions();
            fetchWeatherByCoords(loc.lat, loc.lon, label);
        });
        suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = 'block';
}

function hideSuggestions() {
    suggestionsList.style.display = 'none';
    suggestionsList.innerHTML     = '';
}

// ── Geocode then fetch ────────────────────────────────
async function searchByName(query) {
    setLoading(true);
    try {
        const res  = await fetch(`${BASE}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`);
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) {
            return showError('City not found. Please check the spelling and try again.');
        }
        const loc   = data[0];
        const label = [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
        fetchWeatherByCoords(loc.lat, loc.lon, label);
    } catch {
        showError('Could not complete the search. Check your connection and try again.');
        setLoading(false);
    }
}

// ── Main weather fetch ────────────────────────────────
async function fetchWeatherByCoords(lat, lon, locationLabel) {
    setLoading(true);
    clearError();

    try {
        // Parallel: current weather + 5-day/3h forecast
        const [curRes, fcRes] = await Promise.all([
            fetch(`${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`),
            fetch(`${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`)
        ]);

        if (!curRes.ok || !fcRes.ok) {
            return showError('Weather data unavailable for this location.');
        }

        const current  = await curRes.json();
        const forecast = await fcRes.json();

        // UV index — free Open-Meteo API (no key needed)
        let uv = null;
        try {
            const uvRes  = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&hourly=uv_index&timezone=auto&forecast_days=1`
            );
            const uvData = await uvRes.json();
            const hr     = new Date().getHours();
            uv = uvData?.hourly?.uv_index?.[hr] ?? null;
        } catch { /* UV unavailable — degrade gracefully */ }

        renderWeather(current, forecast, locationLabel, uv);

    } catch (err) {
        console.error(err);
        showError('Something went wrong fetching weather data. Please try again.');
    } finally {
        setLoading(false);
    }
}

// ── Render current conditions ─────────────────────────
function renderWeather(current, forecast, label, uv) {
    // Location & date
    cityName.textContent    = label;
    const now               = new Date();
    currentDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    // Main
    const iconCode           = current.weather[0].icon;
    weatherIconImg.src       = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIconImg.alt       = current.weather[0].description;
    temperature.textContent  = Math.round(current.main.temp);
    description.textContent  = current.weather[0].description;
    feelsLike.textContent    = `Feels like ${Math.round(current.main.feels_like)}°F`;

    // Stats
    humidity.textContent    = `${current.main.humidity}%`;

    // UV index with color-coded severity
    if (uv !== null) {
        const uvRounded = Math.round(uv * 10) / 10;
        const { label: uvLabel, cls } = uvCategory(uvRounded);
        uvIndexEl.textContent  = `${uvRounded} · ${uvLabel}`;
        uvIndexEl.className    = `stat-value ${cls}`;
    } else {
        uvIndexEl.textContent  = 'N/A';
        uvIndexEl.className    = 'stat-value';
    }

    // Precipitation (rain or snow in last hour, or 0)
    const rainMm = current.rain?.['1h'] ?? 0;
    const snowMm = current.snow?.['1h'] ?? 0;
    const precipMm = rainMm + snowMm;
    precipitation.textContent = precipMm > 0 ? `${precipMm.toFixed(1)} mm` : '0 mm';

    // Wind
    windEl.textContent    = `${Math.round(current.wind.speed)} mph`;

    // Visibility (API returns meters; convert to miles)
    if (current.visibility != null) {
        const visMiles = (current.visibility / 1609.34).toFixed(1);
        visibilityEl.textContent = `${visMiles} mi`;
    } else {
        visibilityEl.textContent = 'N/A';
    }

    // Pressure
    pressureEl.textContent = `${current.main.pressure} hPa`;

    // 24-hour forecast
    renderForecast(forecast.list);

    // Dynamic weather background — check if nighttime at location
    const weatherId = current.weather[0].id;
    const category  = getWeatherCategory(weatherId);
    const nowUtc    = Math.floor(Date.now() / 1000);
    const sunrise   = current.sys.sunrise;
    const sunset    = current.sys.sunset;
    isNighttime     = (nowUtc < sunrise || nowUtc > sunset);
    applyWeatherBackground(category);

    weatherSection.style.display = 'block';
}

// ── Render 24-hour forecast ───────────────────────────
function renderForecast(list) {
    forecastScroll.innerHTML = '';

    // Forecast is in 3-hour steps → 8 entries = 24 hours
    const next24 = list.slice(0, 8);

    next24.forEach((item, i) => {
        const dt     = new Date(item.dt * 1000);
        const hour   = dt.getHours();
        const ampm   = hour >= 12 ? 'PM' : 'AM';
        const h12    = hour % 12 || 12;
        const timeStr = i === 0 ? 'Now' : `${h12} ${ampm}`;

        const icon  = item.weather[0].icon;
        const temp  = Math.round(item.main.temp);
        const pop   = Math.round((item.pop || 0) * 100); // precipitation %

        const div = document.createElement('div');
        div.className = `forecast-item${i === 0 ? ' now' : ''}`;

        div.innerHTML = `
            <span class="forecast-time">${timeStr}</span>
            <img class="forecast-icon"
                 src="https://openweathermap.org/img/wn/${icon}@2x.png"
                 alt="${item.weather[0].description}"
                 title="${item.weather[0].description}">
            <span class="forecast-temp">${temp}°</span>
            ${pop > 0 ? `<span class="forecast-pop"><i class="fas fa-droplet"></i>${pop}%</span>` : ''}
        `;

        forecastScroll.appendChild(div);
    });
}

// ── UV category helper ────────────────────────────────
function uvCategory(uv) {
    if (uv < 3)  return { label: 'Low',       cls: 'uv-low'   };
    if (uv < 6)  return { label: 'Moderate',  cls: 'uv-mod'   };
    if (uv < 8)  return { label: 'High',      cls: 'uv-high'  };
    if (uv < 11) return { label: 'Very High', cls: 'uv-vhigh' };
    return              { label: 'Extreme',   cls: 'uv-ext'   };
}

// ── UI helpers ────────────────────────────────────────
function setLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
    if (show) {
        weatherSection.style.display = 'none';
        errorMsg.style.display       = 'none';
    }
}

function showError(msg) {
    errorText.textContent        = msg;
    errorMsg.style.display       = 'block';
    weatherSection.style.display = 'none';
    loadingSpinner.style.display = 'none';
}

function clearError() {
    errorMsg.style.display = 'none';
}

// ── Weather Background System ────────────────────────

/**
 * Map OpenWeatherMap weather ID to a background category.
 * See https://openweathermap.org/weather-conditions
 */
function getWeatherCategory(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
    if (weatherId >= 300 && weatherId < 400) return 'rain';        // drizzle
    if (weatherId >= 500 && weatherId < 600) return 'rain';
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    if (weatherId >= 700 && weatherId < 800) return 'cloudy';      // fog, mist, haze
    if (weatherId === 800)                   return 'sunny';       // clear sky
    if (weatherId === 801)                   return 'cloudy';      // few clouds
    if (weatherId >= 802)                    return 'overcast';    // scattered → overcast
    return 'cloudy';
}

/**
 * Apply the matching animated background for a weather category.
 */
function applyWeatherBackground(category) {
    // Remove ALL weather classes (day + night)
    const classes = [
        'weather-sunny','weather-cloudy','weather-overcast','weather-rain','weather-snow','weather-thunderstorm',
        'weather-night-clear','weather-night-cloudy','weather-night-rain','weather-night-snow','weather-night-thunderstorm'
    ];
    classes.forEach(c => document.body.classList.remove(c));

    // Remove moon phase classes
    const moonPhases = ['moon-new','moon-waxing-crescent','moon-first-quarter','moon-waxing-gibbous','moon-full','moon-waning-gibbous','moon-last-quarter','moon-waning-crescent'];
    moonPhases.forEach(c => moonEffect.classList.remove(c));

    // Clear particles & effects
    weatherParticles.innerHTML = '';
    sunEffect.style.display    = 'none';
    moonEffect.style.display   = 'none';
    cloudLayer.style.display   = 'none';
    starsLayer.innerHTML       = '';

    currentWeatherClass = category;

    if (isNighttime) {
        applyNightBackground(category);
    } else {
        applyDayBackground(category);
    }
}

function applyDayBackground(category) {
    document.body.classList.add(`weather-${category}`);

    switch (category) {
        case 'sunny':
            sunEffect.style.display  = 'block';
            break;

        case 'cloudy':
            cloudLayer.style.display = 'block';
            sunEffect.style.display  = 'block';
            break;

        case 'overcast':
            cloudLayer.style.display = 'block';
            break;

        case 'rain':
            cloudLayer.style.display = 'block';
            createRainDrops(80);
            break;

        case 'thunderstorm':
            cloudLayer.style.display = 'block';
            createRainDrops(120);
            break;

        case 'snow':
            cloudLayer.style.display = 'block';
            createSnowflakes(60);
            break;
    }
}

function applyNightBackground(category) {
    // Map day category to night class
    let nightClass;
    switch (category) {
        case 'sunny':
            nightClass = 'weather-night-clear';
            break;
        case 'cloudy':
        case 'overcast':
            nightClass = 'weather-night-cloudy';
            cloudLayer.style.display = 'block';
            break;
        case 'rain':
            nightClass = 'weather-night-rain';
            cloudLayer.style.display = 'block';
            createRainDrops(80);
            break;
        case 'snow':
            nightClass = 'weather-night-snow';
            cloudLayer.style.display = 'block';
            createSnowflakes(60);
            break;
        case 'thunderstorm':
            nightClass = 'weather-night-thunderstorm';
            cloudLayer.style.display = 'block';
            createRainDrops(120);
            break;
        default:
            nightClass = 'weather-night-cloudy';
            cloudLayer.style.display = 'block';
    }

    document.body.classList.add(nightClass);

    // Show moon with correct phase
    moonEffect.style.display = 'block';
    const phase = getMoonPhase();
    moonEffect.classList.add(phase.cls);

    // Generate twinkling stars
    createStars(category === 'sunny' ? 80 : 30);
}

function createRainDrops(count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left             = `${Math.random() * 100}%`;
        drop.style.height           = `${12 + Math.random() * 18}px`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        drop.style.animationDelay    = `${Math.random() * 2}s`;
        drop.style.opacity          = `${0.3 + Math.random() * 0.5}`;
        frag.appendChild(drop);
    }
    weatherParticles.appendChild(frag);
}

function createSnowflakes(count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        const size = 4 + Math.random() * 8;
        flake.style.left             = `${Math.random() * 100}%`;
        flake.style.width            = `${size}px`;
        flake.style.height           = `${size}px`;
        flake.style.animationDuration = `${4 + Math.random() * 6}s`;
        flake.style.animationDelay    = `${Math.random() * 5}s`;
        flake.style.opacity          = `${0.4 + Math.random() * 0.5}`;
        frag.appendChild(flake);
    }
    weatherParticles.appendChild(frag);
}

// ── Moon Phase Calculation ───────────────────────────
/**
 * Calculate the current moon phase using a synodic month algorithm.
 * Returns { name, cls, illumination } where cls is a CSS class.
 */
function getMoonPhase() {
    const now      = new Date();
    // Known new moon: January 6, 2000 18:14 UTC
    const knownNew = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const synodic  = 29.53058867; // days

    const daysSince = (now - knownNew) / (1000 * 60 * 60 * 24);
    const cycle     = ((daysSince % synodic) + synodic) % synodic; // 0 to ~29.5
    const fraction  = cycle / synodic; // 0.0 to 1.0

    if (fraction < 0.0625)      return { name: 'New Moon',         cls: 'moon-new' };
    if (fraction < 0.1875)      return { name: 'Waxing Crescent',  cls: 'moon-waxing-crescent' };
    if (fraction < 0.3125)      return { name: 'First Quarter',    cls: 'moon-first-quarter' };
    if (fraction < 0.4375)      return { name: 'Waxing Gibbous',   cls: 'moon-waxing-gibbous' };
    if (fraction < 0.5625)      return { name: 'Full Moon',        cls: 'moon-full' };
    if (fraction < 0.6875)      return { name: 'Waning Gibbous',   cls: 'moon-waning-gibbous' };
    if (fraction < 0.8125)      return { name: 'Last Quarter',     cls: 'moon-last-quarter' };
    if (fraction < 0.9375)      return { name: 'Waning Crescent',  cls: 'moon-waning-crescent' };
    return                        { name: 'New Moon',         cls: 'moon-new' };
}

// ── Star Field ───────────────────────────────────────
function createStars(count) {
    starsLayer.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = 1 + Math.random() * 2.5;
        star.style.left              = `${Math.random() * 100}%`;
        star.style.top               = `${Math.random() * 60}%`;
        star.style.width             = `${size}px`;
        star.style.height            = `${size}px`;
        star.style.animationDuration = `${2 + Math.random() * 4}s`;
        star.style.animationDelay    = `${Math.random() * 3}s`;
        frag.appendChild(star);
    }
    starsLayer.appendChild(frag);
}
