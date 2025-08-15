import { mastra } from './mastra';

async function testWeatherWorkflow() {
  console.log('🌤️  Testing Weather Workflow...\n');
  
  try {
    // Get the weather workflow
    const workflow = mastra.getWorkflow('weatherWorkflow');
    
    if (!workflow) {
      throw new Error('Weather workflow not found. Make sure it is registered in mastra/index.ts');
    }

    // Create a run instance
    const run = await workflow.createRunAsync();
    
    // Test with a city
    const city = 'San Francisco';
    console.log(`📍 Fetching weather and activities for: ${city}\n`);
    console.log('⏳ This may take a moment...\n');
    
    // Start the workflow
    const result = await run.start({
      inputData: {
        city: city
      }
    });
    
    // Check the result
    if (result.status === 'success') {
      console.log('\n✅ Workflow completed successfully!\n');
      console.log('📋 Activities suggested:\n');
      console.log(result.result.activities);
    } else if (result.status === 'failed') {
      console.error('❌ Workflow failed:', result.error);
      console.error('\nFailed steps:', result.steps);
    } else {
      console.log('Workflow status:', result.status);
      console.log('Result:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing workflow:', error);
    console.error('\nMake sure:');
    console.error('1. OPENROUTER_API_KEY is set in .env');
    console.error('2. The Mastra dev server is running (bun run mastra dev)');
    console.error('3. The weather workflow is properly registered');
  }
}

// Run the test
testWeatherWorkflow().catch(console.error);