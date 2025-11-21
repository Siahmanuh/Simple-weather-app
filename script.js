// API Configuration
const API_KEY = 'Yf81e3b53ed1f1a458d2d287c692f1c01Y'; // Replace with your actual API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Global variables
let map;
let currentLocation = { lat: 40.7128, lng: -74.0060 }; // Default to New York
let weatherLayer = null;
let activeLayer = 'clouds';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    getWeatherByLocation(currentLocation.lat, currentLocation.lng);
});

// Initialize the map
function initializeMap() {
    map = L.map('weather-map').setView([currentLocation.lat, currentLocation.lng], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add click event to map
    map.on('click', function(e) {
        getWeatherByLocation(e.latlng.lat, e.latlng.lng);
    });
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', searchLocation);
    document.getElementById('location-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchLocation();
    });
    
    document.getElementById('current-location-btn').addEventListener('click', getCurrentLocation);
    
    // Map control buttons
    document.getElementById('toggle-clouds').addEventListener('click', function() {
        toggleLayer('clouds');
    });
    
    document.getElementById('toggle-precipitation').addEventListener('click', function() {
        toggleLayer('precipitation');
    });
    
    document.getElementById('toggle-humidity').addEventListener('click', function() {
        toggleLayer('humidity');
    });
}

// Search for a location
function searchLocation() {
    const locationInput = document.getElementById('location-input').value.trim();
    if (!locationInput) return;
    
    // Use OpenWeatherMap's geocoding API to get coordinates
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${locationInput}&limit=1&appid=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                getWeatherByLocation(lat, lon);
                map.setView([lat, lon], 10);
            } else {
                alert('Location not found. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error fetching location:', error);
            alert('Error finding location. Please try again.');
        });
}

// Get current location using browser's geolocation API
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherByLocation(latitude, longitude);
                map.setView([latitude, longitude], 10);
            },
            error => {
                console.error('Error getting current location:', error);
                alert('Unable to get your current location. Using default location.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Get weather data by coordinates
function getWeatherByLocation(lat, lon) {
    // Update current location
    currentLocation = { lat, lng: lon };
    
    // Fetch current weather
    fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(response => response.json())
        .then(data => {
            updateCurrentWeather(data);
            updateWeatherLayer();
        })
        .catch(error => {
            console.error('Error fetching current weather:', error);
        });
    
    // Fetch 5-day forecast
    fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        .then(response => response.json())
        .then(data => {
            updateForecast(data);
        })
        .catch(error => {
            console.error('Error fetching forecast:', error);
        });
}

// Update current weather display
function updateCurrentWeather(data) {
    document.getElementById('location-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weather-description').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    
    // Calculate "area wetness" based on precipitation and humidity
    const precipitation = data.rain ? data.rain['1h'] || 0 : 0;
    const areaWetness = Math.min(100, Math.round((precipitation * 10) + (data.main.humidity / 2)));
    document.getElementById('precipitation').textContent = `${areaWetness}%`;
    
    document.getElementById('cloud-cover').textContent = `${data.clouds.all}%`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} m/s`;
}

// Update 5-day forecast
function updateForecast(data) {
    const forecastList = document.getElementById('forecast-list');
    forecastList.innerHTML = '';
    
    // Group forecasts by day and get one forecast per day
    const dailyForecasts = {};
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dailyForecasts[day] || date.getHours() === 12) {
            dailyForecasts[day] = forecast;
        }
    });
    
    // Create forecast items
    Object.keys(dailyForecasts).slice(0, 5).forEach(day => {
        const forecast = dailyForecasts[day];
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        forecastItem.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-desc">${forecast.weather[0].description}</div>
            <div class="forecast-temp">${Math.round(forecast.main.temp)}°C</div>
        `;
        
        forecastList.appendChild(forecastItem);
    });
}

// Toggle between different weather layers
function toggleLayer(layerType) {
    activeLayer = layerType;
    updateWeatherLayer();
    
    // Update button states
    document.querySelectorAll('.map-controls button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`toggle-${layerType}`).classList.add('active');
}

// Update the weather layer on the map
function updateWeatherLayer() {
    // Remove existing layer
    if (weatherLayer) {
        map.removeLayer(weatherLayer);
    }
    
    // Create tile layer based on active layer type
    let tileUrl;
    
    switch(activeLayer) {
        case 'clouds':
            tileUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
            break;
        case 'precipitation':
            tileUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
            break;
        case 'humidity':
            // Note: OpenWeatherMap doesn't have a direct humidity layer, so we'll use precipitation as a proxy
            tileUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
            break;
        default:
            tileUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
    }
    
    // Add new layer
    weatherLayer = L.tileLayer(tileUrl, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.7
    }).addTo(map);
    
    // Update legend based on active layer
    updateLegend();
}

// Update the map legend
function updateLegend() {
    const legend = document.getElementById('cloud-legend');
    const legendTitle = legend.querySelector('h4');
    const legendGradient = legend.querySelector('.legend-gradient');
    const legendLabels = legend.querySelector('.legend-labels');
    
    switch(activeLayer) {
        case 'clouds':
            legendTitle.textContent = 'Cloud Cover';
            legendGradient.style.background = 'linear-gradient(to right, #ffffff, #cccccc, #888888, #444444)';
            legendLabels.innerHTML = '<span>Clear</span><span>Overcast</span>';
            break;
        case 'precipitation':
            legendTitle.textContent = 'Precipitation';
            legendGradient.style.background = 'linear-gradient(to right, #ffffff, #87ceeb, #1e90ff, #0000ff, #000080)';
            legendLabels.innerHTML = '<span>None</span><span>Heavy</span>';
            break;
        case 'humidity':
            legendTitle.textContent = 'Humidity';
            legendGradient.style.background = 'linear-gradient(to right, #ffffcc, #a1dab4, #41b6c4, #2c7fb8, #253494)';
            legendLabels.innerHTML = '<span>Low</span><span>High</span>';
            break;
    }
}

// Note: For a production app, you would need to:
// 1. Replace 'YOUR_OPENWEATHERMAP_API_KEY' with an actual API key from https://openweathermap.org/api
// 2. Implement error handling for API rate limits and failures
// 3. Add loading indicators for better UX
// 4. Consider caching data to reduce API calls