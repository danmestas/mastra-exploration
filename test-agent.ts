import { mastra } from "./src/mastra";

async function testAgent() {
  console.log("🧪 Testing imageToCsvAgent directly...\n");

  try {
    const agent = mastra.getAgent("imageToCsvAgent");
    
    console.log("📝 Sending test message to agent...");
    
    const response = await agent.generate([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Hello, can you respond with 'Agent is working!'?",
          },
        ],
      },
    ]);

    console.log("✅ Response:", response.text);
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

testAgent().catch(console.error);