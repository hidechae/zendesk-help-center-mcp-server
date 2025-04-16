# Zendesk Help Center MCP Server

A Model Context Protocol (MCP) server that interfaces with the Zendesk Help Center API, allowing integration with Claude Desktop and other MCP-compatible clients.

## Features

- **Article Search**: Search for articles in your Zendesk Help Center
- **Article Details**: Retrieve detailed information about specific articles by ID

## Prerequisites

- Node.js (v18 or higher)
- A Zendesk account with API access
- Zendesk API token

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/zendesk-help-center-mcp-server.git
   cd zendesk-help-center-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Zendesk credentials:
   ```
   ZENDESK_SUBDOMAIN=your-subdomain
   ZENDESK_EMAIL=your-email@example.com
   ZENDESK_API_TOKEN=your-api-token
   ```

   You can copy the `.env.example` file and fill in your details:
   ```bash
   cp .env.example .env
   ```

## Building and Running

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will run on standard input/output, making it compatible with Claude Desktop and other MCP clients.

## Available Tools

The server provides the following tools:

### 1. searchArticles

Search for articles in your Zendesk Help Center.

**Parameters:**
- `query` (string, required): Search keyword
- `locale` (string, optional): Locale code (e.g., 'en', 'ja', 'en-us')
- `page` (number, optional): Page number
- `per_page` (number, optional): Number of results per page (max 100)

### 2. getArticle

Get details of a specific Zendesk Help Center article by ID.

**Parameters:**
- `id` (number, required): Article ID
- `locale` (string, optional): Locale code (e.g., 'en', 'ja', 'en-us')

## Using with Claude Desktop

### Adding to Claude's `mcpServers` Configuration

Add the following configuration to the `mcpServers` section in Claude's settings file:

```json
{
  "mcpServers": {
    "zendeskHelpCenter": {
      "command": "npx",
      "args": ["-y", "github:hidechae/zendesk-help-center-mcp-server"],
      "env": {
        "ZENDESK_SUBDOMAIN": "your-subdomain",
        "ZENDESK_EMAIL": "your-email@example.com",
        "ZENDESK_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

After adding this configuration, you can use the Zendesk Help Center tools within Claude.

## Development

This project uses TypeScript and follows the Model Context Protocol specification.

To run in development mode with auto-reloading:
```bash
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
