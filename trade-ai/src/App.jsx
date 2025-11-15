import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import Dashboard from './components/templates/Dashboard';
import { fetchWithRetry, getTradingDecision, generateInitialData, generateNextMinuteData } from './utils/simulation';
import { TRADE_SIZE, TRADING_FEE, appId, firebaseConfig, initialAuthToken } from './utils/helpers';

const App = () => {
    const [trading, setTrading] = useState(false);
    const [data, setData] = useState(generateInitialData());
    const [balance, setBalance] = useState(10000.00);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [stockTicker, setStockTicker] = useState('EUR/USD');
    
    const [dbInstance, setDbInstance] = useState(null);
    const [userId, setUserId] = useState('...');
    const intervalRef = useRef(null);

    useEffect(() => {
        const initFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const db = getFirestore(app);
                
                setDbInstance(db);

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else if (initialAuthToken) {
                        const userCred = await signInWithCustomToken(auth, initialAuthToken);
                        setUserId(userCred.user.uid);
                    } else {
                        const userCred = await signInAnonymously(auth);
                        setUserId(userCred.user.uid);
                    }
                });
            } catch (err) {
                console.error("Firebase Initialization Error:", err);
                setUserId('auth-failed-' + (crypto.randomUUID ? crypto.randomUUID() : 'default'));
            }
        };

        if (Object.keys(firebaseConfig).length > 0) {
            initFirebase();
        } else {
            setUserId('mock-user-id-12345');
        }
    }, []);

    const saveSignalToBridge = useCallback(async (action, rationale, price) => {
        if (!dbInstance || userId === '...' || action === 'PASS') {
            return;
        }

        const signalRef = doc(dbInstance, 'artifacts', appId, 'public', 'data', 'signals', userId);
        const signalData = {
            timestamp: Date.now(),
            ticker: stockTicker,
            action: action,
            price: price,
            tradeSize: TRADE_SIZE,
            rationale: rationale,
            status: 'NEW_SIGNAL',
        };

        try {
            await setDoc(signalRef, signalData);
            console.log(`[BRIDGE] Signal ${action} written for user ${userId}`);
        } catch (e) {
            console.error("[BRIDGE] Error writing signal to Firestore bridge:", e);
        }
    }, [dbInstance, userId, stockTicker]);

    const executeTrade = useCallback((action, rationale) => {
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

    const runSimulationStep = useCallback(async () => {
        if (!trading || isLoading || !stockTicker) return;

        setIsLoading(true);
        setError('');

        try {
            setData(prev => generateNextMinuteData(prev));
            const decision = await getTradingDecision(stockTicker, data, currentPosition);
            await saveSignalToBridge(decision.action, decision.rationale, data.currentPrice);
            executeTrade(decision.action, decision.rationale);
        } catch (err) {
            console.error("Simulation step failed:", err);
            setError(`Simulation Step Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [trading, isLoading, data, currentPosition, executeTrade, stockTicker, saveSignalToBridge]);

    useEffect(() => {
        if (trading) {
            intervalRef.current = setInterval(runSimulationStep, 3000); 
        } else {
            clearInterval(intervalRef.current);
        }
        
        return () => clearInterval(intervalRef.current);
    }, [trading, runSimulationStep]);
    
    const toggleTrading = () => setTrading(prev => !prev);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-8 font-inter">
            <Dashboard 
                trading={trading}
                toggleTrading={toggleTrading}
                isLoading={isLoading}
                error={error}
                stockTicker={stockTicker}
                setStockTicker={setStockTicker}
                balance={balance}
                currentPosition={currentPosition}
                data={data}
                tradeHistory={tradeHistory}
                executeTrade={executeTrade}
            />
        </div>
    );
};

export default App;