# Mastra Exploration

A TypeScript project exploring the Mastra framework for building AI agents, workflows, and tools.

## Overview

This project demonstrates the use of Mastra framework to create:
- AI Agents with tools
- Workflows for orchestrating agent actions
- Custom tools for extending agent capabilities

## Project Structure

```
src/mastra/
├── agents/       # AI agent definitions
├── tools/        # Custom tools for agents
├── workflows/    # Workflow orchestrations
└── index.ts      # Main entry point
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the project:
```bash
npm start
```

## Features

### Weather Agent
An example agent that can fetch and process weather information using custom tools.

### Weather Workflow
A workflow that orchestrates the weather agent to perform complex weather-related tasks.

## Development

- TypeScript configuration is set up for Node.js development
- VS Code MCP (Model Context Protocol) integration configured

## Requirements

- Node.js 18+
- npm or yarn