#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { z } from "zod";
import { ZendeskClient } from "./zendesk-client.js";

// Load environment variables
dotenv.config();

// Zendesk API configuration
const subdomain = process.env.ZENDESK_SUBDOMAIN || "";
const email = process.env.ZENDESK_EMAIL || "";
const apiToken = process.env.ZENDESK_API_TOKEN || "";

// Get default locale from environment variable or fallback to "en"
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || "en";

if (!subdomain || !email || !apiToken) {
  console.error("Environment variables are not set. Please check your .env file.");
  process.exit(1);
}

// Initialize Zendesk client
const zendeskClient = new ZendeskClient({
  subdomain,
  email,
  apiToken,
  defaultLocale: DEFAULT_LOCALE,
});

// Create MCP server
const server = new McpServer({
  name: "zendesk-help-center",
  version: "1.0.0",
});

// Register article search tool
server.tool(
  "searchArticles",
  "Search for articles in Zendesk Help Center",
  {
    query: z.string().describe("Search keyword"),
    locale: z.string().optional().describe("Locale code (e.g., 'ja', 'en-us')"),
    page: z.number().optional().describe("Page number"),
    per_page: z.number().optional().describe("Number of results per page (max 100)"),
  },
  async ({ query, locale = DEFAULT_LOCALE, page = 1, per_page = 20 }) => {
    try {
      const data = await zendeskClient.searchArticles({
        query,
        locale,
        page,
        per_page,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Search error: ${error}`,
          },
        ],
      };
    }
  },
);

// Register article detail retrieval tool
server.tool(
  "getArticle",
  "Get details of a specific Zendesk Help Center article by ID",
  {
    id: z.number().describe("Article ID"),
    locale: z.string().optional().describe("Locale code (e.g., 'ja', 'en-us')"),
  },
  async ({ id, locale = DEFAULT_LOCALE }) => {
    try {
      const data = await zendeskClient.getArticle({ id, locale });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Article retrieval error: ${error}`,
          },
        ],
      };
    }
  },
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Zendesk Help Center MCP Server is running");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
