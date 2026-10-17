/**
 * WeatherMap Application - Core Logic
 * Pure Vanilla JavaScript - Asynchronous Architecture
 */

// 1. الثوابت والإعدادات العامة
const API_KEY = '6ade53edbb8c618d6a73e788f06f818f';
const DEFAULT_COORDS = [15.5007, 32.5599]; // إحداثيات الخرطوم كبداية
const DEFAULT_ZOOM = 6;

// 2. تحديد عناصر واجهة المستخدم
const ui = {
    form: document.getElementById('search-form'),
    input: document.getElementById('location-input'),
    btnText: document.getElementById('btn-text'),
    loading: document.getElementById('loading-overlay'),
    favSection: document.getElementById('favorites-section'),
    favList: document.getElementById('favorites-list')
};

// 3. المتغيرات العامة
let map;
let activeMarker = null;

// 4. تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderFavorites();
});

// تهيئة الخريطة
function initMap() {
    map = L.map('map').setView(DEFAULT_COORDS, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// =========================================
// إدارة واجهة المستخدم (UI Manager)
// =========================================
function toggleLoading(isLoading) {
    if (isLoading) {
        ui.loading.classList.remove('hidden');
        ui.btnText.textContent = 'Searching...';
    } else {
        ui.loading.classList.add('hidden');
        ui.btnText.textContent = 'Search';
    }
}

// =========================================
// ميزة المدن المفضلة (LocalStorage)
// =========================================
function renderFavorites() {
    const favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    
    if (favorites.length > 0) {
        ui.favSection.classList.remove('hidden');
        ui.favList.innerHTML = '';
        
        favorites.forEach(city => {
            const btn = document.createElement('button');
            btn.className = 'fav-btn';
            btn.textContent = city;
            // عند الضغط، يتم وضع اسم المدينة والبحث فوراً
            btn.addEventListener('click', () => {
                ui.input.value = city;
                ui.form.dispatchEvent(new Event('submit'));
            });
            ui.favList.appendChild(btn);
        });
    } else {
        ui.favSection.classList.add('hidden');
    }
}

function addToFavorites(cityName) {
    let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    // توحيد شكل الاسم (أول حرف كبير)
    const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    
    if (!favorites.includes(formattedCity)) {
        favorites.push(formattedCity);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        renderFavorites();
    }
}

// =========================================
// جلب البيانات (APIs Integration)
// =========================================

// دالة جلب الإحداثيات (Geocoding)
async function fetchCoordinates(city) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    if (!response.ok) throw new Error('Geocoding service failed.');
    
    const data = await response.json();
    if (data.length === 0) throw new Error('City not found. Please try again.');
    
    return { lat: data[0].lat, lon: data[0].lon };
}

// دالة جلب الطقس (Weather Data)
async function fetchWeather(lat, lon) {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    
    // معالجة الخطأ 404 في حال عدم توفر بيانات الطقس
    if (!response.ok) {
        if(response.status === 404) throw new Error('Weather data not available for this location.');
        throw new Error('Failed to fetch weather data.');
    }
    
    return await response.json();
}

// =========================================
// بناء النافذة المنبثقة (InfoWindow)
// =========================================
function createPopupContent(cityName, weatherData) {
    const temp = Math.round(weatherData.main.temp);
    const desc = weatherData.weather[0].description;
    const icon = weatherData.weather[0].icon;
    const humidity = weatherData.main.humidity;
    const wind = weatherData.wind.speed;
    
    const shareText = `It's ${temp}°C with ${desc} in ${cityName}. (via WeatherMap)`;

    return `
        <div class="info-card">
            <h3>${cityName}</h3>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
            <p><strong>${temp}°C</strong> - ${desc}</p>
            <p>💧 Humidity: ${humidity}% | 💨 Wind: ${wind} m/s</p>
            <div class="info-actions">
                <button class="action-btn btn-save" id="save-city-btn">⭐ Save</button>
                <button class="action-btn btn-share" id="share-weather-btn">🔗 Share</button>
            </div>
        </div>
    `;
}

// =========================================
// الدالة الرئيسية (Main Event Handler)
// =========================================
ui.form.addEventListener('submit', async (e) => {
    e.preventDefault(); // منع إعادة تحميل الصفحة
    
    const city = ui.input.value.trim();
    if (!city) return;

    toggleLoading(true); // إظهار التحميل

    try {
        // 1. جلب الإحداثيات
        const coords = await fetchCoordinates(city);
        
        // 2. جلب الطقس
        const weather = await fetchWeather(coords.lat, coords.lon);

        // 3. تحريك الخريطة وإضافة العلامة
        map.flyTo([coords.lat, coords.lon], 12, { animate: true, duration: 1.5 });
        
        if (activeMarker) map.removeLayer(activeMarker);
        
        activeMarker = L.marker([coords.lat, coords.lon]).addTo(map);
        
        // 4. عرض النافذة
        const popupHTML = createPopupContent(city, weather);
        activeMarker.bindPopup(popupHTML).openPopup();

        // 5. ربط الأزرار داخل النافذة بعد ظهورها (Event Delegation)
        setTimeout(() => {
            const saveBtn = document.getElementById('save-city-btn');
            const shareBtn = document.getElementById('share-weather-btn');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    addToFavorites(city);
                    saveBtn.textContent = '✅ Saved';
                    saveBtn.disabled = true;
                });
            }

            if (shareBtn) {
                shareBtn.addEventListener('click', async () => {
                    const textToShare = `It's ${Math.round(weather.main.temp)}°C in ${city}.`;
                    if (navigator.share) {
                        try { await navigator.share({ title: 'WeatherMap', text: textToShare }); } catch (e) {}
                    } else {
                        navigator.clipboard.writeText(textToShare);
                        alert('Weather details copied to clipboard!');
                    }
                });
            }
        }, 200);

    } catch (error) {
        // عرض رسالة خطأ واضحة للمستخدم
        alert(error.message);
    } finally {
        toggleLoading(false); // إخفاء التحميل دائماً
    }
});