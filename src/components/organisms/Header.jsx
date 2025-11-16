import React from 'react';

const Header = ({ stockTicker, userId }) => {
    return (
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
                    Your unique <strong>User ID</strong> (for the EA to read): <span className="font-extrabold text-gray-900 dark:text-white">{userId}</span>
                </p>
                <p className="font-mono text-xs text-yellow-700 dark:text-yellow-400 break-all">
                    The EA must watch this public document path: `/artifacts/{appId}/public/data/signals/{userId}`
                </p>
            </div>
        </header>
    );
};

export default Header;