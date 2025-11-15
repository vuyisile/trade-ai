import React from 'react';

const ControlPanel = ({ stockTicker, setStockTicker, trading, toggleTrading, isLoading, error }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
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

            {error && (
                <div className="p-3 mb-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-400 rounded-lg font-medium">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ControlPanel;