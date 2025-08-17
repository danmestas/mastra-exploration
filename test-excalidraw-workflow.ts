import { readFileSync, writeFileSync } from "fs";
import { mastra } from "./src/mastra";

async function testExcalidrawWorkflow() {
  console.log("🎨 Starting Excalidraw converter workflow test...\n");

  try {
    // Read the image file
    const imagePath = "./AI-agent_architecture.jpg";
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log("📷 Loaded image: AI-agent_architecture.jpg");
    console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Get the workflow
    const workflow = mastra.getWorkflow("excalidraw-converter");
    
    console.log("🚀 Creating workflow run...");
    const run = await workflow.createRunAsync();

    console.log("⚙️  Starting workflow execution...");
    console.log("   Step 1: Converting image to CSV...");
    console.log("   Step 2: Validating CSV...");
    console.log("   Step 3: Converting CSV to Excalidraw...");
    console.log("   Step 4: Validating Excalidraw JSON...\n");

    // Start the workflow with the image data
    const result = await run.start({
      inputData: {
        filename: "AI-agent_architecture.jpg",
        file: imageDataUrl,
      },
    });

    // Check the result
    if (result.status === "success") {
      console.log("✅ Workflow completed successfully!\n");
      
      const output = result.result;
      const outputFilename = output.filename || "AI-agent_architecture.excalidraw";
      
      // Save the Excalidraw JSON to a file
      writeFileSync(
        outputFilename,
        JSON.stringify(output.contents, null, 2)
      );
      
      console.log(`📁 Excalidraw file saved as: ${outputFilename}`);
      console.log(`📈 Total elements created: ${output.contents.elements?.length || 0}`);
      
      // Show element type breakdown
      if (output.contents.elements && Array.isArray(output.contents.elements)) {
        const elementTypes = output.contents.elements.reduce((acc: Record<string, number>, el: any) => {
          acc[el.type] = (acc[el.type] || 0) + 1;
          return acc;
        }, {});
        
        console.log("\n📊 Element breakdown:");
        Object.entries(elementTypes).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });
      }
      
      console.log("\n🎉 Success! You can now import the generated .excalidraw file into Excalidraw.com");
    } else if (result.status === "failed") {
      console.error("❌ Workflow failed with error:", result.error);
      
      // Show which step failed
      if (result.steps) {
        Object.entries(result.steps).forEach(([stepId, stepData]: [string, any]) => {
          if (stepData.status === "failed") {
            console.error(`   Failed at step: ${stepId}`);
            console.error(`   Error: ${stepData.error}`);
          }
        });
      }
    } else if (result.status === "suspended") {
      console.log("⏸️  Workflow suspended. Awaiting input to continue.");
    }
  } catch (error) {
    console.error("❌ Error running workflow:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

// Run the test
testExcalidrawWorkflow().catch(console.error);