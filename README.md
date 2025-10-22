# Perplexity API Platform MCP Server

The official MCP server implementation for the Perplexity API Platform, providing AI assistants with real-time web search, reasoning, and research capabilities through Sonar models and the Search API. The service now exposes an HTTP interface so it can run remotely (for example on Heroku) instead of relying on stdio transports.

Please refer to the official [DeepWiki page](https://deepwiki.com/ppl-ai/modelcontextprotocol) for assistance with Model Context Protocol concepts.

## Available Tools

### **perplexity_search**
Direct web search using the Perplexity Search API. Returns ranked search results with metadata, perfect for finding current information.

### **perplexity_ask**
General-purpose conversational AI with real-time web search using the `sonar-pro` model. Great for quick questions and everyday searches.

### **perplexity_research**
Deep, comprehensive research using the `sonar-deep-research` model. Ideal for thorough analysis and detailed reports.

### **perplexity_reason**
Advanced reasoning and problem-solving using the `sonar-reasoning-pro` model. Perfect for complex analytical tasks.

## Configuration

### Required Environment Variables
- `PERPLEXITY_API_KEY`: Your Perplexity API key (obtain it from the [API Portal](https://www.perplexity.ai/account/api/group)).
- `PORT`: (Optional) Port for the HTTP server. Defaults to `3000` locally; Heroku injects this automatically.
- `PERPLEXITY_TIMEOUT_MS`: (Optional) Timeout for upstream requests in milliseconds. Defaults to `300000` (5 minutes).

## Running Locally

```bash
npm install
npm run build
npm start
```

Once started, the server listens on `http://localhost:3000` (or the value of `PORT`). You can interact with it using standard HTTP requests:

```bash
# Retrieve tool metadata
curl http://localhost:3000/tools

# Invoke a tool
curl \
  -H "Content-Type: application/json" \
  -d '{
        "name": "perplexity_search",
        "arguments": {"query": "latest space news", "max_results": 3}
      }' \
  http://localhost:3000/tools/call
```

### API Endpoints
- `GET /` – Basic service info and available tool names.
- `GET /health` – Health report with uptime.
- `GET /tools` – Full tool definitions and JSON schemas.
- `POST /tools/call` – Invoke a tool with a JSON body containing `name` and `arguments`.

## Deploying to Heroku

1. Create a Heroku app:
   ```bash
   heroku create your-perplexity-server
   ```
2. Set required configuration:
   ```bash
   heroku config:set PERPLEXITY_API_KEY=your_key_here PERPLEXITY_TIMEOUT_MS=600000
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```
4. Test the deployment (replace `your-app` with your Heroku app name):
   ```bash
   curl https://your-app.herokuapp.com/health
   ```

## Troubleshooting

- **API Key Issues**: Ensure `PERPLEXITY_API_KEY` is configured for the runtime environment.
- **Connection Errors**: Check outbound connectivity and confirm the Perplexity API is reachable.
- **Invalid Requests**: Verify that tool invocations use the documented JSON schema.
- **Timeout Errors**: For long-running queries, increase `PERPLEXITY_TIMEOUT_MS`.

For support, visit [community.perplexity.ai](https://community.perplexity.ai) or [file an issue](https://github.com/perplexityai/modelcontextprotocol/issues).
