#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import dotenv from "dotenv";
import { z } from "zod";
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
const baseUrl = `https://${subdomain}.zendesk.com/api/v2/help_center`;
// Helper function for Zendesk API requests
async function makeZendeskRequest(url, params = {}) {
    try {
        const response = await axios.get(url, {
            params,
            auth: {
                username: `${email}/token`,
                password: apiToken,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("Request error:", error);
        throw error;
    }
}
// Create MCP server
const server = new McpServer({
    name: "zendesk-help-center",
    version: "1.0.0",
});
// Register article search tool
server.tool("searchArticles", "Search for articles in Zendesk Help Center", {
    query: z.string().describe("Search keyword"),
    locale: z.string().optional().describe("Locale code (e.g., 'ja', 'en-us')"),
    page: z.number().optional().describe("Page number"),
    per_page: z.number().optional().describe("Number of results per page (max 100)"),
}, async ({ query, locale = DEFAULT_LOCALE, page = 1, per_page = 20 }) => {
    try {
        const searchUrl = `${baseUrl}/articles/search.json`;
        const data = await makeZendeskRequest(searchUrl, {
            query,
            locale,
            page,
            per_page,
        });
        // Remove body field from results to reduce token size
        if (data.results && Array.isArray(data.results)) {
            data.results = data.results.map((article) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { body, ...rest } = article;
                return rest;
            });
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Search error: ${error}`,
                },
            ],
        };
    }
});
// Register article detail retrieval tool
server.tool("getArticle", "Get details of a specific Zendesk Help Center article by ID", {
    id: z.number().describe("Article ID"),
    locale: z.string().optional().describe("Locale code (e.g., 'ja', 'en-us')"),
}, async ({ id, locale = DEFAULT_LOCALE }) => {
    try {
        const articleUrl = `${baseUrl}/articles/${id}.json`;
        const data = await makeZendeskRequest(articleUrl, { locale });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Article retrieval error: ${error}`,
                },
            ],
        };
    }
});
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
