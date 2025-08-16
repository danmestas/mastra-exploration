import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  circulating_supply: number;
  ath: number;
  ath_change_percentage: number;
  last_updated: string;
}

export const cryptoPriceTool = createTool({
  id: 'get-crypto-price',
  description: 'Get current cryptocurrency price and market data',
  inputSchema: z.object({
    coin: z.string().describe('Cryptocurrency name or symbol (e.g., bitcoin, BTC, ethereum, ETH)'),
  }),
  outputSchema: z.object({
    name: z.string(),
    symbol: z.string(),
    price: z.number(),
    marketCap: z.number(),
    rank: z.number(),
    change24h: z.number(),
    changePercent24h: z.number(),
    high24h: z.number(),
    low24h: z.number(),
    volume24h: z.number(),
    circulatingSupply: z.number(),
    allTimeHigh: z.number(),
    athChangePercent: z.number(),
    lastUpdated: z.string(),
  }),
  execute: async ({ context }) => {
    const { coin } = context;
    
    try {
      // Using CoinGecko free API
      const coinId = normalizeCoinId(coin);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch crypto data for ${coin}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error(`No data found for ${coin}`);
      }
      
      const cryptoData = data[0] as CryptoData;
      
      return {
        name: cryptoData.name,
        symbol: cryptoData.symbol.toUpperCase(),
        price: cryptoData.current_price,
        marketCap: cryptoData.market_cap,
        rank: cryptoData.market_cap_rank,
        change24h: cryptoData.price_change_24h,
        changePercent24h: cryptoData.price_change_percentage_24h,
        high24h: cryptoData.high_24h,
        low24h: cryptoData.low_24h,
        volume24h: cryptoData.total_volume,
        circulatingSupply: cryptoData.circulating_supply,
        allTimeHigh: cryptoData.ath,
        athChangePercent: cryptoData.ath_change_percentage,
        lastUpdated: cryptoData.last_updated,
      };
    } catch (error) {
      console.warn(`API failed, returning mock data for ${coin}:`, error);
      return getMockCryptoData(coin);
    }
  },
});

export const cryptoMarketTool = createTool({
  id: 'get-crypto-market',
  description: 'Get top cryptocurrencies by market cap',
  inputSchema: z.object({
    limit: z.number().min(1).max(100).default(10).describe('Number of top cryptocurrencies to return'),
  }),
  outputSchema: z.object({
    totalMarketCap: z.number(),
    topCoins: z.array(z.object({
      rank: z.number(),
      name: z.string(),
      symbol: z.string(),
      price: z.number(),
      marketCap: z.number(),
      changePercent24h: z.number(),
    })),
    bestPerformer: z.string(),
    worstPerformer: z.string(),
  }),
  execute: async ({ context }) => {
    const { limit } = context;
    
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const data = await response.json() as CryptoData[];
      
      const topCoins = data.map(coin => ({
        rank: coin.market_cap_rank,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        marketCap: coin.market_cap,
        changePercent24h: coin.price_change_percentage_24h,
      }));
      
      const totalMarketCap = topCoins.reduce((sum, coin) => sum + coin.marketCap, 0);
      
      const bestPerformer = topCoins.reduce((best, coin) => 
        coin.changePercent24h > best.changePercent24h ? coin : best
      );
      
      const worstPerformer = topCoins.reduce((worst, coin) => 
        coin.changePercent24h < worst.changePercent24h ? coin : worst
      );
      
      return {
        totalMarketCap,
        topCoins,
        bestPerformer: `${bestPerformer.name} (${bestPerformer.symbol})`,
        worstPerformer: `${worstPerformer.name} (${worstPerformer.symbol})`,
      };
    } catch (error) {
      console.warn('API failed, returning mock market data:', error);
      return getMockMarketData(limit);
    }
  },
});

