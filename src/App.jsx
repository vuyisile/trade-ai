/* global __app_id, __firebase_config, __initial_auth_token */
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// --- MANDATORY FIREBASE SETUP ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- API CONSTANTS (FIXED 401 ERROR HERE) ---
const GEMINI_API_KEY = ""; // Must remain empty for environment injection
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;


// Helper for Exponential Backoff and Fetching
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status !== 429 || i === retries - 1) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }
            return response;
        } catch (error) {
            if (i < retries - 1 && error.message.includes('429')) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.warn(`Rate limit encountered. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
};

// Gemini API Call Function for Structured Trading Decision
const getTradingDecision = async (ticker, data, currentPosition) => {
    // Extract top bid/ask for prompt
    const topBidPrice = data.orderBook.bids[0].price;
    const topBidSize = data.orderBook.bids[0].size;
    const topAskPrice = data.orderBook.asks[0].price;
    const topAskSize = data.orderBook.asks[0].size;

    const systemPrompt = `You are a High-Frequency Trading AI (HFT) specializing in **Forex Currency Pairs** (like EUR/USD). Your task is to provide an immediate, structured trading decision based on the latest 1-minute market data, **Order Book imbalance**, and real-time news sentiment.
    
    Current Portfolio Status: The current position in ${ticker} is ${currentPosition} units (e.g., standard lot of 100,000 units).
    
    You must output **ONLY** a single JSON object. Do not include any text outside the JSON block.
    
    ACTION definitions:
    - BUY: Enter a long position or increase the current long position.
    - SELL: Exit the current long position.
    - PASS: Take no action. Wait for a clearer signal.`;

    const userQuery = `Analyze the current 1-minute data for ${ticker}: 
    Current Price: ${data.currentPrice.toFixed(5)}. 
    RSI: ${data.rsi}. 
    Volume: ${data.dailyVolume}. 
    
    **Order Book (Level 2):** Top Bid Price: ${topBidPrice.toFixed(5)} (Volume/Size: ${topBidSize} units) 
    Top Ask Price: ${topAskPrice.toFixed(5)} (Volume/Size: ${topAskSize} units)
    
    Current Position: ${currentPosition} units. 
    
    Provide the best trading decision (BUY, SELL, or PASS) and a one-sentence rationale. Enable Google Search grounding for real-time sentiment.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            "action": {
                "type": "STRING",
                "enum": ["BUY", "SELL", "PASS"]
            },
            "rationale": {
                "type": "STRING",
                "description": "A single, concise, one-sentence reason for the action."
            }
        },
        required: ["action", "rationale"]
    };

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ "google_search": {} }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    try {
        const response = await fetchWithRetry(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
             // Handle potential Markdown backticks if model wraps JSON
            const cleanJsonText = jsonText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJsonText);
            return { action: parsed.action, rationale: parsed.rationale };
        }
        return { action: 'PASS', rationale: 'AI failed to generate structured output.' };

    } catch (error) {
        console.error("Gemini API Error (Structured Decision):", error);
        return { action: 'PASS', rationale: `API Error: ${error.message}` };
    }
};

// --- SIMULATED DATA HELPERS (omitted for brevity, assume working) ---
const INITIAL_PRICE = 1.10550;
const INITIAL_RSI = 50.00;
const TRADE_SIZE = 10000; 
const TRADING_FEE = 0.0001; 
const BASE_SPREAD = 0.00015; 
const BASE_VOLUME = 500000; 

