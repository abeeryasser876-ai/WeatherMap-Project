const API_KEY = '6ade53edbb8c618d6a73e788f06f818f'; 
const DEFAULT_COORDS = [15.5007, 32.5599];
const DEFAULT_ZOOM = 6;

const form = document.getElementById('search-form');
const input = document.getElementById('location-input');
const btnText = document.getElementById('btn-text');
const loadingOverlay = document.getElementById('loading-overlay');
const favSection = document.getElementById('favorites-section');
const favList = document.getElementById('favorites-list');

let map;
let currentMarker = null;

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView(DEFAULT_COORDS, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    renderFavorites();
});

function toggleLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        btnText.textContent = 'Searching...';
        input.disabled = true;
    } else {
        loadingOverlay.classList.add('hidden');
        btnText.textContent = 'Get Weather';
        input.disabled = false;
    }
}

// جلب الإحداثيات من Nominatim API
async function getCoordinates(city) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error('Geocoding service failed.');
    
    const data = await res.json();
    if (data.length === 0) throw new Error('City not found.');
    
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// جلب بيانات الطقس من OpenWeatherMap
async function getWeather(lat, lon) {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (!res.ok) throw new Error('Failed to fetch weather data.');
    return await res.json();
}

// إدارة المدن المفضلة وتخزينها في المتصفح
function renderFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favCities')) || [];
    if (favorites.length > 0) {
        favSection.classList.remove('hidden');
        favList.innerHTML = '';
        favorites.forEach(city => {
            const btn = document.createElement('button');
            btn.className = 'fav-btn';
            btn.textContent = city;
            btn.addEventListener('click', () => {
                input.value = city;
                form.dispatchEvent(new Event('submit'));
            });
            favList.appendChild(btn);
        });
    }
}

function saveCity(city) {
    let favorites = JSON.parse(localStorage.getItem('favCities')) || [];
    const formatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    if (!favorites.includes(formatted)) {
        favorites.push(formatted);
        localStorage.setItem('favCities', JSON.stringify(favorites));
        renderFavorites();
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = input.value.trim();
    if (!city) return;

    toggleLoading(true);

    try {
        const coords = await getCoordinates(city);
        const weather = await getWeather(coords.lat, coords.lon);

        map.flyTo([coords.lat, coords.lon], 12, { animate: true, duration: 1.5 });
        
        if (currentMarker) map.removeLayer(currentMarker);
        
        currentMarker = L.marker([coords.lat, coords.lon]).addTo(map);

        const temp = Math.round(weather.main.temp);
        const desc = weather.weather[0].description;
        const icon = weather.weather[0].icon;
        const shareText = `Weather in ${city}: ${temp}°C, ${desc}`;

        const popupHTML = `
            <div class="info-window">
                <h3>${city}</h3>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
                <p><b>Temp:</b> ${temp}°C</p>
                <p><b>Humidity:</b> ${weather.main.humidity}%</p>
                <p><b>Wind:</b> ${weather.wind.speed} m/s</p>
                <div class="info-actions">
                    <button class="action-btn btn-save" id="save-btn">⭐ Save</button>
                    <button class="action-btn btn-share" id="share-btn">🔗 Share</button>
                </div>
            </div>
        `;

        currentMarker.bindPopup(popupHTML).openPopup();

        setTimeout(() => {
            document.getElementById('save-btn')?.addEventListener('click', (e) => {
                saveCity(city);
                e.target.textContent = '✅ Saved';
            });

            document.getElementById('share-btn')?.addEventListener('click', async () => {
                if (navigator.share) {
                    try { await navigator.share({ title: 'WeatherMap', text: shareText }); } catch (err) {}
                } else {
                    navigator.clipboard.writeText(shareText);
                    alert('Copied to clipboard!');
                }
            });
        }, 100);

    } catch (error) {
        alert(error.message);
    } finally {
        toggleLoading(false);
    }
});