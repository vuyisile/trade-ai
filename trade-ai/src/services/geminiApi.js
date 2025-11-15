import { fetchWithRetry } from '../utils/helpers';

const GEMINI_API_KEY = ""; // Must remain empty for environment injection
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

export const getTradingDecision = async (ticker, data, currentPosition) => {
    const topBidPrice = data.orderBook.bids[0].price;
    const topBidSize = data.orderBook.bids[0].size;
    const topAskPrice = data.orderBook.asks[0].price;
    const topAskSize = data.orderBook.asks[0].size;

    const systemPrompt = `You are a High-Frequency Trading AI (HFT) specializing in **Forex Currency Pairs** (like EUR/USD). Your task is to provide an immediate, structured trading decision based on the latest 1-minute market data, **Order Book imbalance**, and real-time news sentiment.
    
    Current Portfolio Status: The current position in ${ticker} is ${currentPosition} units (e.g., standard lot of 100,000 units).
    
    You must output **ONLY** a single JSON object. Do not include any text outside the JSON block.
    
    ACTION definitions:
    - BUY: Enter a long position or increase the current long position.
    - SELL: Exit the current long position.
    - PASS: Take no action. Wait for a clearer signal.`;

    const userQuery = `Analyze the current 1-minute data for ${ticker}: 
    Current Price: ${data.currentPrice.toFixed(5)}. 
    RSI: ${data.rsi}. 
    Volume: ${data.dailyVolume}. 
    
    **Order Book (Level 2):** Top Bid Price: ${topBidPrice.toFixed(5)} (Volume/Size: ${topBidSize} units) 
    Top Ask Price: ${topAskPrice.toFixed(5)} (Volume/Size: ${topAskSize} units)
    
    Current Position: ${currentPosition} units. 
    
    Provide the best trading decision (BUY, SELL, or PASS) and a one-sentence rationale.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            "action": {
                "type": "STRING",
                "enum": ["BUY", "SELL", "PASS"]
            },
            "rationale": {
                "type": "STRING",
                "description": "A single, concise, one-sentence reason for the action."
            }
        },
        required: ["action", "rationale"]
    };

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ "google_search": {} }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    try {
        const response = await fetchWithRetry(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            const cleanJsonText = jsonText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJsonText);
            return { action: parsed.action, rationale: parsed.rationale };
        }
        return { action: 'PASS', rationale: 'AI failed to generate structured output.' };

    } catch (error) {
        console.error("Gemini API Error (Structured Decision):", error);
        return { action: 'PASS', rationale: `API Error: ${error.message}` };
    }
};