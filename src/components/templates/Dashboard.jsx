import React from 'react';
import { INITIAL_PRICE } from '../../utils/simulation';
import { formatPnl, formatPrice, getActionStyle as getActionStyleHelper } from '../../utils/helpers';
import MetricItem from '../atoms/MetricItem';
import DataBox from '../atoms/DataBox';
import OrderBookDisplay from '../organisms/OrderBookDisplay';
import TradeHistoryTable from '../organisms/TradeHistoryTable';

// simple action -> style helper fallback (used for Last Action badge color)
// prefer helper's getActionStyle if provided, otherwise use internal
const getActionStyle = (action) => {
    if (typeof getActionStyleHelper === 'function') return getActionStyleHelper(action);
    if (action === 'BUY') return { color: 'text-green-600', label: 'BUY' };
    if (action === 'SELL') return { color: 'text-red-600', label: 'SELL' };
    return { color: 'text-gray-500', label: 'PASS' };
};

const Dashboard = ({ data, currentPosition, balance, tradeHistory, stockTicker }) => {
    const totalBuyCost = tradeHistory.filter(t => t.action === 'BUY').reduce((sum, t) => sum + (t.price * t.shares) + (t.fee || 0), 0);
    const currentMarketValue = currentPosition * data.currentPrice;
    const unrealizedPnl = currentMarketValue - totalBuyCost;

    const realizedPnl = tradeHistory
        .filter(t => t.action === 'CLOSE_LONG')
        .reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalPnlAdjusted = realizedPnl + unrealizedPnl;

    const pnlStyle = totalPnlAdjusted >= 0 ? 'text-green-500' : 'text-red-500';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-blue-500 dark:border-blue-400">
                <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Portfolio & Market Metrics</h3>
                <div className="space-y-3">
                    <MetricItem label="Cash Balance (USD)" value={formatPnl(balance)} color="text-yellow-600" />
                    <MetricItem label="Current Position (Units)" value={`${currentPosition.toFixed(0)}`} color="text-indigo-600" />
                    <MetricItem label="Current Price" value={formatPrice(data.currentPrice)} color={data.currentPrice - INITIAL_PRICE >= 0 ? 'text-green-600' : 'text-red-600'} />
                    <MetricItem label="RSI" value={data.rsi.toFixed(2)} color={data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-yellow-500'} />
                    <MetricItem label="Total P&L (Net USD)" value={formatPnl(totalPnlAdjusted)} color={pnlStyle} />
                    <MetricItem label="Realized P&L" value={formatPnl(realizedPnl)} color={realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
                </div>
            </div>

            <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-green-500 dark:border-green-400">
                <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">AI Decision Summary</h3>
                <div className="space-y-4">
                    <DataBox label="Last Action" value={tradeHistory[0]?.action || 'PASS'} color={getActionStyle(tradeHistory[0]?.action).color} />
                    <DataBox label="Last Rationale" value={tradeHistory[0]?.rationale || 'Awaiting signal from AI...'} isRationale={true} />
                </div>
            </div>

            <div className="lg:col-span-1 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 border-yellow-500 dark:border-yellow-400">
                <h3 className="text-xl font-bold mb-4 text-yellow-600 dark:text-yellow-400">Simulated Order Book (Level 2)</h3>
                <OrderBookDisplay orderBook={data.orderBook} currentPrice={data.currentPrice} formatPrice={formatPrice} />
            </div>
        </div>
    );
};

export default Dashboard;