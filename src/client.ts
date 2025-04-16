import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import axios from "axios";
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as readline from "node:readline";

// Zendesk configuration interface
export interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
}

// MCP client class
export class ZendeskHelpCenterClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private zendeskConfig: ZendeskConfig;
  private baseUrl: string;

  constructor(config: ZendeskConfig) {
    this.zendeskConfig = config;
    this.baseUrl = `https://${config.subdomain}.zendesk.com/api/v2/help_center`;
  }

  // Connect to server
  async connectToServer(serverScriptPath: string): Promise<void> {
    const isPython = serverScriptPath.endsWith(".py");
    const isJs = serverScriptPath.endsWith(".js");

    if (!isPython && !isJs) {
      throw new Error("Server script must be a .py or .js file");
    }

    const command = isPython ? "python" : "node";

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });

    this.client = new Client(
      {
        name: "zendesk-help-center-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);

    // List available tools
    const response = await this.client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );

    console.log(
      "\nAvailable tools:",
      response.tools.map((tool: any) => tool.name)
    );
  }

  // Tool to search Zendesk articles
  async searchArticles(params: {
    query: string;
    locale?: string;
    page?: number;
    per_page?: number;
  }): Promise<any> {
    const { query, locale = "en", page = 1, per_page = 20 } = params;

    try {
      const response = await axios.get(
        `${this.baseUrl}/articles/search.json`,
        {
          params: { query, locale, page, per_page },
          auth: {
            username: `${this.zendeskConfig.email}/token`,
            password: this.zendeskConfig.apiToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  }

  // Tool to get article details
  async getArticle(params: { id: number; locale?: string }): Promise<any> {
    const { id, locale = "en" } = params;

    try {
      const response = await axios.get(
        `${this.baseUrl}/articles/${id}.json`,
        {
          params: { locale },
          auth: {
            username: `${this.zendeskConfig.email}/token`,
            password: this.zendeskConfig.apiToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Article retrieval error:", error);
      throw error;
    }
  }

  // Interactive chat loop
  async chatLoop(): Promise<void> {
    console.log("\nZendesk Help Center MCP client started!");
    console.log("Enter a command ('quit' to exit):");
    console.log("- search <keyword> [locale] [page] [per_page]");
    console.log("- article <articleID> [locale]");

    // Use Node.js readline to process console input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = () => {
      rl.question("\nCommand: ", async (input: string) => {
        try {
          if (input.toLowerCase() === "quit") {
            await this.cleanup();
            rl.close();
            return;
          }

          const parts = input.split(" ");
          const command = parts[0].toLowerCase();

          if (command === "search") {
            if (parts.length < 2) {
              console.log("Usage: search <keyword> [locale] [page] [per_page]");
            } else {
              const query = parts[1];
              const locale = parts[2] || "en";
              const page = parseInt(parts[3]) || 1;
              const per_page = parseInt(parts[4]) || 20;

              const results = await this.searchArticles({
                query,
                locale,
                page,
                per_page,
              });
              console.log(JSON.stringify(results, null, 2));
            }
          } else if (command === "article") {
            if (parts.length < 2) {
              console.log("Usage: article <articleID> [locale]");
            } else {
              const id = parseInt(parts[1]);
              const locale = parts[2] || "en";

              const article = await this.getArticle({ id, locale });
              console.log(JSON.stringify(article, null, 2));
            }
          } else {
            console.log("Unknown command. Available commands: search, article, quit");
          }

          askQuestion();
        } catch (error) {
          console.error("\nError:", error);
          askQuestion();
        }
      });
    };

    askQuestion();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }
}
