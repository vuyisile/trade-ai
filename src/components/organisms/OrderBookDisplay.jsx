import React from 'react';
import OrderBookRow from '../molecules/OrderBookRow';

const OrderBookDisplay = ({ orderBook, currentPrice, formatPrice }) => {
    const maxVolume = Math.max(
        ...orderBook.bids.map(b => b.size),
        ...orderBook.asks.map(a => a.size)
    );

    return (
        <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                <span>VOLUME (UNITS)</span><span>PRICE (ASK)</span>
            </div>
            {orderBook.asks.map((ask, index) => (
                <OrderBookRow key={`ask-${index}`} price={ask.price} volume={ask.size} maxVolume={maxVolume} color="red" />
            ))}
            
            <div className="text-center py-2 text-lg font-extrabold text-white bg-gray-700 rounded-sm my-1 shadow-md">
                {formatPrice(currentPrice)}
            </div>

            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
                <span>PRICE (BID)</span><span>VOLUME (UNITS)</span>
            </div>
            {orderBook.bids.map((bid, index) => (
                <OrderBookRow key={`bid-${index}`} price={bid.price} volume={bid.size} maxVolume={maxVolume} color="green" />
            ))}
        </div>
    );
};

export default OrderBookDisplay;