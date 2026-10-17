// =========================================================
// 1. إعدادات الخريطة الأساسية
// =========================================================
const KHARTOUM_LAT = 15.5007;
const KHARTOUM_LON = 32.5599;

const map = L.map('map').setView([KHARTOUM_LAT, KHARTOUM_LON], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentMarker = null;

// الحصول على العناصر
const form = document.getElementById('search-form');
const locationInput = document.getElementById('location-input');
const loadingSpinner = document.getElementById('loading-spinner');

// مفتاحك الخاص
const API_KEY = '6ade53edbb8c618d6a73e788f06f818f'; 

// =========================================================
// 2. دالة جلب الإحداثيات (Nominatim)
// =========================================================
async function getCoordinates(cityName) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('فشل الاتصال بخدمة تحديد المواقع.');
    
    const data = await response.json();
    if (data.length === 0) throw new Error('لم يتم العثور على المدينة. تأكد من الاسم.');

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

// =========================================================
// 3. دالة جلب الطقس (محاولة OpenWeather أولاً، ثم Open-Meteo)
// =========================================================
async function getWeatherData(lat, lon) {
    try {
        // المحاولة الأولى: OpenWeatherMap (بيانات دقيقة وأيقونات حقيقية)
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const owmResponse = await fetch(owmUrl);
        
        if (owmResponse.ok) {
            const owmData = await owmResponse.json();
            return {
                temp: owmData.main.temp,
                humidity: owmData.main.humidity + '%',
                clouds: owmData.clouds.all + '%',
                windSpeed: owmData.wind.speed + ' م/ث',
                description: owmData.weather[0].description,
                iconUrl: `https://openweathermap.org/img/wn/${owmData.weather[0].icon}@2x.png`
            };
        }
    } catch (e) {
        console.warn("OpenWeatherMap فشل، جاري التحويل للموقع البديل...");
    }

    // المحاولة البديلة: Open-Meteo (لو OpenWeather محظور)
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const meteoResponse = await fetch(meteoUrl);
    
    if (!meteoResponse.ok) throw new Error('فشل جلب بيانات الطقس من جميع المصادر.');
    
    const meteoData = await meteoResponse.json();
    return {
        temp: meteoData.current_weather.temperature,
        humidity: 'غير متاح',
        clouds: 'غير متاح',
        windSpeed: meteoData.current_weather.windspeed + ' كم/س',
        description: 'الطقس الحالي',
        // أيقونة بديلة ثابتة شيك في حال استخدام الموقع البديل
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1779/1779940.png' 
    };
}

// =========================================================
// 4. بناء النافذة المنبثقة
// =========================================================
function createInfoWindowContent(cityName, weather) {
    const shareText = `درجة الحرارة في ${cityName} هي ${weather.temp}°C مع ${weather.description}.`;

    return `
        <div class="weather-info-window">
            <h3>${cityName}</h3>
            <img src="${weather.iconUrl}" alt="Weather Icon" class="weather-icon">
            <p><strong>الحرارة:</strong> ${weather.temp}°C</p>
            <p><strong>الوصف:</strong> ${weather.description}</p>
            <p><strong>الرطوبة:</strong> ${weather.humidity}</p>
            <p><strong>السحب:</strong> ${weather.clouds}</p>
            <p><strong>الرياح:</strong> ${weather.windSpeed}</p>
            <button class="share-btn" id="share-btn" data-text="${shareText}">مشاركة الطقس</button>
        </div>
    `;
}

// =========================================================
// 5. الدالة الرئيسية للبحث
// =========================================================
async function handleSearch(event) {
    event.preventDefault();
    const cityName = locationInput.value.trim();
    if (!cityName) return;

    loadingSpinner.classList.remove('hidden');

    try {
        const coords = await getCoordinates(cityName);
        const weather = await getWeatherData(coords.lat, coords.lon);

        if (currentMarker) map.removeLayer(currentMarker);

        map.flyTo([coords.lat, coords.lon], 12, { animate: true, duration: 1.5 });

        currentMarker = L.marker([coords.lat, coords.lon]).addTo(map);
        const popupContent = createInfoWindowContent(cityName, weather);
        currentMarker.bindPopup(popupContent).openPopup();

        // تفعيل المشاركة
        setTimeout(() => {
            const shareBtn = document.getElementById('share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', async () => {
                    const text = shareBtn.getAttribute('data-text');
                    if (navigator.share) {
                        try { await navigator.share({ title: 'WeatherMap', text: text }); } catch (err) {}
                    } else {
                        navigator.clipboard.writeText(text).then(() => alert('تم نسخ نص الطقس!'));
                    }
                });
            }
        }, 100);

    } catch (error) {
        alert(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

form.addEventListener('submit', handleSearch);