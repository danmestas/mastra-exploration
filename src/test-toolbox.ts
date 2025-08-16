import { mastra } from './mastra';

async function demonstrateTools() {
  console.log('🚀 Mastra Toolbox Demonstration\n');
  
  const toolboxAgent = mastra.getAgent('toolboxAgent');
  
  // Example 1: Stock Market
  console.log('📈 Stock Market Example:');
  const stockResponse = await toolboxAgent.generate(
    'What is the current stock price of Apple (AAPL) and how does it compare to Microsoft (MSFT)?'
  );
  console.log(stockResponse.text);
  console.log('\n---\n');
  
  // Example 2: Cryptocurrency
  console.log('💰 Cryptocurrency Example:');
  const cryptoResponse = await toolboxAgent.generate(
    'What is the current price of Bitcoin and Ethereum? Also show me the top 5 cryptocurrencies by market cap.'
  );
  console.log(cryptoResponse.text);
  console.log('\n---\n');
  
  // Example 3: News Search
  console.log('📰 News Search Example:');
  const newsResponse = await toolboxAgent.generate(
    'Find me the latest news about artificial intelligence and technology.'
  );
  console.log(newsResponse.text);
  console.log('\n---\n');
  
  // Example 4: Calculator
  console.log('🧮 Calculator Example:');
  const calcResponse = await toolboxAgent.generate(
    'Calculate the compound interest on $10,000 at 5% annual rate for 10 years. Also, what is sqrt(144) + sin(45)?'
  );
  console.log(calcResponse.text);
  console.log('\n---\n');
  
  // Example 5: Time & Timezone
  console.log('🕐 Time & Timezone Example:');
  const timeResponse = await toolboxAgent.generate(
    'What time is it in New York, London, and Tokyo right now? Also convert 3:00 PM EST to PST.'
  );
  console.log(timeResponse.text);
  console.log('\n---\n');
  
  // Example 6: GitHub
  console.log('💻 GitHub Example:');
  const githubResponse = await toolboxAgent.generate(
    'Search for the most popular TypeScript repositories and tell me about the Mastra framework on GitHub.'
  );
  console.log(githubResponse.text);
  console.log('\n---\n');
  
  // Example 7: Unit Conversion
  console.log('📏 Unit Conversion Example:');
  const unitResponse = await toolboxAgent.generate(
    'Convert 100 kilometers to miles, 75 fahrenheit to celsius, and 5 pounds to kilograms.'
  );
  console.log(unitResponse.text);
  console.log('\n---\n');
  
  // Example 8: Statistics
  console.log('📊 Statistics Example:');
  const statsResponse = await toolboxAgent.generate(
    'Calculate the mean, median, standard deviation, and percentiles for this dataset: [23, 45, 67, 89, 12, 34, 56, 78, 90, 43, 21, 65, 87, 32, 54]'
  );
  console.log(statsResponse.text);
  console.log('\n---\n');
  
  // Example 9: Combined Query
  console.log('🎯 Combined Query Example:');
  const combinedResponse = await toolboxAgent.generate(
    'I have $50,000 to invest. Show me the current prices of Apple stock and Bitcoin. Also, what time is it in the New York Stock Exchange right now, and is the market open?'
  );
  console.log(combinedResponse.text);
}

// Direct tool usage examples
async function demonstrateDirectToolUsage() {
  console.log('\n🔧 Direct Tool Usage Examples\n');
  
  // Import tools directly
  const { 
    stockPriceTool, 
    cryptoPriceTool, 
    calculatorTool,
    currentTimeTool,
    githubSearchReposTool 
  } = await import('./mastra/tools');
  
  // Stock price
  console.log('Direct Stock Price:');
  const stockResult = await stockPriceTool.execute({ 
    context: { symbol: 'GOOGL' } 
  });
  console.log(`Google (GOOGL): $${stockResult.price}`);
  console.log(`Change: ${stockResult.changePercent.toFixed(2)}%\n`);
  
  // Crypto price
  console.log('Direct Crypto Price:');
  const cryptoResult = await cryptoPriceTool.execute({ 
    context: { coin: 'ethereum' } 
  });
  console.log(`Ethereum: $${cryptoResult.price}`);
  console.log(`24h Change: ${cryptoResult.changePercent24h.toFixed(2)}%\n`);
  
  // Calculator
  console.log('Direct Calculation:');
  const calcResult = await calculatorTool.execute({ 
    context: { expression: '(100 * 1.05) ** 10' } 
  });
  console.log(`Result: ${calcResult.formatted}\n`);
  
  // Current time
  console.log('Direct Time Query:');
  const timeResult = await currentTimeTool.execute({ 
    context: { timezone: 'America/New_York', format: '12h' } 
  });
  console.log(`New York Time: ${timeResult.current}\n`);
  
  // GitHub search
  console.log('Direct GitHub Search:');
  const githubResult = await githubSearchReposTool.execute({ 
    context: { query: 'mastra ai', sort: 'stars', limit: 3 } 
  });
  console.log(`Found ${githubResult.totalCount} repositories`);
  githubResult.repositories.forEach(repo => {
    console.log(`- ${repo.fullName} (⭐ ${repo.stars})`);
  });
}

// Run demonstrations
async function main() {
  try {
    // Demonstrate agent-based tool usage
    await demonstrateTools();
    
    // Demonstrate direct tool usage
    await demonstrateDirectToolUsage();
    
    console.log('\n✅ All demonstrations completed successfully!');
  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}