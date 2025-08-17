import { readFileSync, writeFileSync } from "fs";

async function testExcalidrawAPI() {
  console.log("🎨 Testing Excalidraw converter workflow via API...\n");

  try {
    // Read the image file
    const imagePath = "./AI-agent_architecture.jpg";
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log("📷 Loaded image: AI-agent_architecture.jpg");
    console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Call the Mastra API
    console.log("🚀 Calling Mastra API...");
    const response = await fetch("http://localhost:4111/api/workflows/excalidrawConverterWorkflow/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          filename: "AI-agent_architecture.jpg",
          file: imageDataUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ API response received\n");

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
      }
      
      console.log("\n🎉 Success! You can now:");
      console.log("   1. Go to https://excalidraw.com");
      console.log("   2. Click 'Open' in the menu");
      console.log(`   3. Select the file: ${outputFilename}`);
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
    console.error("❌ Error calling API:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  }
}

// Run the test
testExcalidrawAPI().catch(console.error);