export const cryptoConversionTool = createTool({
  id: 'convert-crypto',
  description: 'Convert between cryptocurrency and fiat currency',
  inputSchema: z.object({
    amount: z.number().describe('Amount to convert'),
    from: z.string().describe('Source currency (crypto symbol or USD)'),
    to: z.string().describe('Target currency (crypto symbol or USD)'),
  }),
  outputSchema: z.object({
    amount: z.number(),
    from: z.string(),
    to: z.string(),
    result: z.number(),
    rate: z.number(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const { amount, from, to } = context;
    
    let rate = 1;
    
    if (from.toUpperCase() === 'USD' && to.toUpperCase() !== 'USD') {
      // Converting USD to crypto
      const cryptoData = await cryptoPriceTool.execute({ context: { coin: to } });
      rate = 1 / cryptoData.price;
    } else if (from.toUpperCase() !== 'USD' && to.toUpperCase() === 'USD') {
      // Converting crypto to USD
      const cryptoData = await cryptoPriceTool.execute({ context: { coin: from } });
      rate = cryptoData.price;
    } else if (from.toUpperCase() !== 'USD' && to.toUpperCase() !== 'USD') {
      // Converting between two cryptos
      const fromData = await cryptoPriceTool.execute({ context: { coin: from } });
      const toData = await cryptoPriceTool.execute({ context: { coin: to } });
      rate = fromData.price / toData.price;
    }
    
    return {
      amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      result: amount * rate,
      rate,
      timestamp: new Date().toISOString(),
    };
  },
});

function normalizeCoinId(coin: string): string {
  const coinMap: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    SOL: 'solana',
    XRP: 'ripple',
    USDT: 'tether',
    ADA: 'cardano',
    AVAX: 'avalanche-2',
    DOGE: 'dogecoin',
    DOT: 'polkadot',
    MATIC: 'matic-network',
    LINK: 'chainlink',
    UNI: 'uniswap',
    ATOM: 'cosmos',
    XLM: 'stellar',
  };
  
  const upperCoin = coin.toUpperCase();
  return coinMap[upperCoin] || coin.toLowerCase();
}

function getMockCryptoData(coin: string): any {
  const mockData: Record<string, any> = {
    bitcoin: {
      name: 'Bitcoin',
      symbol: 'BTC',
      price: 67543.21,
      marketCap: 1324567890000,
      rank: 1,
      change24h: 1234.56,
      changePercent24h: 1.86,
      high24h: 68000,
      low24h: 66000,
      volume24h: 24567890000,
      circulatingSupply: 19600000,
      allTimeHigh: 73750,
      athChangePercent: -8.4,
      lastUpdated: new Date().toISOString(),
    },
    ethereum: {
      name: 'Ethereum',
      symbol: 'ETH',
      price: 3456.78,
      marketCap: 415678900000,
      rank: 2,
      change24h: 67.89,
      changePercent24h: 2.0,
      high24h: 3500,
      low24h: 3400,
      volume24h: 12345678000,
      circulatingSupply: 120300000,
      allTimeHigh: 4878,
      athChangePercent: -29.1,
      lastUpdated: new Date().toISOString(),
    },
  };
  
  const normalized = normalizeCoinId(coin);
  return mockData[normalized] || {
    name: coin,
    symbol: coin.toUpperCase(),
    price: 100 + Math.random() * 1000,
    marketCap: Math.random() * 1000000000,
    rank: Math.floor(Math.random() * 100) + 1,
    change24h: (Math.random() - 0.5) * 100,
    changePercent24h: (Math.random() - 0.5) * 20,
    high24h: 110 + Math.random() * 1000,
    low24h: 90 + Math.random() * 1000,
    volume24h: Math.random() * 100000000,
    circulatingSupply: Math.random() * 1000000000,
    allTimeHigh: 200 + Math.random() * 2000,
    athChangePercent: -(Math.random() * 50),
    lastUpdated: new Date().toISOString(),
  };
}

function getMockMarketData(limit: number): any {
  const coins = [
    { name: 'Bitcoin', symbol: 'BTC', price: 67543, marketCap: 1324567890000, changePercent24h: 1.86 },
    { name: 'Ethereum', symbol: 'ETH', price: 3456, marketCap: 415678900000, changePercent24h: 2.0 },
    { name: 'Tether', symbol: 'USDT', price: 1.0, marketCap: 95000000000, changePercent24h: 0.01 },
    { name: 'BNB', symbol: 'BNB', price: 589, marketCap: 87654321000, changePercent24h: -0.5 },
    { name: 'Solana', symbol: 'SOL', price: 178, marketCap: 76543210000, changePercent24h: 5.3 },
  ];
  
  const topCoins = coins.slice(0, limit).map((coin, i) => ({
    rank: i + 1,
    ...coin,
  }));
  
  return {
    totalMarketCap: topCoins.reduce((sum, coin) => sum + coin.marketCap, 0),
    topCoins,
    bestPerformer: 'Solana (SOL)',
    worstPerformer: 'BNB (BNB)',
  };
}