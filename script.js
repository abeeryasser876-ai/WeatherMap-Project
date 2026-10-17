// إحداثيات الخرطوم كنقطة بداية للخريطة
const KHARTOUM_LAT = 15.5007;
const KHARTOUM_LON = 32.5599;

// إنشاء الخريطة وتحديد النقطة الابتدائية ومستوى التقريب
const map = L.map('map').setView([KHARTOUM_LAT, KHARTOUM_LON], 6);

// إضافة شكل الخريطة (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// متغير لحفظ العلامة (Marker) الحالية
let currentMarker = null;

// جلب العناصر من صفحة HTML
const form = document.getElementById('search-form');
const locationInput = document.getElementById('location-input');
const loadingSpinner = document.getElementById('loading-spinner');

// ضع مفتاح API الخاص بك هنا
const API_KEY = '6ade53edbb8c618d6a73e788f06f818f'; 

// دالة لجلب إحداثيات المدينة (خط العرض وخط الطول)
async function getCoordinates(cityName) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`;
    const response = await fetch(url);
    
    // التحقق من نجاح الطلب
    if (!response.ok) {
        throw new Error('فشل الاتصال بخدمة تحديد المواقع. يرجى التأكد من اتصال الإنترنت.');
    }

    const data = await response.json();

    // التحقق مما إذا كانت المدينة موجودة
    if (data.length === 0) {
        throw new Error('لم يتم العثور على المدينة. يرجى التأكد من كتابة الاسم بشكل صحيح.');
    }

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

// دالة لجلب بيانات الطقس باستخدام الإحداثيات
async function getWeatherData(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('فشل جلب بيانات الطقس. يرجى التأكد من صحة مفتاح API.');
    }

    return await response.json();
}

// دالة لبناء محتوى النافذة المنبثقة (InfoWindow)
function createInfoWindowContent(cityName, weather) {
    const temp = weather.main.temp;
    const humidity = weather.main.humidity;
    const clouds = weather.clouds.all;
    const windSpeed = weather.wind.speed;
    const description = weather.weather[0].description;
    const iconCode = weather.weather[0].icon;
    
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const shareText = `درجة الحرارة في ${cityName} هي ${temp}°C مع ${description}.`;

    // إرجاع كود HTML لعرضه داخل النافذة
    return `
        <div class="weather-info-window">
            <h3>${cityName}</h3>
            <img src="${iconUrl}" alt="${description}">
            <p><strong>الحرارة:</strong> ${temp}°C</p>
            <p><strong>الوصف:</strong> ${description}</p>
            <p><strong>الرطوبة:</strong> ${humidity}%</p>
            <p><strong>السحب:</strong> ${clouds}%</p>
            <p><strong>الرياح:</strong> ${windSpeed} م/ث</p>
            <button class="share-btn" id="share-btn" data-text="${shareText}">مشاركة الطقس</button>
        </div>
    `;
}

// الدالة الرئيسية التي تعمل عند الضغط على زر البحث
async function handleSearch(event) {
    // منع إعادة تحميل الصفحة
    event.preventDefault();

    const cityName = locationInput.value.trim();
    if (!cityName) return;

    // إظهار مؤشر التحميل
    loadingSpinner.classList.remove('hidden');

    try {
        // جلب الإحداثيات ثم جلب الطقس
        const coords = await getCoordinates(cityName);
        const weather = await getWeatherData(coords.lat, coords.lon);

        // حذف العلامة السابقة إن وجدت
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        // تحريك الخريطة للموقع الجديد
        map.flyTo([coords.lat, coords.lon], 12, {
            animate: true,
            duration: 1.5
        });

        // إضافة العلامة الجديدة
        currentMarker = L.marker([coords.lat, coords.lon]).addTo(map);

        // فتح النافذة المنبثقة
        const popupContent = createInfoWindowContent(cityName, weather);
        currentMarker.bindPopup(popupContent).openPopup();

        // تفعيل زر المشاركة
        setTimeout(() => {
            const shareBtn = document.getElementById('share-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', async () => {
                    const text = shareBtn.getAttribute('data-text');
                    
                    if (navigator.share) {
                        try {
                            await navigator.share({
                                title: 'WeatherMap',
                                text: text,
                            });
                        } catch (err) {
                            console.log('تم إلغاء المشاركة.');
                        }
                    } else {
                        navigator.clipboard.writeText(text).then(() => {
                            alert('تم نسخ نص الطقس إلى الحافظة!');
                        });
                    }
                });
            }
        }, 100);

    } catch (error) {
        // إظهار الخطأ للمستخدم
        alert(error.message);
    } finally {
        // إخفاء مؤشر التحميل دائماً
        loadingSpinner.classList.add('hidden');
    }
}

// ربط حدث الإرسال بالدالة
form.addEventListener('submit', handleSearch);