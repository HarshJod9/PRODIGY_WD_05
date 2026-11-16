# PRODIGY_WD_05 — Weather App

A responsive weather app that looks up current conditions and a five-day forecast by city or by the user's location.

## Run

Open `index.html` in a browser with internet access. The geolocation API generally requires `localhost` or HTTPS; city search works from a browser that permits network requests from local files, or from any static HTTP server.

## Features

- City and town search through Open-Meteo geocoding
- Optional browser geolocation
- Current conditions, feels-like temperature, wind, humidity, precipitation, sunrise and sunset
- Hourly outlook and five-day forecast
- Celsius/Fahrenheit toggle
- Loading, empty, no-result, network-error and location-permission states
- No API key or account required

Weather data is fetched from [Open-Meteo](https://open-meteo.com/). A network connection is required for forecasts.
