#!/usr/bin/env node
import dotenv from "dotenv";
import { ZendeskHelpCenterClient } from "./client.js";
// Load environment variables
dotenv.config();
// Get Zendesk configuration from environment variables
const zendeskConfig = {
    subdomain: process.env.ZENDESK_SUBDOMAIN || "",
    email: process.env.ZENDESK_EMAIL || "",
    apiToken: process.env.ZENDESK_API_TOKEN || "",
};
// Check if all required environment variables are set
if (!zendeskConfig.subdomain || !zendeskConfig.email || !zendeskConfig.apiToken) {
    console.error("Error: Missing Zendesk configuration in environment variables.");
    console.error("Please set ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, and ZENDESK_API_TOKEN.");
    process.exit(1);
}
// Create client and start chat loop
async function main() {
    const client = new ZendeskHelpCenterClient(zendeskConfig);
    try {
        // Start the chat loop directly without connecting to server
        await client.chatLoop();
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
main();
