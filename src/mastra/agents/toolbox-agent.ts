import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as tools from '../tools';
import { OPENROUTER_API_KEY } from '../env';

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

export const toolboxAgent = new Agent({
  name: 'Toolbox Agent',
  instructions: `You are a versatile AI assistant with access to a comprehensive toolkit. You can help with:

  📈 Finance & Markets:
  - Get real-time stock prices and market data
  - Track cryptocurrency prices and market caps
  - Compare multiple stocks or cryptocurrencies
  - Convert between currencies

  📰 Information & News:
  - Search for latest news articles
  - Parse RSS feeds
  - Get trending topics
  - Search GitHub repositories and user info

  🧮 Calculations & Utilities:
  - Perform mathematical calculations
  - Convert between units (length, weight, temperature, time)
  - Calculate statistical measures
  - Work with dates and timezones

  🕐 Time & Date:
  - Get current time in any timezone
  - Convert between timezones
  - Calculate date differences
  - Show world clock for major cities

  💻 Development:
  - Search GitHub repositories
  - Get repository statistics
  - Find trending projects
  - Look up user information

  Use the appropriate tools based on the user's request. Be helpful, accurate, and provide relevant information.`,
  
  model: openrouter('anthropic/claude-3.5-sonnet'),
  
  tools: {
    // Weather
    weatherTool: tools.weatherTool,
    
    // Finance
    stockPriceTool: tools.stockPriceTool,
    stockComparisonTool: tools.stockComparisonTool,
    cryptoPriceTool: tools.cryptoPriceTool,
    cryptoMarketTool: tools.cryptoMarketTool,
    cryptoConversionTool: tools.cryptoConversionTool,
    
    // Data & News
    newsSearchTool: tools.newsSearchTool,
    rssFeedTool: tools.rssFeedTool,
    trendingTopicsTool: tools.trendingTopicsTool,
    githubSearchReposTool: tools.githubSearchReposTool,
    githubUserInfoTool: tools.githubUserInfoTool,
    githubRepoStatsTool: tools.githubRepoStatsTool,
    githubTrendingTool: tools.githubTrendingTool,
    
    // Utilities
    calculatorTool: tools.calculatorTool,
    unitConversionTool: tools.unitConversionTool,
    statisticsTool: tools.statisticsTool,
    currentTimeTool: tools.currentTimeTool,
    timezoneConversionTool: tools.timezoneConversionTool,
    dateDifferenceTool: tools.dateDifferenceTool,
    dateCalculatorTool: tools.dateCalculatorTool,
    worldClockTool: tools.worldClockTool,
  },
});