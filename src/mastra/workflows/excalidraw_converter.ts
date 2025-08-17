import type { CoreMessage } from "@mastra/core";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { mastra } from "../index";

const outputSchema = z.object({
	filename: z.string(),
	contents: z.object({}).passthrough(),
});

const imageToCsvStep = createStep({
	id: "imageToCsv",
	inputSchema: z.object({
		filename: z.string(),
		file: z.string(),
	}),
	outputSchema: z.object({
		filename: z.string(),
		csv: z.string(),
		file: z.string(), // Pass through the original file
	}),
	execute: async ({ inputData, mastra }) => {
		const { filename, file } = inputData;

		if (!filename || !file) {
			throw new Error("Missing required image data");
		}

		const imageToCsv = mastra.getAgent("imageToCsvAgent");
		const response = await imageToCsv.generate(
			[
				{
					role: "user",
					content: [
						{
							type: "image",
							image: file,
						},
						{
							type: "text",
							text: `View this image of a whiteboard diagram and convert it into CSV format. Include all text, lines, arrows, and shapes. Think through all the elements of the image.`,
						},
					],
				},
			],
			{ maxSteps: 10 },
		);

		return {
			filename: `${filename.split(".")[0]}.excalidraw`,
			csv: response.text,
			file, // Pass through the original file
		};
	},
});

const validateCsvStep = createStep({
	id: "validateCsv",
	inputSchema: z.object({
		filename: z.string(),
		csv: z.string(),
		file: z.string(), // Receive the original file
	}),
	outputSchema: z.object({
		filename: z.string(),
		csv: z.string(),
	}),
	execute: async ({ inputData, mastra }) => {
		const { filename, csv, file } = inputData;

		if (!filename || !csv) {
			throw new Error("Missing required CSV data");
		}

		if (!file) {
			throw new Error("Missing required image data");
		}

		const imageToCsv = mastra.getAgent("imageToCsvAgent");
		const response = await imageToCsv.generate(
			[
				{
					role: "user",
					content: [
						{
							type: "image",
							image: file,
						},
						{
							type: "text",
							text: `View this image of a whiteboard diagram and convert it into CSV format.`,
						},
					],
				},
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: csv,
						},
					],
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: `Validate your last response containing the CSV code to add missing elements (text, lines, etc.) to the CSV. You should add new items to the original CSV results. The previous step missed some elements. Find them and add them. Return the CSV text.`,
						},
					],
				},
			],
			{
				maxSteps: 10,
			},
		);

		return {
			filename,
			csv: response.text,
		};
	},
});