const generateMockOrderBook = (price) => {
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

const generateInitialData = () => ({
    currentPrice: INITIAL_PRICE,
    rsi: INITIAL_RSI,
    dailyVolume: 500000000,
    minute: 0,
    orderBook: generateMockOrderBook(INITIAL_PRICE)
});

const generateNextMinuteData = (prevData) => {
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

const getActionStyle = (action) => {
    switch (action) {
        case 'BUY': return { color: 'text-green-500', icon: 'M12 4.75l7 7m-7-7v14.5m0 0l-7-7' };
        case 'SELL': return { color: 'text-red-500', icon: 'M12 19.25l-7-7m7 7v-14.5m0 0l7 7' };
        default: return { color: 'text-yellow-500', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 100 2h2a1 1 0 100-2h-2z' };
    }
};


// --- REACT COMPONENT ---

const App = () => {
    const [trading, setTrading] = useState(false);
    const [data, setData] = useState(generateInitialData());
    const [balance, setBalance] = useState(10000.00);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [stockTicker, setStockTicker] = useState('EUR/USD');
    
    // Firebase State Management
    const [dbInstance, setDbInstance] = useState(null);
    const [userId, setUserId] = useState('...');
    const intervalRef = useRef(null);

    // 1. Firebase Initialization & Auth
    useEffect(() => {
        const initFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const db = getFirestore(app);
                
                setDbInstance(db); // Store db instance

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } 
                    else if (initialAuthToken) {
                        const userCred = await signInWithCustomToken(auth, initialAuthToken);
                        setUserId(userCred.user.uid);
                    } else {
                        const userCred = await signInAnonymously(auth);
                        setUserId(userCred.user.uid);
                    }
                });
            } catch (err) {
                console.error("Firebase Initialization Error:", err);
                // Fallback userId if Firebase setup fails
                setUserId('auth-failed-' + (crypto.randomUUID ? crypto.randomUUID() : 'default'));
            }
        };

        if (Object.keys(firebaseConfig).length > 0) {
            initFirebase();
        } else {
            // Mock initialization if outside canvas
            setUserId('mock-user-id-12345');
        }
    }, []);

    // --- AI SIGNAL DISPATCH BRIDGE ---
    const saveSignalToBridge = useCallback(async (action, rationale, price) => {
        // Only attempt to save if we have the database instance and a valid userId
        if (!dbInstance || userId === '...' || action === 'PASS') {
            return;
        }

        const signalRef = doc(dbInstance, 'artifacts', appId, 'public', 'data', 'signals', userId);
        const signalData = {
            timestamp: Date.now(),
            ticker: stockTicker,
            action: action, // BUY or SELL
            price: price, // The current simulated price
            tradeSize: TRADE_SIZE, // Fixed unit size
            rationale: rationale,
            status: 'NEW_SIGNAL', // Status for external EA to acknowledge
        };

        try {
            await setDoc(signalRef, signalData);
            console.log(`[BRIDGE] Signal ${action} written for user ${userId}`);
        } catch (e) {
            console.error("[BRIDGE] Error writing signal to Firestore bridge:", e);
        }
    }, [dbInstance, userId, stockTicker]);
    // ---------------------------------

    // Trading Logic (Action Execution)
    const executeTrade = useCallback((action, rationale) => {
        // ... (rest of executeTrade logic remains the same for simulation purposes)
        const entryPrice = data.currentPrice;
        let newPosition = currentPosition;
        let pnlChange = 0;
        let newBalance = balance;

        const grossCostOrProceeds = entryPrice * TRADE_SIZE; 
        const fee = TRADE_SIZE * TRADING_FEE; 
        
        if (action === 'BUY') {
            const netCost = grossCostOrProceeds + fee;
            
            if (balance >= netCost) {
                newPosition += TRADE_SIZE;
                newBalance -= netCost;
                setCurrentPosition(newPosition);
                setBalance(newBalance);
                
                const newTrade = {
                    id: Date.now(),
                    minute: data.minute,
                    time: new Date().toLocaleTimeString(),
                    action,
                    shares: TRADE_SIZE,
                    price: entryPrice,
                    rationale,
                    pnl: -fee,
                    fee: fee,
                };
                setTradeHistory(prev => [newTrade, ...prev]);
            } else {
                setError(`Cannot BUY ${TRADE_SIZE} units. Insufficient funds.`);
            }
        } else if (action === 'SELL' && currentPosition > 0) {
            const exitValue = entryPrice * currentPosition;
            const closingFee = currentPosition * TRADING_FEE;
            const netProceeds = exitValue - closingFee;
            
            const totalBuyCost = tradeHistory
                .filter(t => t.action === 'BUY')
                .reduce((sum, trade) => sum + (trade.price * trade.shares) + trade.fee, 0); 
            
            pnlChange = netProceeds - totalBuyCost;
            newBalance += netProceeds;
            
            setTradeHistory(prev => {
                const historyCopy = [...prev];
                const closingTrade = {
                    id: Date.now() + 1,
                    minute: data.minute,
                    time: new Date().toLocaleTimeString(),
                    action: 'CLOSE_LONG',
                    shares: currentPosition,
                    price: entryPrice,
                    rationale: `Closed long position. Net P&L (incl. fees): $${pnlChange.toFixed(2)}`,
                    pnl: pnlChange,
                    fee: closingFee,
                };
                return [closingTrade, ...historyCopy];
            });

            setCurrentPosition(0);
            setBalance(newBalance);
        } else if (action === 'SELL' && currentPosition === 0) {
            setError('Cannot SELL, no current long position to close.');
        }

        if (action !== 'PASS') {
            console.log(`${action} executed at ${entryPrice.toFixed(5)} | New Position: ${newPosition}`);
        }
    }, [balance, currentPosition, data.currentPrice, data.minute, tradeHistory]);

    // 2. The Core Trading Loop (Simulated 1-Minute)
    const runSimulationStep = useCallback(async () => {
        if (!trading || isLoading || !stockTicker) return;

        setIsLoading(true);
        setError('');

        try {
            // 1. Generate new market data
            setData(prev => generateNextMinuteData(prev));
            
            // 2. Get AI Decision (structured)
            const decision = await getTradingDecision(stockTicker, data, currentPosition);
            
            // 3. Dispatch Signal (New Bridge Step!)
            await saveSignalToBridge(decision.action, decision.rationale, data.currentPrice);
            
            // 4. Execute Trade (for local simulation/P&L tracking)
            executeTrade(decision.action, decision.rationale);

        } catch (err) {
            console.error("Simulation step failed:", err);
            setError(`Simulation Step Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [trading, isLoading, data, currentPosition, executeTrade, stockTicker, saveSignalToBridge]);

    // 3. Setup and Teardown of the Interval (omitted for brevity, assume working)
    useEffect(() => {
        if (trading) {
            intervalRef.current = setInterval(runSimulationStep, 3000); 
        } else {
            clearInterval(intervalRef.current);
        }
        
        return () => clearInterval(intervalRef.current);
    }, [trading, runSimulationStep]);
    
    const toggleTrading = () => setTrading(prev => !prev);
    
    // Calculate P&L for display (omitted for brevity, assume working)
    const totalBuyCost = tradeHistory.filter(t => t.action === 'BUY').reduce((sum, t) => sum + (t.price * t.shares) + t.fee, 0);
    const currentMarketValue = currentPosition * data.currentPrice;
    const unrealizedPnl = currentMarketValue - totalBuyCost;
    
    const realizedPnl = tradeHistory
        .filter(t => t.action === 'CLOSE_LONG')
        .reduce((sum, t) => sum + t.pnl, 0);
    const totalPnl = realizedPnl + unrealizedPnl;
    
    const pnlStyle = totalPnl >= 0 ? 'text-green-500' : 'text-red-500';

    const formatPrice = (price) => price.toFixed(5);
    const formatPnl = (pnl) => `$${pnl.toFixed(2)}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-8 font-inter">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>{`
                html, body, #root { height: 100%; }
                .font-inter { font-family: 'Inter', sans-serif; }
            `}</style>
            
            <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
                <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    Simulated Forex HFT Bot ({stockTicker})
                </h1>
                <p className="text-sm text-red-500 font-semibold mt-1">
                    THIS IS A SIMULATION ONLY. NO REAL TRADES ARE EXECUTED. DO NOT RELY ON THIS FOR REAL FINANCIAL DECISIONS.
                </p>
                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border-l-4 border-yellow-500 text-sm">
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">META-TRADER BRIDGE ENABLED:</p>
                    <p className="font-mono text-xs text-yellow-700 dark:text-yellow-400 break-all mt-1">
                        Your unique **User ID** (for the EA to read): <span className="font-extrabold text-gray-900 dark:text-white">{userId}</span>
                    </p>
                    <p className="font-mono text-xs text-yellow-700 dark:text-yellow-400 break-all">
                        The EA must watch this public document path: `/artifacts/{appId}/public/data/signals/{userId}`
                    </p>
                </div>
            </header>
            
            {/* Control Panel */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {/* Ticker Input */}
                <input 
                    type="text"
                    onChange={(e) => setStockTicker(e.target.value.toUpperCase().slice(0, 10))} 
                    value={stockTicker}
                    placeholder="Enter Currency Pair (e.g., GBP/JPY)"
                    className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-40 font-bold text-center uppercase transition duration-150"
                    disabled={trading}
                    maxLength={10} 
                />
                
                <div className="text-lg font-bold">
                    Trading Status: 
                    <span className={`ml-2 ${trading ? 'text-green-500' : 'text-red-500'}`}>
                        {trading ? 'RUNNING' : 'STOPPED'}
                    </span>
                </div>
                <button
                    onClick={toggleTrading}
                    disabled={isLoading || !stockTicker}
                    className={`p-3 rounded-lg font-bold text-white transition duration-200 w-full sm:w-auto shadow-md ${
                        isLoading || !stockTicker
                            ? 'bg-gray-400 cursor-wait'
                            : trading
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                                : 'bg-green-600 hover:bg-green-700 focus:ring-green-300'
                    }`}
                >
                    {isLoading ? 'Processing...' : trading ? 'STOP BOT' : 'START 1-MINUTE TRADING'}
                </button>
            </div>
            
            {error && (
                <div className="p-3 mb-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-400 rounded-lg font-medium">
                    {error}
                </div>
            )}
            
            {/* Dashboard Grid (omitted for brevity, assume working) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Metrics Card */}
                <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-blue-500 dark:border-blue-400">
                    <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Portfolio & Market Metrics</h3>
                    <div className="space-y-3">
                        <MetricItem label="Cash Balance (USD)" value={formatPnl(balance)} color="text-yellow-600" />
                        <MetricItem label="Current Position (Units)" value={`${currentPosition.toFixed(0)}`} color="text-indigo-600" />
                        <MetricItem label="Current Price" value={formatPrice(data.currentPrice)} color={data.currentPrice - INITIAL_PRICE >= 0 ? 'text-green-600' : 'text-red-600'} />
                        <MetricItem label="RSI" value={data.rsi.toFixed(2)} color={data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-yellow-500'} />
                        <MetricItem label="Total P&L (Net USD)" value={formatPnl(totalPnl)} color={pnlStyle} />
                        <MetricItem label="Realized P&L" value={formatPnl(realizedPnl)} color={realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
                    </div>
                </div>

                {/* AI Decision Card */}
                <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-green-500 dark:border-green-400">
                    <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">AI Decision Summary</h3>
                    <div className="space-y-4">
                        <DataBox label="Last Action" value={tradeHistory[0]?.action || 'PASS'} color={getActionStyle(tradeHistory[0]?.action).color} />
                        <DataBox label="Last Rationale" value={tradeHistory[0]?.rationale || 'Awaiting signal from AI...'} isRationale={true} />
                    </div>
                </div>

                {/* Order Book Card */}
                <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-yellow-500 dark:border-yellow-400">
                    <h3 className="text-xl font-bold mb-4 text-yellow-600 dark:text-yellow-400">Simulated Order Book (Level 2)</h3>
                    <OrderBookDisplay orderBook={data.orderBook} currentPrice={data.currentPrice} formatPrice={formatPrice} />
                </div>
            </div>
            
            {/* Trade History */}
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                Simulated Trade History
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <TradeHistoryTable history={tradeHistory} formatPrice={formatPrice} formatPnl={formatPnl} />
            </div>

            <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
                Built with React and Gemini API (using structured JSON output and Google Search grounding).
            </div>
        </div>
    );
};

// --- Sub-Components (omitted for brevity, assume working) ---
const OrderBookDisplay = ({ orderBook, currentPrice, formatPrice }) => {
    // Determine Max Volume for bar width scaling
    const maxVolume = Math.max(
        ...orderBook.bids.map(b => b.size),
        ...orderBook.asks.map(a => a.size)
    );

    return (
        <div className="space-y-1">
            {/* Asks (Sellers) */}
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                <span>VOLUME (UNITS)</span><span>PRICE (ASK)</span>
            </div>
            {orderBook.asks.map((ask, index) => (
                <div key={`ask-${index}`} className="flex justify-between items-center text-red-500 text-sm font-mono relative">
                    {/* Volume Bar */}
                    <div className="absolute top-0 right-0 h-full bg-red-500/10" style={{ width: `${(ask.size / maxVolume) * 100}%` }}></div>
                    <span className="relative z-10">{formatPrice(ask.price)}</span>
                    <span className="relative z-10">{ask.size.toFixed(0)}</span>
                </div>
            ))}
            
            {/* Current Price Marker */}
            <div className="text-center py-2 text-lg font-extrabold text-white bg-gray-700 rounded-sm my-1 shadow-md">
                {formatPrice(currentPrice)}
            </div>

            {/* Bids (Buyers) */}
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                <span>PRICE (BID)</span><span>VOLUME (UNITS)</span>
            </div>
            {orderBook.bids.map((bid, index) => (
                <div key={`bid-${index}`} className="flex justify-between items-center text-green-500 text-sm font-mono relative">
                    {/* Volume Bar */}
                    <div className="absolute top-0 left-0 h-full bg-green-500/10" style={{ width: `${(bid.size / maxVolume) * 100}%` }}></div>
                    <span className="relative z-10">{formatPrice(bid.price)}</span>
                    <span className="relative z-10">{bid.size.toFixed(0)}</span>
                </div>
            ))}
        </div>
    );
};


const MetricItem = ({ label, value, color }) => (
    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-lg font-extrabold ${color}`}>{value}</span>
    </div>
);

const DataBox = ({ label, value, trend, isRSI = false, isRationale = false, color }) => {
    let trendColor = 'text-gray-500';
    
    if (isRSI) {
        const rsiValue = parseFloat(value);
        if (rsiValue > 70) { trendColor = 'text-red-500'; }
        else if (rsiValue < 30) { trendColor = 'text-green-500'; }
        else { trendColor = 'text-yellow-500'; }
    }
    
    const displayValue = isRationale ? value : value;
    const valueColor = color || trendColor;

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner min-h-20 flex flex-col justify-center">
            <p className="text-xs uppercase font-semibold text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <div className="flex items-center space-x-2">
                <span className={`text-md font-bold ${valueColor}`}>{displayValue}</span>
            </div>
        </div>
    );
};

const TradeHistoryTable = ({ history, formatPrice, formatPnl }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                    {['Time', 'Action', 'Units', 'Price', 'Fee (USD)', 'P&L (Net USD)', 'Rationale'].map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {history.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                            No trades executed yet. Start the bot!
                        </td>
                    </tr>
                ) : (
                    history.slice(0, 10).map((trade) => {
                        const style = getActionStyle(trade.action);
                        const pnlColor = trade.pnl > 0 ? 'text-green-500' : trade.pnl < 0 ? 'text-red-500' : 'text-gray-500';
                        const feeDisplay = trade.fee ? `$${trade.fee.toFixed(4)}` : '—';
                        
                        let pnlDisplay = '—';
                        if (trade.action === 'CLOSE_LONG') {
                            pnlDisplay = formatPnl(trade.pnl);
                        } else if (trade.action === 'BUY') {
                            pnlDisplay = '—';
                        }
                        
                        return (
                            <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{trade.time}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${style.color}`}>{trade.action}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{trade.shares.toFixed(0)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">{formatPrice(trade.price)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">{feeDisplay}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${pnlColor}`}>{pnlDisplay}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={trade.rationale}>{trade.rationale}</td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    </div>
);

export default App;
