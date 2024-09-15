const apiKey = '6a542d091fdd4087dae859ad139ea77c';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

const locationInput = document.getElementById('locationInput');
const searchButton = document.getElementById('searchButton');
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
console.log("script loaded");

searchButton.addEventListener('click', () => {
    const location = locationInput.value;
    console.log(location)
    if (location) {
        fetchWeather(location);
    }
});

function fetchWeather(location) {
    const url = `${apiUrl}?q=${location}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            locationElement.textContent = data.name;

            const tempCelsius = data.main.temp;
            const tempFahrenheit = (tempCelsius * 9/5) + 32

            console.log(temperatureElement);
            temperatureElement.textContent = `${Math.round(tempFahrenheit)}°F`; // Display Fahrenheit
            descriptionElement.textContent = data.weather[0].description;
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
        }
        )
}