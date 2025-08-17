import { writeFileSync } from "fs";
import { mastra } from "./src/mastra";

async function testExcalidrawSimple() {
  console.log("🎨 Testing Excalidraw converter with simple test image...\n");

  try {
    // Create a simple test image (1x1 white pixel)
    const simpleImageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    console.log("📷 Using simple test image (1x1 pixel)");

    // Get the workflow
    const workflow = mastra.getWorkflow("excalidrawConverterWorkflow");
    
    console.log("🚀 Creating workflow run...");
    const run = await workflow.createRunAsync();

    // Watch the workflow execution
    let currentStep = "";
    run.watch((event) => {
      if (event.type === "step:start" && event.data?.stepId) {
        currentStep = event.data.stepId;
        console.log(`   ▶️  Starting step: ${currentStep}`);
      } else if (event.type === "step:complete" && event.data?.stepId) {
        console.log(`   ✅ Completed step: ${event.data.stepId}`);
      } else if (event.type === "step:error" && event.data?.stepId) {
        console.log(`   ❌ Error in step: ${event.data.stepId}`, event.data.error);
      }
    });

    console.log("⚙️  Starting workflow execution...");

    // Set a shorter timeout for simple test
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Workflow timed out at step: ${currentStep}`)), 60000);
    });

    // Start the workflow with simple image
    const resultPromise = run.start({
      inputData: {
        filename: "simple_test.png",
        file: simpleImageDataUrl,
      },
    });

    // Race between workflow and timeout
    const result = await Promise.race([resultPromise, timeoutPromise]).catch(error => {
      console.error("❌ Error or timeout:", error.message);
      throw error;
    });

    // Check the result
    if (result && typeof result === 'object' && 'status' in result) {
      if (result.status === "success") {
        console.log("\n✅ Workflow completed successfully!");
        
        const output = result.result;
        console.log(`📈 Elements created: ${output.contents?.elements?.length || 0}`);
        
        // Save result
        writeFileSync(
          "simple_test.excalidraw",
          JSON.stringify(output.contents, null, 2)
        );
        
        console.log("📁 File saved as: simple_test.excalidraw");
      } else if (result.status === "failed") {
        console.error("\n❌ Workflow failed");
        console.error("Error:", result.error);
        
        // Show detailed step errors
        if (result.steps) {
          Object.entries(result.steps).forEach(([stepId, stepData]: [string, any]) => {
            console.log(`\nStep ${stepId}:`);
            console.log(`  Status: ${stepData.status}`);
            if (stepData.error) {
              console.log(`  Error: ${stepData.error}`);
            }
            if (stepData.output) {
              console.log(`  Output:`, JSON.stringify(stepData.output).substring(0, 200));
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Details:", error.message);
    }
  }

  process.exit(0);
}

// Run the test
testExcalidrawSimple().catch((error) => {
  console.error(error);
  process.exit(1);
});