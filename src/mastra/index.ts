import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { csvToExcalidrawAgent } from "./agents/csv_to_excalidraw";
import { excalidrawValidatorAgent } from "./agents/excalidraw_validator";
import { imageToCsvAgent } from "./agents/image_to_csv";
import { toolboxAgent } from "./agents/toolbox-agent";
import { weatherAgent } from "./agents/weather-agent";
import { excalidrawConverterWorkflow } from "./workflows/excalidraw_converter";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
	workflows: { weatherWorkflow, excalidrawConverterWorkflow },
	agents: {
		weatherAgent,
		toolboxAgent,
		csvToExcalidrawAgent,
		excalidrawValidatorAgent,
		imageToCsvAgent,
	},
	storage: new LibSQLStore({
		// stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
		url: ":memory:",
	}),
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
});
