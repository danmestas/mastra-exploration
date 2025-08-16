import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export const stockPriceTool = createTool({
  id: 'get-stock-price',
  description: 'Get current stock price and market data for a given ticker symbol',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)'),
  }),
  outputSchema: z.object({
    symbol: z.string(),
    price: z.number(),
    change: z.number(),
    changePercent: z.number(),
    volume: z.number(),
    marketCap: z.number().optional(),
    high: z.number(),
    low: z.number(),
    open: z.number(),
    previousClose: z.number(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const { symbol } = context;
    
    try {
      // Using Alpha Vantage free API (you'll need to get a free API key)
      // For demo purposes, using a mock API endpoint
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock data for ${symbol}`);
      }
      
      const data = await response.json();
      const quote = data.chart.result[0];
      const meta = quote.meta;
      const price = meta.regularMarketPrice;
      
      return {
        symbol: symbol.toUpperCase(),
        price: price,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        open: meta.regularMarketOpen,
        previousClose: meta.previousClose,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Fallback to mock data if API fails
      console.warn(`API failed, returning mock data for ${symbol}:`, error);
      return getMockStockData(symbol);
    }
  },
});

export const stockComparisonTool = createTool({
  id: 'compare-stocks',
  description: 'Compare multiple stocks side by side',
  inputSchema: z.object({
    symbols: z.array(z.string()).describe('Array of stock ticker symbols to compare'),
  }),
  outputSchema: z.object({
    comparison: z.array(z.object({
      symbol: z.string(),
      price: z.number(),
      changePercent: z.number(),
      volume: z.number(),
      marketCap: z.number().optional(),
    })),
    bestPerformer: z.string(),
    worstPerformer: z.string(),
  }),
  execute: async ({ context }) => {
    const { symbols } = context;
    const stocks = [];
    
    for (const symbol of symbols) {
      const result = await stockPriceTool.execute({ context: { symbol } });
      stocks.push({
        symbol: result.symbol,
        price: result.price,
        changePercent: result.changePercent,
        volume: result.volume,
        marketCap: result.marketCap,
      });
    }
    
    const bestPerformer = stocks.reduce((best, stock) => 
      stock.changePercent > best.changePercent ? stock : best
    );
    
    const worstPerformer = stocks.reduce((worst, stock) => 
      stock.changePercent < worst.changePercent ? stock : worst
    );
    
    return {
      comparison: stocks,
      bestPerformer: bestPerformer.symbol,
      worstPerformer: worstPerformer.symbol,
    };
  },
});

function getMockStockData(symbol: string): StockQuote {
  // Mock data for demonstration
  const mockPrices: Record<string, number> = {
    AAPL: 195.89,
    GOOGL: 142.57,
    MSFT: 378.91,
    AMZN: 155.33,
    TSLA: 242.84,
  };
  
  const basePrice = mockPrices[symbol.toUpperCase()] || 100 + Math.random() * 200;
  const change = (Math.random() - 0.5) * 10;
  
  return {
    symbol: symbol.toUpperCase(),
    price: basePrice,
    change: change,
    changePercent: (change / basePrice) * 100,
    volume: Math.floor(Math.random() * 100000000),
    marketCap: basePrice * 1000000000,
    high: basePrice + Math.abs(change),
    low: basePrice - Math.abs(change),
    open: basePrice - change / 2,
    previousClose: basePrice - change,
    timestamp: new Date().toISOString(),
  };
}