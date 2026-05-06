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

// ── State ─────────────────────────────────────────────
let debounceTimer = null;

// ── Search input events ───────────────────────────────
searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    clearBtn.style.display = val.length > 0 ? 'flex' : 'none';

    clearTimeout(debounceTimer);
    if (val.length < 2) { hideSuggestions(); return; }
    debounceTimer = setTimeout(() => fetchSuggestions(val), 280);
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

// ── Autocomplete ──────────────────────────────────────
async function fetchSuggestions(query) {
    try {
        const url = `${BASE}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
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

    // Deduplicate by name + country
    const seen    = new Set();
    const unique  = locations.filter(loc => {
        const key = `${loc.name}|${loc.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.forEach(loc => {
        const label = [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
        const li    = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = `<i class="fas fa-location-dot"></i>${label}`;
        li.addEventListener('click', () => {
            searchInput.value     = label;
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
