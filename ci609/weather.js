// Weather Service for OpenWeatherMap API with offline support
class WeatherService {
    constructor() {
        // Gets API key from OpenWeatherMap
        this.apiKey = //Placeholder for API key  
        this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
        this.geoUrl = 'https://api.openweathermap.org/geo/1.0/direct';
        this.weatherData = null;
        this.location = null;
        this.error = null;
        
        // Caches weather data for 30 minutes to reduce API calls
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        // Default location (London) for fallback
        this.defaultLocation = {
            lat: 51.5074,
            lon: -0.1278,
            name: 'London, UK'
        };
    }

    async getCurrentWeather() {
        try {
            // Check if we're online
            const isOnline = this.isOnline();
            
            // Try to get cached data first (works offline too)
            const cached = this.getCachedWeather();
            if (cached && (!isOnline || Date.now() - cached.timestamp < this.cacheDuration)) {
                console.log('Using cached weather data');
                const formattedWeather = this.formatWeatherData(cached.data);
                formattedWeather.isCached = true;
                formattedWeather.isOffline = !isOnline;
                return formattedWeather;
            }

            // If offline and no cache, return default
            if (!isOnline) {
                console.log('Offline mode - no cached weather available');
                return this.getDefaultWeather(true);
            }

            // If online: gets user's location
            await this.getUserLocation();
            
            if (!this.location) {
                console.warn('Unable to get location, using default');
                this.location = this.defaultLocation;
            }

            // Fetch weather data from OpenWeatherMap
            const response = await fetch(
                `${this.baseUrl}?lat=${this.location.lat}&lon=${this.location.lon}&units=metric&appid=${this.apiKey}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Caches the data
            this.cacheWeather(data);
            
            // Stores and formats the data
            this.weatherData = data;
            const formattedWeather = this.formatWeatherData(data);
            formattedWeather.isCached = false;
            formattedWeather.isOffline = false;
            return formattedWeather;
            
        } catch (error) {
            console.error('Failed to get weather data:', error);
            
            // Try to use cached data as fallback
            const cached = this.getCachedWeather();
            if (cached) {
                console.log('Using cached weather as fallback');
                const formattedWeather = this.formatWeatherData(cached.data);
                formattedWeather.isCached = true;
                formattedWeather.isOffline = !this.isOnline();
                return formattedWeather;
            }
            
            // If all else fails, return default weather
            return this.getDefaultWeather(!this.isOnline());
        }
    }

    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        this.location = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        
                        // Tries to get location name from reverse geocoding
                        try {
                            const locationName = await this.getLocationName();
                            this.location.name = locationName;
                        } catch (error) {
                            console.log('Could not get location name, using coordinates');
                            this.location.name = `${this.location.lat.toFixed(2)}, ${this.location.lon.toFixed(2)}`;
                        }
                        
                        resolve(this.location);
                    },
                    async (error) => {
                        console.warn('Geolocation failed:', error);
                        
                        //As a fallback,  try to get location by IP or use default
                        try {
                            this.location = await this.getLocationByIP();
                            resolve(this.location);
                        } catch (ipError) {
                            console.warn('IP location failed, using default:', ipError);
                            // Uses default location if getting ip location fails
                            this.location = this.defaultLocation;
                            resolve(this.location);
                        }
                    },
                    {
                        enableHighAccuracy: false, // Better for battery life
                        timeout: 15000,
                        maximumAge: 600000 // Accept cached location up to 10 minutes old
                    }
                );
            } else {
                console.warn('Geolocation not supported');
                this.location = this.defaultLocation;
                resolve(this.location);
            }
        });
    }

    async getLocationName() {
        if (!this.location) return 'Unknown location';
        
        // If offline, return coordinates
        if (!this.isOnline()) {
            return `${this.location.lat.toFixed(2)}, ${this.location.lon.toFixed(2)}`;
        }
        
        try {
            const response = await fetch(
                `${this.geoUrl}?lat=${this.location.lat}&lon=${this.location.lon}&limit=1&appid=${this.apiKey}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const location = data[0];
                    return `${location.name}, ${location.country}`;
                }
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }
        
        return `${this.location.lat.toFixed(2)}, ${this.location.lon.toFixed(2)}`;
    }

