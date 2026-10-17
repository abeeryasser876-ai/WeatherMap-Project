// ==========================================
// إعدادات ومتغيرات عامة
// ==========================================
const API_KEY = '6ade53edbb8c618d6a73e788f06f818f'; 
const DEFAULT_COORDS = [15.5007, 32.5599]; // إحداثيات الخرطوم كبداية
let map;
let currentMarker;
let currentCityName = ""; // نحتاج لحفظ اسم المدينة الحالية لاستخدامها في البونص (الحفظ والمشاركة)

// ==========================================
// 1. تهيئة الخريطة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // إنشاء خريطة Leaflet وتحديد النقطة الافتراضية
    map = L.map('map').setView(DEFAULT_COORDS, 3);
    
    // استخدام ستايل مظلم (Dark Theme) من CartoDB ليتناسب مع تصميم الواجهة
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB'
    }).addTo(map);

    // تحميل المدن المفضلة من الذاكرة المحلية عند فتح الصفحة
    renderSavedCities();
});

// ==========================================
// 2. دوال جلب البيانات (Asynchronous Fetch)
// ==========================================

// دالة جلب الإحداثيات (Geocoding) باستخدام Nominatim API
async function fetchCoordinates(city) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error('Geocoding service failed');
    
    const data = await res.json();
    if (data.length === 0) throw new Error('City not found');
    
    // نرجع كائن يحتوي على الإحداثيات واسم المدينة المختصر
    return { 
        lat: parseFloat(data[0].lat), 
        lon: parseFloat(data[0].lon), 
        displayName: data[0].display_name.split(',')[0] 
    };
}

// دالة جلب الطقس الحالي من OpenWeatherMap
async function fetchWeather(lat, lon) {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (!res.ok) throw new Error('Weather data failed');
    return await res.json();
}

// دالة جلب توقعات 5 أيام من Open-Meteo (لأنها مجانية ولا تتطلب مفتاح)
async function fetchForecast(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
    if (!res.ok) throw new Error('Forecast data failed');
    return await res.json();
}

// ==========================================
// 3. تحديث واجهة المستخدم (DOM Manipulation)
// ==========================================

// دالة تحديث الكروت بالبيانات المستلمة
function updateUI(cityName, weather) {
    currentCityName = cityName; // تحديث المتغير العام
    
    // تعبئة بيانات الكارد الرئيسي
    document.getElementById('main-city').textContent = cityName;
    document.getElementById('main-temp').textContent = Math.round(weather.main.temp) + '°';
    document.getElementById('main-desc').textContent = weather.weather[0].description;
    document.getElementById('main-humidity').textContent = weather.main.humidity + '%';
    document.getElementById('main-wind').textContent = weather.wind.speed + ' km/h';
    document.getElementById('main-pressure').textContent = weather.main.pressure + ' hPa';
    
    // تحديث صورة الأيقونة
    document.getElementById('main-icon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`;

    // تعبئة بيانات النافذة المنبثقة على الخريطة
    document.getElementById('info-city').textContent = cityName;
    document.getElementById('info-temp').textContent = Math.round(weather.main.temp) + '°C';
    document.getElementById('info-desc').textContent = weather.weather[0].description;
    document.getElementById('info-icon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
    
    // إظهار النافذة المنبثقة (كانت مخفية بـ display: none)
    document.getElementById('map-info').style.display = 'block';
}

// دالة بناء وعرض توقعات 5 أيام (استخدام حلقة تكرار Loop)
function renderForecast(forecastData) {
    const grid = document.getElementById('forecast-grid');
    grid.innerHTML = ''; // تفريغ الحاوية قبل إضافة بيانات جديدة
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 5; i++) {
        const date = new Date(forecastData.daily.time[i]);
        const maxTemp = Math.round(forecastData.daily.temperature_2m_max[i]);
        const minTemp = Math.round(forecastData.daily.temperature_2m_min[i]);

        // إنشاء عنصر HTML لكل يوم وإضافته للحاوية
        grid.innerHTML += `
            <div class="forecast-item">
                <p>${days[date.getDay()]}</p>
                <i class="fa-solid fa-cloud-sun" style="color: #fbbf24; font-size: 24px; margin: 10px 0;"></i>
                <h4>${maxTemp}°</h4>
                <span style="color: gray; font-size: 0.8rem;">${minTemp}°</span>
            </div>
        `;
    }
}

// ==========================================
// 4. الميزات الإضافية (Bonus Features)
// ==========================================

// ميزة 1: عرض المدن المحفوظة في LocalStorage
function renderSavedCities() {
    const cities = JSON.parse(localStorage.getItem('savedCities')) || [];
    const savedList = document.getElementById('saved-list');
    savedList.innerHTML = '';
    
    cities.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        // عند الضغط على المدينة المحفوظة، نضع اسمها في البحث ونستدعي دالة البحث
        btn.onclick = () => {
            document.getElementById('city-input').value = city;
            handleSearch();
        };
        savedList.appendChild(btn);
    });
}

