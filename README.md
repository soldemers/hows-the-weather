# How's the Weather?

A sleek, glassmorphism-styled weather app with dynamic animated backgrounds that react to real-time weather conditions. Search any city in the world and watch the sky come alive — rain falls, snow drifts, clouds roll by, lightning flashes, and the sun or moon glows depending on the time of day at that location.

## Features

**Current Conditions** — Temperature, feels-like, humidity, UV index (color-coded by severity), precipitation, wind speed, visibility, and barometric pressure.

**24-Hour Forecast** — Horizontally scrollable 3-hour-interval forecast cards showing temperature, weather icons, and precipitation probability.

**Dynamic Weather Backgrounds** — The entire page transforms based on the searched location's weather:

- Sunny: pulsing sun glow with warm blue/gold gradient
- Cloudy: drifting CSS clouds with partial sun
- Overcast: dense, darker clouds across a grey sky
- Rain: animated falling raindrops with dark blue tones
- Snow: gently drifting snowflakes over cool grey gradients
- Thunderstorm: heavy rain with periodic lightning flashes

**Night Mode with Moon Phases** — If the searched location is currently past sunset or before sunrise, the background switches to a dark night sky with twinkling stars, and a moon rendered in its accurate real-world phase (new, crescent, quarter, gibbous, full) calculated using the synodic month algorithm.

**Smart City Search** — Click the search bar to see 10 popular world cities. As you type, suggestions narrow down via the OpenWeatherMap geocoding API (up to 10 results). Cities with the same name show all variants — searching "Portland" returns Portland OR, Portland ME, Portland TX, etc. — each with state/country labels so you can pick the right one.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no frameworks or build tools)
- [OpenWeatherMap API](https://openweathermap.org/api) for weather data and geocoding
- [Open-Meteo API](https://open-meteo.com/) for UV index data (no key required)
- [Font Awesome 6](https://fontawesome.com/) for icons
- CSS glassmorphism (`backdrop-filter: blur`) for the card UI

## Project Structure

```
weather.html   — Page structure and layout
weather.css    — Styles, glassmorphism, weather animations, moon phases, responsive design
weather.js     — API calls, search logic, rendering, weather background system
```

## Getting Started

1. Clone or download the project
2. Open `weather.html` in any modern browser
3. Search for a city and enjoy

No server, no build step, no dependencies to install. Everything runs client-side.

## APIs Used

| API | Purpose | Key Required |
|-----|---------|--------------|
| OpenWeatherMap Current Weather | Temperature, conditions, sunrise/sunset | Yes (included) |
| OpenWeatherMap 5-Day Forecast | 24-hour hourly forecast | Yes (included) |
| OpenWeatherMap Geocoding | City search and autocomplete | Yes (included) |
| Open-Meteo Forecast | UV index | No |

## Browser Support

Works in all modern browsers that support `backdrop-filter` (Chrome, Firefox, Safari, Edge). Mobile-responsive down to 320px width.

## License

MIT
