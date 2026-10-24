// ==========================================
// الإعدادات والمتغيرات العامة
// ==========================================
const API_KEY = 'fe8ece3b4de3304dc7993bb70d8ddb3c';   // مفتاح OpenWeatherMap
const DEFAULT_COORDS = [15.5007, 32.5599];            // الخرطوم (نقطة البداية)

// أيقونة بديلة مدمجة في الكود (SVG) تظهر لو فشل تحميل أيقونة الطقس
const FALLBACK_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<circle cx="24" cy="24" r="10" fill="#fbbf24"/>' +
    '<path d="M18 50h30a10 10 0 0 0 0-20 14 14 0 0 0-27-3A12 12 0 0 0 18 50z" fill="#94a3b8"/>' +
    '</svg>');

let map;                       // 
let currentMarker = null; 
let currentCityName = '';      // 
let currentShareText = '';    
let toastTimer;                // 

// اختصار للوصول للعناصر بالـ id
const $ = (id) => document.getElementById(id);

// ==========================================
// 1. تهيئة الخريطة (Phase 1)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // خريطة تبدأ على الخرطوم بزوم 6
    map = L.map('map').setView(DEFAULT_COORDS, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.on('popupopen', (e) => {
        const btn = e.popup.getElement().querySelector('.popup-share');
        if (btn) btn.addEventListener('click', shareWeather);
    });

    setIcon($('main-icon'), FALLBACK_ICON); // أيقونة مبدئية قبل أول بحث
    renderSavedCities();                    // عرض المدن المحفوظة
});

// لو أي صورة فشل تحميلها نبدلها بالأيقونة البديلة
// (حدث error ما بيطلع للأعلى، عشان كده نستخدم capture)
document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.fallback) return; // نمنع التكرار اللانهائي
    img.dataset.fallback = '1';
    img.src = FALLBACK_ICON;
}, true);

// دالة لتعيين مصدر صورة (وتصفير علامة الـ fallback)
function setIcon(img, url) {
    delete img.dataset.fallback;
    img.src = url;
}

// ==========================================
// 2. دوال جلب البيانات (Phases 2 و 3)
// ==========================================

// تحويل اسم المدينة إلى إحداثيات (Nominatim)
async function fetchCoordinates(city) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(city)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('The geocoding service is not available right now. Try again in a moment.');

    const data = await res.json();
    if (!data.length) throw new Error(`City "${city}" was not found. Check the spelling and try again.`);

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        // نفضل الاسم المباشر للمكان، وإلا أول جزء من العنوان الكامل
        displayName: data[0].name || data[0].display_name.split(',')[0]
    };
}

// جلب الطقس الحالي من OpenWeatherMap
async function fetchWeather(lat, lon) {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    if (res.status === 404) throw new Error('No weather data was found for this location.');
    if (res.status === 401) throw new Error('Invalid OpenWeatherMap API key.');
    if (res.status === 429) throw new Error('Too many requests. Wait a minute and try again.');
    if (!res.ok) throw new Error('Weather service failed. Try again later.');
    return res.json();
}

// جلب توقعات 5 أيام من Open-Meteo (مجاني)
async function fetchForecast(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
    if (!res.ok) throw new Error('Forecast data failed');
    return res.json();
}

// ==========================================
// 3. دوال مساعدة للواجهة
// ==========================================

// إظهار/إخفاء الـ spinner وتعطيل الأزرار أثناء التحميل
function setLoading(isLoading) {
    $('loader').classList.toggle('hidden', !isLoading);
    $('search-btn').disabled = isLoading;
    $('locate-btn').disabled = isLoading;
}

// عرض كرت الخطأ
function showError(message) {
    const card = $('error-card');
    card.textContent = message;
    card.classList.remove('hidden');
}

function hideError() {
    $('error-card').classList.add('hidden');
}