// حفظ المدينة الحالية في LocalStorage
document.getElementById('save-btn').addEventListener('click', () => {
    if (!currentCityName) return;
    let cities = JSON.parse(localStorage.getItem('savedCities')) || [];
    
    // التحقق من عدم وجود المدينة مسبقاً لتجنب التكرار
    if (!cities.includes(currentCityName)) {
        cities.push(currentCityName);
        localStorage.setItem('savedCities', JSON.stringify(cities));
        renderSavedCities();
        alert(`${currentCityName} saved!`);
    } else {
        alert('City already in your list.');
    }
});

// ميزة 2: المشاركة باستخدام Web Share API (مع Fallback للنسخ)
document.getElementById('share-btn').addEventListener('click', () => {
    if (!currentCityName) return;
    
    const temp = document.getElementById('main-temp').textContent;
    const desc = document.getElementById('main-desc').textContent;
    const shareText = `Weather in ${currentCityName} is ${temp} and ${desc}.`;
    
    // التحقق من دعم المتصفح لميزة المشاركة
    if (navigator.share) {
        navigator.share({ title: 'WeatherMap', text: shareText }).catch(console.error);
    } else {
        // خيار بديل: نسخ النص للحافظة
        navigator.clipboard.writeText(shareText);
        alert('Weather details copied to clipboard!');
    }
});

// ==========================================
// 5. الدالة الرئيسية التي تربط كل شيء (Main Handler)
// ==========================================
async function handleSearch() {
    const city = document.getElementById('city-input').value.trim();
    if (!city) return;

    // تغيير نص الزر لإظهار حالة التحميل للمستخدم
    const searchBtn = document.getElementById('search-btn');
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // الخطوة الأولى: جلب الإحداثيات
        const coords = await fetchCoordinates(city);
        
        // الخطوة الثانية: جلب الطقس والتوقعات في نفس الوقت لتسريع الأداء (Promise.all)
        const [weather, forecast] = await Promise.all([
            fetchWeather(coords.lat, coords.lon),
            fetchForecast(coords.lat, coords.lon)
        ]);

        // الخطوة الثالثة: تحديث الواجهة
        updateUI(coords.displayName, weather);
        renderForecast(forecast);

        // الخطوة الرابعة: تحريك الخريطة وإضافة الماركر
        map.flyTo([coords.lat, coords.lon], 5, { animate: true, duration: 2 });
        
        if (currentMarker) map.removeLayer(currentMarker); // إزالة الماركر القديم
        
        // إنشاء ماركر مخصص (HTML DivIcon) بدلاً من الماركر الافتراضي
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fa-solid fa-location-dot" style="color: #8b5cf6; font-size: 30px;"></i>',
            iconSize: [30, 40]
        });
        currentMarker = L.marker([coords.lat, coords.lon], {icon: customIcon}).addTo(map);

    } catch (error) {
        // معالجة الأخطاء (Try/Catch) وإظهار رسالة للمستخدم
        alert(error.message);
    } finally {
        // إعادة الزر لشكله الطبيعي في جميع الحالات (نجاح أو فشل)
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