    async getLocationByIP() {
        if (!this.isOnline()) {
            return this.defaultLocation;
        }
        
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    name: `${data.city}, ${data.country_name}`
                };
            }
        } catch (error) {
            console.warn('IP location failed:', error);
        }
        
        return this.defaultLocation;
    }

    formatWeatherData(weatherData) {
        const weatherMap = {
            // Thunderstorm
            200: { emoji: '⛈️', desc: 'Thunderstorm', class: 'weather-thunder' },
            201: { emoji: '⛈️', desc: 'Thunderstorm', class: 'weather-thunder' },
            202: { emoji: '⛈️', desc: 'Heavy Thunderstorm', class: 'weather-thunder' },
            210: { emoji: '🌩️', desc: 'Light thunderstorm', class: 'weather-thunder' },
            211: { emoji: '🌩️', desc: 'Thunderstorm', class: 'weather-thunder' },
            212: { emoji: '🌩️', desc: 'Heavy thunderstorm', class: 'weather-thunder' },
            221: { emoji: '🌩️', desc: 'Thunderstorm', class: 'weather-thunder' },
            230: { emoji: '⛈️', desc: 'Thunderstorm with drizzle', class: 'weather-thunder' },
            231: { emoji: '⛈️', desc: 'Thunderstorm with drizzle', class: 'weather-thunder' },
            232: { emoji: '⛈️', desc: 'Heavy thunderstorm with drizzle', class: 'weather-thunder' },
            
            // Drizzle
            300: { emoji: '🌧️', desc: 'Light drizzle', class: 'weather-rainy' },
            301: { emoji: '🌧️', desc: 'Drizzle', class: 'weather-rainy' },
            302: { emoji: '🌧️', desc: 'Heavy drizzle', class: 'weather-rainy' },
            310: { emoji: '🌧️', desc: 'Light drizzle rain', class: 'weather-rainy' },
            311: { emoji: '🌧️', desc: 'Drizzle rain', class: 'weather-rainy' },
            312: { emoji: '🌧️', desc: 'Heavy drizzle rain', class: 'weather-rainy' },
            313: { emoji: '🌧️', desc: 'Shower rain and drizzle', class: 'weather-rainy' },
            314: { emoji: '🌧️', desc: 'Heavy shower rain and drizzle', class: 'weather-rainy' },
            321: { emoji: '🌧️', desc: 'Shower drizzle', class: 'weather-rainy' },
            
            // Rain
            500: { emoji: '🌦️', desc: 'Light rain', class: 'weather-rainy' },
            501: { emoji: '🌧️', desc: 'Moderate rain', class: 'weather-rainy' },
            502: { emoji: '🌧️', desc: 'Heavy rain', class: 'weather-rainy' },
            503: { emoji: '🌧️', desc: 'Very heavy rain', class: 'weather-rainy' },
            504: { emoji: '🌧️', desc: 'Extreme rain', class: 'weather-rainy' },
            511: { emoji: '🌨️', desc: 'Freezing rain', class: 'weather-rainy' },
            520: { emoji: '🌦️', desc: 'Light shower rain', class: 'weather-rainy' },
            521: { emoji: '🌧️', desc: 'Shower rain', class: 'weather-rainy' },
            522: { emoji: '🌧️', desc: 'Heavy shower rain', class: 'weather-rainy' },
            531: { emoji: '🌧️', desc: 'Ragged shower rain', class: 'weather-rainy' },
            
            // Snow
            600: { emoji: '🌨️', desc: 'Light snow', class: 'weather-snowy' },
            601: { emoji: '🌨️', desc: 'Snow', class: 'weather-snowy' },
            602: { emoji: '🌨️', desc: 'Heavy snow', class: 'weather-snowy' },
            611: { emoji: '🌨️', desc: 'Sleet', class: 'weather-snowy' },
            612: { emoji: '🌨️', desc: 'Light shower sleet', class: 'weather-snowy' },
            613: { emoji: '🌨️', desc: 'Shower sleet', class: 'weather-snowy' },
            615: { emoji: '🌨️', desc: 'Light rain and snow', class: 'weather-snowy' },
            616: { emoji: '🌨️', desc: 'Rain and snow', class: 'weather-snowy' },
            620: { emoji: '🌨️', desc: 'Light shower snow', class: 'weather-snowy' },
            621: { emoji: '🌨️', desc: 'Shower snow', class: 'weather-snowy' },
            622: { emoji: '🌨️', desc: 'Heavy shower snow', class: 'weather-snowy' },
            
            // Atmosphere
            701: { emoji: '🌫️', desc: 'Mist', class: 'weather-cloudy' },
            711: { emoji: '🌫️', desc: 'Smoke', class: 'weather-cloudy' },
            721: { emoji: '🌫️', desc: 'Haze', class: 'weather-cloudy' },
            731: { emoji: '🌪️', desc: 'Sand/dust whirls', class: 'weather-cloudy' },
            741: { emoji: '🌫️', desc: 'Fog', class: 'weather-cloudy' },
            751: { emoji: '🌫️', desc: 'Sand', class: 'weather-cloudy' },
            761: { emoji: '🌫️', desc: 'Dust', class: 'weather-cloudy' },
            762: { emoji: '🌋', desc: 'Volcanic ash', class: 'weather-cloudy' },
            771: { emoji: '🌪️', desc: 'Squalls', class: 'weather-cloudy' },
            781: { emoji: '🌪️', desc: 'Tornado', class: 'weather-cloudy' },
            
            // Clear
            800: { emoji: '☀️', desc: 'Clear sky', class: 'weather-sunny' },
            
            // Clouds
            801: { emoji: '⛅', desc: 'Few clouds', class: 'weather-cloudy' },
            802: { emoji: '🌤️', desc: 'Scattered clouds', class: 'weather-cloudy' },
            803: { emoji: '🌥️', desc: 'Broken clouds', class: 'weather-cloudy' },
            804: { emoji: '☁️', desc: 'Overcast clouds', class: 'weather-cloudy' }
        };

        const weatherId = weatherData.weather[0].id;
        const weatherInfo = weatherMap[weatherId] || { 
            emoji: '🌤️', 
            desc: weatherData.weather[0].description, 
            class: 'weather-cloudy' 
        };
        
        return {
            temperature: Math.round(weatherData.main.temp),
            feels_like: Math.round(weatherData.main.feels_like),
            condition: weatherInfo.desc,
            icon: weatherInfo.emoji,
            iconClass: weatherInfo.class,
            humidity: weatherData.main.humidity,
            pressure: weatherData.main.pressure,
            windSpeed: weatherData.wind.speed,
            windDirection: weatherData.wind.deg,
            clouds: weatherData.clouds.all,
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000),
            location: this.location ? this.location.name : 'Unknown location',
            timestamp: new Date(),
            isOffline: false,
            isCached: false
        };
    }

    getDefaultWeather(isOffline = false) {
        return {
            temperature: 15,
            feels_like: 15,
            condition: isOffline ? 'Offline - Default Data' : 'Weather data unavailable',
            icon: isOffline ? '📶' : '🌤️',
            iconClass: 'weather-sunny',
            humidity: 65,
            pressure: 1013,
            windSpeed: 3.5,
            windDirection: 180,
            clouds: 20,
            location: isOffline ? 'Offline Mode' : 'Unknown location',
            timestamp: new Date(),
            isOffline: isOffline,
            isCached: false
        };
    }

    cacheWeather(data) {
        const cache = {
            data: data,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('weatherCache', JSON.stringify(cache));
        } catch (error) {
            console.error('Failed to cache weather data:', error);
        }
    }

    getCachedWeather() {
        try {
            const cached = localStorage.getItem('weatherCache');
            if (!cached) return null;
            
            const cache = JSON.parse(cached);
            
            // Check if cache is still valid
            if (Date.now() - cache.timestamp < this.cacheDuration) {
                return cache;
            }
            
            // Cache expired
            localStorage.removeItem('weatherCache');
            return null;
            
        } catch (error) {
            console.error('Error reading weather cache:', error);
            return null;
        }
    }

    isOnline() {
        return navigator.onLine;
    }

    clearCache() {
        try {
            localStorage.removeItem('weatherCache');
            console.log('Weather cache cleared');
        } catch (error) {
            console.error('Failed to clear weather cache:', error);
        }
    }

    // Simple method to get weather icons
    getWeatherIcon(weatherCode) {
        const icons = {
            200: '⛈️', 201: '⛈️', 202: '⛈️',
            210: '🌩️', 211: '🌩️', 212: '🌩️',
            221: '🌩️', 230: '⛈️', 231: '⛈️', 232: '⛈️',
            300: '🌧️', 301: '🌧️', 302: '🌧️',
            310: '🌧️', 311: '🌧️', 312: '🌧️',
            313: '🌧️', 314: '🌧️', 321: '🌧️',
            500: '🌦️', 501: '🌧️', 502: '🌧️',
            503: '🌧️', 504: '🌧️', 511: '🌨️',
            520: '🌦️', 521: '🌧️', 522: '🌧️',
            531: '🌧️',
            600: '🌨️', 601: '🌨️', 602: '🌨️',
            611: '🌨️', 612: '🌨️', 613: '🌨️',
            615: '🌨️', 616: '🌨️',
            620: '🌨️', 621: '🌨️', 622: '🌨️',
            701: '🌫️', 711: '🌫️', 721: '🌫️',
            731: '🌪️', 741: '🌫️',
            751: '🌫️', 761: '🌫️',
            762: '🌋', 771: '🌪️', 781: '🌪️',
            800: '☀️',
            801: '⛅', 802: '🌤️', 803: '🌥️', 804: '☁️'
        };
        
        return icons[weatherCode] || '🌤️';
    }
}

// Creates and exports weather service instance
window.weatherService = new WeatherService();