// رسالة قصيرة بتختفي بعد ثانيتين ونص
function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// حماية النصوص قبل إدخالها في HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// تعبئة كرت الطقس الحالي
function updateMainCard(cityName, weather) {
    const w = weather.weather[0];
    $('main-city').textContent = cityName;
    $('main-country').textContent = weather.sys && weather.sys.country ? weather.sys.country : '';
    $('main-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    $('main-temp').textContent = Math.round(weather.main.temp) + '°';
    $('main-desc').textContent = w.description;
    $('main-clouds').textContent = weather.clouds.all + '%';
    $('main-humidity').textContent = weather.main.humidity + '%';
    $('main-wind').textContent = Math.round(weather.wind.speed * 3.6) + ' km/h'; // م/ث إلى كم/س
    $('main-pressure').textContent = weather.main.pressure + ' hPa';
    setIcon($('main-icon'), `https://openweathermap.org/img/wn/${w.icon}@4x.png`);
}

// اختيار أيقونة التوقعات حسب كود الطقس
function forecastIcon(code) {
    if (code === 0) return 'fa-sun';
    if (code <= 2) return 'fa-cloud-sun';
    if (code === 3) return 'fa-cloud';
    if (code === 45 || code === 48) return 'fa-smog';
    if (code >= 51 && code <= 67) return 'fa-cloud-rain';
    if (code >= 71 && code <= 77) return 'fa-snowflake';
    if (code >= 80 && code <= 82) return 'fa-cloud-showers-heavy';
    if (code >= 95) return 'fa-bolt';
    return 'fa-cloud';
}

// رسم كروت توقعات 5 أيام
function renderForecast(forecast) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';
    for (let i = 0; i < 5; i++) {
        // نضيف الوقت عشان ما يتفسر التاريخ بتوقيت UTC ويتزحلق اليوم
        const date = new Date(forecast.daily.time[i] + 'T00:00:00');
        html += `
            <div class="forecast-item">
                <p>${days[date.getDay()]}</p>
                <i class="fa-solid ${forecastIcon(forecast.daily.weathercode[i])}"></i>
                <h4>${Math.round(forecast.daily.temperature_2m_max[i])}°</h4>
                <span>${Math.round(forecast.daily.temperature_2m_min[i])}°</span>
            </div>`;
    }
    $('forecast-grid').innerHTML = html;
}

// بناء محتوى نافذة الـ InfoWindow (الـ popup)
function buildPopupHtml(cityName, weather) {
    const w = weather.weather[0];
    return `
        <div class="popup-card">
            <img src="https://openweathermap.org/img/wn/${w.icon}@2x.png" alt="${escapeHtml(w.main)}">
            <h3>${escapeHtml(cityName)}</h3>
            <h2>${Math.round(weather.main.temp)}°C</h2>
            <p class="popup-desc">${escapeHtml(w.description)}</p>
            <p><i class="fa-solid fa-cloud"></i> Clouds: ${weather.clouds.all}%</p>
            <p><i class="fa-solid fa-droplet"></i> Humidity: ${weather.main.humidity}%</p>
            <p><i class="fa-solid fa-wind"></i> Wind: ${Math.round(weather.wind.speed * 3.6)} km/h</p>
            <button type="button" class="popup-share"><i class="fa-solid fa-share-nodes"></i> Share</button>
        </div>`;
}

// ==========================================
// 4. الماركر والـ InfoWindow (Phases 4 و 5)
// ==========================================
function placeMarker(lat, lon, cityName, weather) {
    // تحريك الخريطة بسلاسة للموقع الجديد
    map.flyTo([lat, lon], 10, { animate: true, duration: 2 });

    // مسح الماركر القديم عشان ما تتزحم الخريطة
    if (currentMarker) map.removeLayer(currentMarker);

    const icon = L.divIcon({
        className: 'custom-marker',
        html: '<i class="fa-solid fa-location-dot"></i>',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -38]
    });

    // الماركر + نافذة المعلومات المربوطة بيهو
    const marker = L.marker([lat, lon], { icon })
        .addTo(map)
        .bindPopup(buildPopupHtml(cityName, weather), { autoPanPadding: [20, 20] });
    currentMarker = marker;

    // نفتح الـ popup بعد ما تنتهي حركة الخريطة عشان تظهر كاملة
    const openPopup = () => {
        if (map.hasLayer(marker) && !marker.isPopupOpen()) marker.openPopup();
    };
    map.once('moveend', openPopup);
    setTimeout(openPopup, 2500); // احتياط لو ما اشتغل moveend
}

// ==========================================
// 5.المفضلة والمشاركه ص)
// ==========================================

// قراءة المدن المحفوظة من LocalStorage بشكل آمن
function getSavedCities() {
    try {
        return JSON.parse(localStorage.getItem('savedCities')) || [];
    } catch (err) {
        return [];
    }
}

