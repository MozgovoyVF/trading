const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

// Настройки Binance API
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const BINANCE_BASE_URL = 'https://fapi.binance.com';

// Создаем приложение Express
const app = express();
app.use(bodyParser.json());

// Логирование в файл
const logToConsole = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};


// Вспомогательная функция для создания подписи
const createSignature = (params, secret) => {
    const queryString = new URLSearchParams(params).toString();
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
};

// Функция отправки ордера на Binance Futures
const placeOrder = async (symbol, side, quantity, type = 'MARKET') => {
    try {
        const timestamp = Date.now();
        const params = {
            symbol: symbol,
            side: side,
            type: type,
            quantity: quantity,
            timestamp: timestamp
        };
        params.signature = createSignature(params, API_SECRET);
        const response = await axios.post(`${BINANCE_BASE_URL}/fapi/v1/order`, null, {
            headers: { 'X-MBX-APIKEY': API_KEY },
            params: params
        });
        logToConsole(`Успешно создан ордер: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        logToConsole(`Ошибка при создании ордера: ${error.response?.data || error.message}`);
    }
};

// Эндпоинт для получения вебхуков от TradingView
app.post('/api/webhook', async (req, res) => {
    try {
        const data = req.body;
        logToConsole(`Получено сообщение от TradingView: ${JSON.stringify(data)}`);
        if (!data || !data.symbol || !data.side || !data.quantity) {
            logToConsole('Некорректные данные в вебхуке');
            return res.status(400).send('Некорректные данные');
        }
        const { symbol, side, quantity } = data;
        const order = await placeOrder(symbol, side.toUpperCase(), quantity);
        if (order) {
            res.status(200).send('Ордер успешно отправлен');
        } else {
            res.status(500).send('Ошибка при отправке ордера');
        }
    } catch (error) {
        logToConsole(`Ошибка обработки вебхука: ${error.message}`);
        res.status(500).send('Ошибка сервера');
    }
});

// Экспорт приложения для Vercel
module.exports = app;
