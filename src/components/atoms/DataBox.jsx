import React from 'react';

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

export default DataBox;