// This file contains utility functions for generating simulated market data, including generating initial data and simulating market changes.

export const INITIAL_PRICE = 1.10550;
const INITIAL_RSI = 50.00;
const TRADE_SIZE = 10000; 
const BASE_SPREAD = 0.00015; 
const BASE_VOLUME = 500000; 

export const generateMockOrderBook = (price) => {
    const spread = BASE_SPREAD + (Math.random() * 0.00005 - 0.000025);
    const askPrice = price + spread / 2;
    const bidPrice = price - spread / 2;

    const volumeFactor = Math.random() * 0.4 + 0.8; 
    
    const bids = [
        { price: parseFloat(bidPrice.toFixed(5)), size: Math.floor(BASE_VOLUME * volumeFactor * 1.5) },
        { price: parseFloat((bidPrice - 0.00005).toFixed(5)), size: Math.floor(BASE_VOLUME * 1.2) },
        { price: parseFloat((bidPrice - 0.00010).toFixed(5)), size: Math.floor(BASE_VOLUME * 0.8) },
    ].sort((a, b) => b.price - a.price);

    const asks = [
        { price: parseFloat(askPrice.toFixed(5)), size: Math.floor(BASE_VOLUME * (2 - volumeFactor) * 1.5) },
        { price: parseFloat((askPrice + 0.00005).toFixed(5)), size: Math.floor(BASE_VOLUME * 1.1) },
        { price: parseFloat((askPrice + 0.00010).toFixed(5)), size: Math.floor(BASE_VOLUME * 0.7) },
    ].sort((a, b) => a.price - b.price);
    
    return { bids, asks };
};

export const generateInitialData = () => ({
    currentPrice: INITIAL_PRICE,
    rsi: INITIAL_RSI,
    dailyVolume: 500000000,
    minute: 0,
    orderBook: generateMockOrderBook(INITIAL_PRICE)
});

export const generateNextMinuteData = (prevData) => {
    const drift = (Math.random() - 0.5) * 0.00015; 
    let nextPrice = prevData.currentPrice + drift;
    
    if (nextPrice < 1.09000) nextPrice = 1.09000;
    if (nextPrice > 1.12000) nextPrice = 1.12000;

    const priceChange = nextPrice - prevData.currentPrice;
    let nextRSI = prevData.rsi + (priceChange > 0 ? 1 : -1) * Math.random() * 2;
    
    if (nextRSI > 80) nextRSI = 80;
    if (nextRSI < 20) nextRSI = 20;

    return {
        currentPrice: parseFloat(nextPrice.toFixed(5)),
        rsi: parseFloat(nextRSI.toFixed(2)),
        dailyVolume: prevData.dailyVolume + Math.floor(Math.random() * 500000) - 200000,
        minute: prevData.minute + 1,
        orderBook: generateMockOrderBook(nextPrice),
    };
};

// --- New exports to satisfy App.jsx imports ---

export const fetchWithRetry = async (url, options = {}, retries = 3, backoff = 500) => {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
        }
        throw err;
    }
};

/**
 * Simple rule-based decision helper for simulation:
 * - BUY when RSI < 30 and no current position
 * - SELL when RSI > 70 and there is a current long position
 * - PASS otherwise
 */
export const getTradingDecision = (ticker, data, currentPosition) => {
    const rsi = data?.rsi ?? 50;
    if (rsi < 30 && currentPosition === 0) {
        return { action: 'BUY', rationale: `RSI ${rsi.toFixed(2)} below 30` };
    }
    if (rsi > 70 && currentPosition > 0) {
        return { action: 'SELL', rationale: `RSI ${rsi.toFixed(2)} above 70` };
    }
    return { action: 'PASS', rationale: `No strong signal (RSI ${rsi.toFixed(2)})` };
};