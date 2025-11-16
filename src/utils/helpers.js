/* global __app_id, __firebase_config, __initial_auth_token */

export const formatPnl = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n > 0) return `+$${abs}`;
    if (n < 0) return `-$${abs}`;
    return `$${abs}`;
};

export const formatPrice = (p) => {
    if (p === null || p === undefined || Number.isNaN(Number(p))) return '—';
    return Number(p).toFixed(5);
};

export const getActionStyle = (action) => {
    switch ((action || '').toUpperCase()) {
        case 'BUY': return { color: 'text-green-600', label: 'BUY' };
        case 'SELL': return { color: 'text-red-600', label: 'SELL' };
        case 'CLOSE_LONG': return { color: 'text-indigo-600', label: 'CLOSE_LONG' };
        default: return { color: 'text-gray-500', label: 'PASS' };
    }
};

// Expose project-level constants expected by App.jsx
export const TRADE_SIZE = 10000;
export const TRADING_FEE = 0.00002;

// Read injected globals if available (safe with typeof checks), otherwise fall back to defaults.
// Coerce firebaseConfig to an object even if the injected value is null.
export const appId = (typeof __app_id !== 'undefined' && __app_id != null)
  ? __app_id
  : (typeof window !== 'undefined' && window.__app_id != null)
    ? window.__app_id
    : 'local-app-id';

export const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config != null && typeof __firebase_config === 'object')
  ? __firebase_config
  : (typeof window !== 'undefined' && window.__firebase_config != null && typeof window.__firebase_config === 'object')
    ? window.__firebase_config
    : {};

export const initialAuthToken = (typeof __initial_auth_token !== 'undefined' && __initial_auth_token != null)
  ? __initial_auth_token
  : (typeof window !== 'undefined' && window.__initial_auth_token != null)
    ? window.__initial_auth_token
    : null;
