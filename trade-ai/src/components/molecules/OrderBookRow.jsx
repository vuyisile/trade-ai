import React from 'react';

const OrderBookRow = ({ price, volume, isBid }) => {
    const textColor = isBid ? 'text-green-500' : 'text-red-500';

    return (
        <div className={`flex justify-between items-center text-sm font-mono ${textColor}`}>
            <span>{price.toFixed(5)}</span>
            <span>{volume.toFixed(0)}</span>
        </div>
    );
};

export default OrderBookRow;