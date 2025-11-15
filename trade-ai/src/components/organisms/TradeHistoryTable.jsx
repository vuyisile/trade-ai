import React from 'react';
import { getActionStyle } from '../../utils/helpers';

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

export default TradeHistoryTable;