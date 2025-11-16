import React from 'react';

const MetricItem = ({ label, value, color }) => (
    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-lg font-extrabold ${color}`}>{value}</span>
    </div>
);

export default MetricItem;