// عرض المدن المحفوظة كأزرار سريعة
function renderSavedCities() {
    const list = $('saved-list');
    list.innerHTML = '';
    getSavedCities().forEach((city) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = city;
        // الضغط على المدينة بيعمل بحث عنها مباشرة
        btn.addEventListener('click', () => {
            $('city-input').value = city;
            handleSearch();
        });
        list.appendChild(btn);
    });
}

// حفظ المدينة الحالية (بدون تكرار)
function saveCurrentCity() {
    if (!currentCityName) {
        showToast('Search for a city first.');
        return;
    }
    const cities = getSavedCities();
    if (cities.includes(currentCityName)) {
        showToast('City already in your list.');
        return;
    }
    cities.push(currentCityName);
    localStorage.setItem('savedCities', JSON.stringify(cities));
    renderSavedCities();
    showToast(`${currentCityName} saved.`);
}

// مشاركة الطقس: Web Share API لو متاح، وإلا نسخ للحافظة
async function shareWeather() {
    if (!currentShareText) {
        showToast('Search for a city first.');
        return;
    }
    try {
        if (navigator.share) {
            await navigator.share({ title: 'WeatherMap', text: currentShareText });
        } else {
            await navigator.clipboard.writeText(currentShareText);
            showToast('Weather details copied to clipboard.');
        }
    } catch (err) {
        // لو المستخدم ألغى المشاركة ما نعرض خطأ
        if (err.name !== 'AbortError') showToast('Could not share. Try again.');
    }
}

// ==========================================
// 6. العمليات الرئيسية
// ==========================================

// جلب الطقس والتوقعات وعرضهم على الصفحة والخريطة
async function showLocation(lat, lon, cityName) {
    // الطقس ضروري، أما التوقعات فلو فشلت ما نوقف البحث كلو
    const [weatherResult, forecastResult] = await Promise.allSettled([
        fetchWeather(lat, lon),
        fetchForecast(lat, lon)
    ]);

    if (weatherResult.status === 'rejected') throw weatherResult.reason;
    const weather = weatherResult.value;

    currentCityName = cityName;
    currentShareText = `Weather in ${cityName}: ${Math.round(weather.main.temp)}°C, ${weather.weather[0].description}. ` +
        `Humidity ${weather.main.humidity}%, wind ${Math.round(weather.wind.speed * 3.6)} km/h.`;

    updateMainCard(cityName, weather);

    if (forecastResult.status === 'fulfilled') {
        renderForecast(forecastResult.value);
    } else {
        $('forecast-grid').textContent = 'Forecast is not available right now.';
    }

    placeMarker(lat, lon, cityName, weather);
}

// البحث بالاسم:(طلبات متسلسلة)
async function handleSearch() {
    const city = $('city-input').value.trim();
    if (!city) {
        showError('Please enter a city name.');
        return;
    }

    hideError();
    setLoading(true);
    try {
        const coords = await fetchCoordinates(city);
        await showLocation(coords.lat, coords.lon, coords.displayName);
    } catch (error) {
        showError(error.message || 'Something went wrong. Please try again.');
    } finally {
        setLoading(false); // يشتغل سواء نجح الطلب أو فشل
    }
}

// الطقس حسب موقع المستخدم الحالي (Geolocation API)
function handleLocate() {
    if (!navigator.geolocation) {
        showError('Your browser does not support geolocation.');
        return;
    }
    hideError();
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const weather = await fetchWeather(latitude, longitude);
                await showLocation(latitude, longitude, weather.name || 'My Location');
            } catch (error) {
                showError(error.message || 'Could not load weather for your location.');
            } finally {
                setLoading(false);
            }
        },
        () => {
            // المستخدم رفض الإذن أو حصل خطأ في تحديد الموقع
            setLoading(false);
            showError('Location access was denied. Allow it in your browser or search by city.');
        }
    );
}

// ==========================================
// 7. ربط الأحداث (Event Listeners)
// ==========================================
$('search-form').addEventListener('submit', (e) => {
    e.preventDefault();   // نمنع إعادة تحميل الصفحة
    handleSearch();
});
$('locate-btn').addEventListener('click', handleLocate);
$('save-btn').addEventListener('click', saveCurrentCity);
$('share-btn').addEventListener('click', shareWeather);