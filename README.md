# WeatherMap

A responsive Single Page Application that shows real-time weather for any city on an interactive map. Built with pure vanilla JavaScript (no frameworks) for the **Advanced Web Technologies** course, Project 2.

**Live demo:** https://abeeryasser876-ai.github.io/WeatherMap-Project/

## How it works

1. The user types a city name and clicks **Get Weather** (or uses **My Location**).
2. The app geocodes the name to coordinates (Nominatim / OpenStreetMap).
3. Using those coordinates, it fetches current weather (OpenWeatherMap) and a 5-day forecast (Open-Meteo).
4. The map flies smoothly to the location, replaces the old marker with a new one, and opens an InfoWindow (popup) with the weather details and a Share button.

Everything runs asynchronously with `fetch` and `async/await`. The page never reloads.

## Features

- Asynchronous geocoding followed by a chained weather request
- Leaflet map (OpenStreetMap tiles) centred on Khartoum (15.5007, 32.5599) at zoom 6 on load
- Smooth `flyTo` animation and a single marker at a time
- Popup InfoWindow bound to the marker: city name, temperature, weather icon, clouds, humidity, wind speed and a **Share** button
- Loading spinner while requests are in progress
- User-friendly error cards (city not found, empty input, API errors such as 404, 401 and 429, geolocation denied)
- Responsive layout for desktop and mobile

### Bonus / novelty features

- **Favorites:** save cities to `localStorage` and open them again with one click
- **Share Weather:** uses the Web Share API, with a clipboard fallback
- **5-day forecast** from Open-Meteo
- **My Location:** weather for the user's current position (Geolocation API)
- **Toast messages** instead of `alert()` popups

## APIs and libraries

| Purpose | Service |
|---|---|
| Current weather | [OpenWeatherMap Current Weather API](https://openweathermap.org/current) (API key required) |
| Geocoding | [Nominatim (OpenStreetMap)](https://nominatim.org/) |
| 5-day forecast | [Open-Meteo](https://open-meteo.com/) (no key) |
| Map | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap tiles (Option B, no key) |
| Icons and font | Font Awesome, Google Fonts (Poppins) |

## Project structure

```
WeatherMap-Project/
├── index.html   # structure only (no inline JS or inline styles)
├── style.css    # all styling
├── script.js    # all behavior (event listeners via addEventListener)
├── config.js          # API key and settings
├── config.example.js  # template for config.js
└── README.md
```

## Setup

No build step or server is needed.

1. Clone the repository:
   ```
   git clone https://github.com/abeeryasser876-ai/WeatherMap-Project.git
   cd WeatherMap-Project
   ```
2. Get a free API key from [openweathermap.org](https://openweathermap.org/api) (sign up, then open "API keys").
3. Open `config.js` and replace the value of `openWeatherApiKey` with your own key (`config.example.js` shows the expected format).
4. Open `index.html` in a browser (or use a local server such as the VS Code "Live Server" extension).

New OpenWeatherMap keys can take a few minutes to activate.

### Security Note & Production Readiness
As this is a pure client-side application built with Vanilla JavaScript, the OpenWeatherMap API key is inevitably exposed in the browser. To mitigate any risks, the key used is restricted to the free tier with no billing information attached, meaning no financial risks are involved. This is a standard acceptable practice for academic front-end projects. 
The key is kept in a separate `config.js` file so it stays apart from the application logic, but because this is a client-side project it is still visible in the browser.
For production environments, a Backend Proxy (e.g., Serverless function) would be implemented to secure the key and prevent unauthorized usage.


## Deployment

The site is deployed with GitHub Pages from the `main` branch (Settings, then Pages).

## Design decisions

- The map container is exactly `70vh` with a solid navy border and a soft shadow, as required.
- The page title is 2rem (twice the 16px body font) with a box shadow and uses the Poppins font from Google Fonts.
- The forecast is loaded separately, so if it fails the current weather still shows.
- On small screens the weather cards appear before the map so users do not have to scroll past a tall map.

## Constraints followed

- Pure vanilla JavaScript, with no React, Angular, Vue, Svelte, jQuery or d3
- HTML, CSS and JavaScript in separate files
- No inline event handlers and no inline styles
- All network calls are asynchronous with `try/catch` error handling
- The search form uses `event.preventDefault()`, so there are no full-page reloads

## Author

Abeer Yasser Abdelmajeed, Software Engineering, Sudan University of Science and Technology.
