// ==========================================
// إعدادات ومتغيرات عامة
// ==========================================
const API_KEY = '6ade53edbb8c618d6a73e788f06f818f'; 
const DEFAULT_COORDS = [15.5007, 32.5599]; // إحداثيات البداية (الخرطوم)
let map;
let currentMarker;
let currentCityName = ""; // متغير لحفظ المدينة الحالية لاستخدامها في أزرار الحفظ والمشاركة

// ==========================================
// 1. تهيئة الخريطة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // استخدام خريطة OpenStreetMap العادية (بدون مفاتيح)
    map = L.map('map').setView(DEFAULT_COORDS, 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // تحميل قائمة المدن المحفوظة عند فتح الصفحة
    renderSavedCities();
});

// ==========================================
// 2. دوال جلب البيانات (Fetch APIs)
// ==========================================

// جلب الإحداثيات من Nominatim
async function fetchCoordinates(city) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error('Geocoding service failed');
    
    const data = await res.json();
    if (data.length === 0) throw new Error('City not found');
    
    // إرجاع الإحداثيات واسم المدينة المختصر
    return { 
        lat: parseFloat(data[0].lat), 
        lon: parseFloat(data[0].lon), 
        displayName: data[0].display_name.split(',')[0] 
    };
}

// جلب الطقس الحالي من OpenWeatherMap
async function fetchWeather(lat, lon) {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (!res.ok) throw new Error('Weather data failed');
    return await res.json();
}

// جلب توقعات 5 أيام من Open-Meteo (مجاني بالكامل)
async function fetchForecast(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
    if (!res.ok) throw new Error('Forecast data failed');
    return await res.json();
}

// ==========================================
// 3. تحديث الواجهة (DOM Manipulation)
// ==========================================

function updateUI(cityName, weather) {
    currentCityName = cityName;
    
    // تعبئة كارت الطقس الحالي
    document.getElementById('main-city').textContent = cityName;
    document.getElementById('main-temp').textContent = Math.round(weather.main.temp) + '°';
    document.getElementById('main-desc').textContent = weather.weather[0].description;
    document.getElementById('main-humidity').textContent = weather.main.humidity + '%';
    document.getElementById('main-wind').textContent = weather.wind.speed + ' km/h';
    document.getElementById('main-pressure').textContent = weather.main.pressure + ' hPa';
    document.getElementById('main-icon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`;

    // تعبئة نافذة الخريطة
    document.getElementById('info-city').textContent = cityName;
    document.getElementById('info-temp').textContent = Math.round(weather.main.temp) + '°C';
    document.getElementById('info-desc').textContent = weather.weather[0].description;
    document.getElementById('info-icon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
    
    // إظهار النافذة
    document.getElementById('map-info').style.display = 'block';
}

// دالة بناء توقعات 5 أيام
function renderForecast(forecastData) {
    const grid = document.getElementById('forecast-grid');
    grid.innerHTML = ''; // تفريغ المحتوى القديم
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 5; i++) {
        const date = new Date(forecastData.daily.time[i]);
        const maxTemp = Math.round(forecastData.daily.temperature_2m_max[i]);
        const minTemp = Math.round(forecastData.daily.temperature_2m_min[i]);
        
        // تحديد الأيقونة بناءً على كود الطقس
        let iconClass = "fa-sun";
        if (forecastData.daily.weathercode[i] > 3) iconClass = "fa-cloud";

        grid.innerHTML += `
            <div class="forecast-item">
                <p>${days[date.getDay()]}</p>
                <i class="fa-solid ${iconClass}"></i>
                <h4>${maxTemp}°</h4>
                <span>${minTemp}°</span>
            </div>
        `;
    }
}

// ==========================================
// 4. الميزات الإضافية
// ==========================================

// حفظ المدن في LocalStorage
function renderSavedCities() {
    const cities = JSON.parse(localStorage.getItem('savedCities')) || [];
    const savedList = document.getElementById('saved-list');
    savedList.innerHTML = '';
    
    cities.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        // عند الضغط على المدينة، يتم البحث عنها مباشرة
        btn.onclick = () => {
            document.getElementById('city-input').value = city;
            handleSearch();
        };
        savedList.appendChild(btn);
    });
}

document.getElementById('save-btn').addEventListener('click', () => {
    if (!currentCityName) return;
    let cities = JSON.parse(localStorage.getItem('savedCities')) || [];
    
    // التحقق من عدم التكرار
    if (!cities.includes(currentCityName)) {
        cities.push(currentCityName);
        localStorage.setItem('savedCities', JSON.stringify(cities));
        renderSavedCities();
        alert(`${currentCityName} saved!`);
    } else {
        alert('City already in your list.');
    }
});

// المشاركة عبر Web Share API أو النسخ
document.getElementById('share-btn').addEventListener('click', () => {
    if (!currentCityName) return;
    
    const temp = document.getElementById('main-temp').textContent;
    const desc = document.getElementById('main-desc').textContent;
    const shareText = `Weather in ${currentCityName} is ${temp} and ${desc}.`;
    
    if (navigator.share) {
        navigator.share({ title: 'WeatherMap', text: shareText }).catch(console.error);
    } else {
        navigator.clipboard.writeText(shareText);
        alert('Weather details copied to clipboard!');
    }
});

// ==========================================
// 5. الدالة الرئيسية للبحث (Main Handler)
// ==========================================
async function handleSearch() {
    const city = document.getElementById('city-input').value.trim();
    if (!city) return;

    const searchBtn = document.getElementById('search-btn');
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // جلب الإحداثيات أولاً
        const coords = await fetchCoordinates(city);
        
        // جلب الطقس والتوقعات في نفس الوقت (Parallel)
        const [weather, forecast] = await Promise.all([
            fetchWeather(coords.lat, coords.lon),
            fetchForecast(coords.lat, coords.lon)
        ]);

        updateUI(coords.displayName, weather);
        renderForecast(forecast);

        // تحريك الخريطة وإضافة الماركر
        map.flyTo([coords.lat, coords.lon], 5, { animate: true, duration: 2 });
        
        if (currentMarker) map.removeLayer(currentMarker);
        
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fa-solid fa-location-dot" style="color: #8b5cf6; font-size: 30px;"></i>',
            iconSize: [30, 40]
        });
        
        currentMarker = L.marker([coords.lat, coords.lon], {icon: customIcon}).addTo(map);

    } catch (error) {
        alert(error.message);
    } finally {
        searchBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Get Weather';
    }
}

// ==========================================
// 6. ربط الأحداث (Event Listeners)
// ==========================================
document.getElementById('search-btn').addEventListener('click', handleSearch);
document.getElementById('city-input').addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') handleSearch(); 
});
document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('map-info').style.display = 'none';
});