const csvToExcalidrawStep = createStep({
	id: "csvToExcalidraw",
	inputSchema: z.object({
		filename: z.string(),
		csv: z.string(),
	}),
	outputSchema: z.object({
		filename: z.string(),
		excalidrawJson: z.object({}).passthrough(),
	}),
	execute: async ({ inputData }) => {
		const { filename, csv } = inputData;

		if (!filename || !csv) {
			throw new Error("Missing required CSV data");
		}

		// Parse CSV into rows
		const rows = csv
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (rows.length < 2) {
			throw new Error("CSV must have header row and at least one data row");
		}

		// Parse header row
		const headers = rows[0].split(",").map((h) => h.trim());

		// Parse data rows into objects
		const elements = rows.slice(1).map((row) => {
			const values = row.split(",").map((v) => v.trim());
			const element: Record<string, any> = {};

			headers.forEach((header, index) => {
				const value = values[index];
				if (value === "") return; // Skip empty values

				// Parse special fields
				switch (header) {
					case "points":
						try {
							element[header] = JSON.parse(value.replace(/'/g, '"'));
						} catch {
							// Default to empty array if parsing fails
							element[header] = [[0, 0]];
						}
						break;
					case "boundElements":
						try {
							element[header] = JSON.parse(value.replace(/'/g, '"'));
						} catch {
							// Default to empty array if parsing fails
							element[header] = [];
						}
						break;
					case "startBinding":
					case "endBinding":
						try {
							element[header] = JSON.parse(value.replace(/'/g, '"'));
						} catch {
							// Default to null if parsing fails
							element[header] = null;
						}
						break;
					case "groupIds":
						try {
							element[header] = JSON.parse(value.replace(/'/g, '"'));
						} catch {
							// Default to empty array if parsing fails
							element[header] = [];
						}
						break;
					case "width":
					case "height":
					case "x":
					case "y":
					case "angle":
					case "strokeWidth":
					case "roughness":
					case "opacity":
					case "fontSize":
					case "seed":
					case "version":
						element[header] = Number(value) || 0;
						break;
					case "isDeleted":
						element[header] = value === "true";
						break;
					case "fontFamily":
						element[header] = value === "20" ? "Arial" : value;
						break;
					default:
						// Clean up any potential JSON string issues
						if (typeof value === "string" && value.includes('"')) {
							try {
								element[header] = JSON.parse(value.replace(/'/g, '"'));
							} catch {
								element[header] = value.replace(/"/g, "");
							}
						} else {
							element[header] = value;
						}
				}
			});

			// Add required element properties
			element.frameId = element.frameId || null;
			element.updated = Date.now();
			element.link = null;
			element.locked = false;

			// Handle text element specifics
			if (element.type === "text") {
				element.originalText = element.text;
				element.lineHeight = 1.25;
				element.baseline = 0;
				element.containerId = null;
				element.autoResize = true;
			}

			// Ensure arrays are arrays and not strings
			if (element.groupIds && typeof element.groupIds === "string") {
				element.groupIds = [];
			}
			if (element.boundElements && typeof element.boundElements === "string") {
				element.boundElements = [];
			}

			return element;
		});

		// Create Excalidraw JSON
		const excalidrawJson = {
			type: "excalidraw",
			version: 2,
			source: "https://excalidraw.com",
			elements,
			appState: {
				gridSize: 20,
				gridStep: 5,
				gridModeEnabled: false,
				viewBackgroundColor: "#ffffff",
			},
			files: {},
		};

		return {
			filename,
			excalidrawJson,
		};
	},
});

const validateExcalidrawStep = createStep({
	id: "validateExcalidraw",
	inputSchema: z.object({
		filename: z.string(),
		excalidrawJson: z.object({}).passthrough(),
	}),
	outputSchema,
	execute: async ({ inputData, mastra }) => {
		const { filename, excalidrawJson } = inputData;

		if (!filename || !excalidrawJson) {
			throw new Error("Missing required Excalidraw data");
		}

		// Validate the JSON
		const validator = mastra.getAgent("excalidrawValidatorAgent");
		const messages: CoreMessage[] = [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: `Validate the following Excalidraw JSON. If it is not valid, fix it and just return the valid JSON.`,
					},
					{
						type: "text",
						text: JSON.stringify(excalidrawJson),
					},
				],
			},
		];

		let attempts = 0;
		const maxAttempts = 3;
		let lastError: Error | null = null;

		while (attempts < maxAttempts) {
			attempts++;

			const validationResponse = await validator.generate(messages, {
				maxSteps: 10,
			});

			// Try to parse the response
			try {
				let cleanedResponse = validationResponse.text;

				// If the response is wrapped in quotes, remove them
				if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
					cleanedResponse = cleanedResponse.slice(1, -1);
				}

				// Replace escaped quotes and newlines
				cleanedResponse = cleanedResponse
					.replace(/\\"/g, '"')
					.replace(/\\n/g, "");

				const parsedJson = JSON.parse(cleanedResponse);

				// If we successfully parsed the JSON, return it
				return {
					filename,
					contents: parsedJson,
				};
			} catch (e) {
				console.log(`Validation attempt ${attempts} failed with error:`, e);
				lastError = e as Error;

				// If we've reached the maximum number of attempts, break out of the loop
				if (attempts >= maxAttempts) {
					break;
				}

				// Add the response and error to the messages for the next attempt
				messages.push({
					role: "assistant",
					content: [
						{
							type: "text",
							text: validationResponse.text,
						},
					],
				});

				messages.push({
					role: "user",
					content: [
						{
							type: "text",
							text: `The previous Excalidraw JSON did not validate. Please fix it and return the valid JSON without any string quotes or new lines. Here is the error: ${e}`,
						},
					],
				});
			}
		}

		// If we've exhausted all attempts, throw an error
		throw new Error(
			`Failed to validate Excalidraw JSON after ${maxAttempts} attempts. Last error: ${lastError?.message}`,
		);
	},
});

export const excalidrawConverterWorkflow = createWorkflow({
	id: "excalidraw-converter",
	description: "Convert images to Excalidraw format",
	inputSchema: z.object({
		filename: z.string(),
		file: z.string(),
	}),
	outputSchema: outputSchema,
})
	.then(imageToCsvStep)
	.then(validateCsvStep)
	.then(csvToExcalidrawStep)
	.then(validateExcalidrawStep)
	.commit();