// This file contains utility functions for generating simulated market data, including generating initial data and simulating market changes.

const INITIAL_PRICE = 1.10550;
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