/**
 * Weather Command - Get weather information (no API key needed)
 */
const axios = require('axios');

module.exports = {
  name: 'weather',
  aliases: ['w', 'clima'],
  category: 'utility',
  description: 'Get current weather for any city',
  usage: '.weather <city>',

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const city = args.join(' ').trim();

    if (!city) {
      return extra.reply('❌ Usage: .weather <city>\n\nExample: .weather Lagos');
    }

    try {
      // Use open-meteo with geocoding (completely free, no API key)
      const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: city, count: 1, language: 'en', format: 'json' },
        timeout: 10000
      });

      const location = geoRes.data?.results?.[0];
      if (!location) {
        return extra.reply(`❌ City not found: *${city}*\n\nTry a more specific city name.`);
      }

      const { latitude, longitude, name, country, timezone } = location;

      const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
          timezone: timezone || 'auto'
        },
        timeout: 10000
      });

      const cur = weatherRes.data?.current;
      if (!cur) throw new Error('No weather data');

      const weatherEmoji = (code) => {
        if (code === 0) return '☀️';
        if (code <= 3) return '⛅';
        if (code <= 48) return '🌫️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🌦️';
        if (code <= 99) return '⛈️';
        return '🌡️';
      };

      const emoji = weatherEmoji(cur.weather_code);

      await extra.reply(
        `${emoji} *Weather in ${name}, ${country}*\n\n` +
        `🌡️ Temperature: *${cur.temperature_2m}°C* (feels like ${cur.apparent_temperature}°C)\n` +
        `💧 Humidity: *${cur.relative_humidity_2m}%*\n` +
        `💨 Wind Speed: *${cur.wind_speed_10m} km/h*\n\n` +
        `📍 ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E\n\n` +
        `> Topai Bot`
      );
    } catch (err) {
      extra.reply('❌ Failed to fetch weather: ' + err.message);
    }
  }
};
