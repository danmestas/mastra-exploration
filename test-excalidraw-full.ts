import { readFileSync, writeFileSync } from "fs";
import { mastra } from "./src/mastra";

async function testExcalidrawFull() {
  console.log("🎨 Testing Excalidraw converter with AI agent architecture image...\n");

  try {
    // Read the actual image file
    const imagePath = "./AI-agent_architecture.jpg";
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log("📷 Loaded image: AI-agent_architecture.jpg");
    console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Get the workflow
    const workflow = mastra.getWorkflow("excalidrawConverterWorkflow");
    
    console.log("🚀 Creating workflow run...");
    const run = await workflow.createRunAsync();

    // Watch the workflow execution
    let currentStep = "";
    let stepStartTime: Record<string, number> = {};
    
    run.watch((event) => {
      if (event.type === "step:start" && event.data?.stepId) {
        currentStep = event.data.stepId;
        stepStartTime[currentStep] = Date.now();
        console.log(`\n▶️  Step ${currentStep} started...`);
      } else if (event.type === "step:complete" && event.data?.stepId) {
        const duration = stepStartTime[event.data.stepId] 
          ? ((Date.now() - stepStartTime[event.data.stepId]) / 1000).toFixed(1)
          : "?";
        console.log(`✅ Step ${event.data.stepId} completed (${duration}s)`);
      } else if (event.type === "step:error") {
        console.log(`❌ Error in step ${currentStep}:`, event.data?.error);
      }
    });

    console.log("⚙️  Starting workflow execution...");
    console.log("⏳ This may take 3-5 minutes for image analysis...\n");

    const startTime = Date.now();

    // Start the workflow - give it 5 minutes for complex image
    const result = await run.start({
      inputData: {
        filename: "AI-agent_architecture.jpg",
        file: imageDataUrl,
      },
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Check the result
    if (result.status === "success") {
      console.log(`\n✅ Workflow completed successfully in ${totalTime}s!\n`);
      
      const output = result.result;
      const outputFilename = output.filename || "AI-agent_architecture.excalidraw";
      
      // Save the Excalidraw JSON to a file
      writeFileSync(
        outputFilename,
        JSON.stringify(output.contents, null, 2)
      );
      
      console.log(`📁 Excalidraw file saved as: ${outputFilename}`);
      console.log(`📈 Total elements created: ${output.contents?.elements?.length || 0}`);
      
      // Show element type breakdown
      if (output.contents?.elements && Array.isArray(output.contents.elements)) {
        const elementTypes = output.contents.elements.reduce((acc: Record<string, number>, el: any) => {
          acc[el.type] = (acc[el.type] || 0) + 1;
          return acc;
        }, {});
        
        console.log("\n📊 Element breakdown:");
        Object.entries(elementTypes).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });

        // Show sample of created elements
        console.log("\n📝 Sample elements (first 3):");
        output.contents.elements.slice(0, 3).forEach((el: any, i: number) => {
          console.log(`   ${i + 1}. Type: ${el.type}, ${el.text ? `Text: "${el.text}"` : `Position: (${el.x}, ${el.y})`}`);
        });
      }
      
      console.log("\n🎉 Success! You can now:");
      console.log("   1. Go to https://excalidraw.com");
      console.log("   2. Click 'Open' in the menu");
      console.log(`   3. Select the file: ${outputFilename}`);
      console.log("\n   Or drag and drop the .excalidraw file directly onto the Excalidraw canvas!");
      
    } else if (result.status === "failed") {
      console.error(`\n❌ Workflow failed after ${totalTime}s`);
      console.error("Error:", result.error);
      
      // Show which step failed with details
      if (result.steps) {
        console.log("\n📋 Step details:");
        Object.entries(result.steps).forEach(([stepId, stepData]: [string, any]) => {
          console.log(`\n${stepId}:`);
          console.log(`  Status: ${stepData.status}`);
          if (stepData.error) {
            console.log(`  Error: ${stepData.error}`);
          }
          if (stepData.output && stepData.status === "success") {
            const outputStr = JSON.stringify(stepData.output);
            console.log(`  Output preview: ${outputStr.substring(0, 100)}...`);
          }
        });
      }
    } else if (result.status === "suspended") {
      console.log("⏸️  Workflow suspended. Awaiting input to continue.");
    }
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Details:", error.message);
      
      // Check if it's a timeout
      if (error.message.includes("timeout")) {
        console.log("\n💡 Tip: The workflow might need more time. Try running it again or use the Mastra Playground UI.");
      }
    }
  }

  process.exit(0);
}

// Run the test
console.log("=".repeat(60));
console.log("  EXCALIDRAW CONVERTER WORKFLOW TEST");
console.log("=".repeat(60));

testExcalidrawFull().catch((error) => {
  console.error(error);
  process.exit(1);
});