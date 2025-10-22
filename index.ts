#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Definition of the Perplexity Ask Tool.
 * This tool accepts an array of messages and returns a chat completion response
 * from the Perplexity API, with citations appended to the message if provided.
 */
const PERPLEXITY_ASK_TOOL: Tool = {
  name: "perplexity_ask",
  description:
    "Engages in a conversation using the Sonar API. " +
    "Accepts an array of messages (each with a role and content) " +
    "and returns a ask completion response from the Perplexity model.",
  inputSchema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              description: "Role of the message (e.g., system, user, assistant)",
            },
            content: {
              type: "string",
              description: "The content of the message",
            },
          },
          required: ["role", "content"],
        },
        description: "Array of conversation messages",
      },
    },
    required: ["messages"],
  },
};

/**
 * Definition of the Perplexity Research Tool.
 * This tool performs deep research queries using the Perplexity API.
 */
const PERPLEXITY_RESEARCH_TOOL: Tool = {
  name: "perplexity_research",
  description:
    "Performs deep research using the Perplexity API. " +
    "Accepts an array of messages (each with a role and content) " +
    "and returns a comprehensive research response with citations.",
  inputSchema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              description: "Role of the message (e.g., system, user, assistant)",
            },
            content: {
              type: "string",
              description: "The content of the message",
            },
          },
          required: ["role", "content"],
        },
        description: "Array of conversation messages",
      },
    },
    required: ["messages"],
  },
};

/**
 * Definition of the Perplexity Reason Tool.
 * This tool performs reasoning queries using the Perplexity API.
 */
const PERPLEXITY_REASON_TOOL: Tool = {
  name: "perplexity_reason",
  description:
    "Performs reasoning tasks using the Perplexity API. " +
    "Accepts an array of messages (each with a role and content) " +
    "and returns a well-reasoned response using the sonar-reasoning-pro model.",
  inputSchema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              description: "Role of the message (e.g., system, user, assistant)",
            },
            content: {
              type: "string",
              description: "The content of the message",
            },
          },
          required: ["role", "content"],
        },
        description: "Array of conversation messages",
      },
    },
    required: ["messages"],
  },
};

/**
 * Definition of the Perplexity Search Tool.
 * This tool performs web search using the Perplexity Search API.
 */
const PERPLEXITY_SEARCH_TOOL: Tool = {
  name: "perplexity_search",
  description:
    "Performs web search using the Perplexity Search API. " +
    "Returns ranked search results with titles, URLs, snippets, and metadata.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query string",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (1-20, default: 10)",
        minimum: 1,
        maximum: 20,
      },
      max_tokens_per_page: {
        type: "number",
        description: "Maximum tokens to extract per webpage (default: 1024)",
        minimum: 256,
        maximum: 2048,
      },
      country: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code for regional results (e.g., 'US', 'GB')",
      },
    },
    required: ["query"],
  },
};

const AVAILABLE_TOOLS: Tool[] = [
  PERPLEXITY_ASK_TOOL,
  PERPLEXITY_RESEARCH_TOOL,
  PERPLEXITY_REASON_TOOL,
  PERPLEXITY_SEARCH_TOOL,
];

// Retrieve the Perplexity API key from environment variables
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
if (!PERPLEXITY_API_KEY) {
  console.error("Error: PERPLEXITY_API_KEY environment variable is required");
  process.exit(1);
}

// Configure timeout for API requests (default: 5 minutes)
// Can be overridden via PERPLEXITY_TIMEOUT_MS environment variable
const TIMEOUT_MS = parseInt(process.env.PERPLEXITY_TIMEOUT_MS || "300000", 10);

/**
 * Performs a chat completion by sending a request to the Perplexity API.
 * Appends citations to the returned message content if they exist.
 *
 * @param {Array<{ role: string; content: string }>} messages - An array of message objects.
 * @param {string} model - The model to use for the completion.
 * @returns {Promise<string>} The chat completion result with appended citations.
 * @throws Will throw an error if the API request fails.
 */
async function performChatCompletion(
  messages: Array<{ role: string; content: string }>,
  model: string = "sonar-pro"
): Promise<string> {
  // Construct the API endpoint URL and request body
  const url = new URL("https://api.perplexity.ai/chat/completions");
  const body = {
    model: model, // Model identifier passed as parameter
    messages: messages,
    // Additional parameters can be added here if required (e.g., max_tokens, temperature, etc.)
    // See the Sonar API documentation for more details: 
    // https://docs.perplexity.ai/api-reference/chat-completions
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout: Perplexity API did not respond within ${TIMEOUT_MS}ms. Consider increasing PERPLEXITY_TIMEOUT_MS.`);
    }
    throw new Error(`Network error while calling Perplexity API: ${error}`);
  }

  // Check for non-successful HTTP status
  if (!response.ok) {
    let errorText;
    try {
      errorText = await response.text();
    } catch (parseError) {
      errorText = "Unable to parse error response";
    }
    throw new Error(
      `Perplexity API error: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  // Attempt to parse the JSON response from the API
  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    throw new Error(`Failed to parse JSON response from Perplexity API: ${jsonError}`);
  }

  // Directly retrieve the main message content from the response 
  let messageContent = data.choices[0].message.content;

  // If citations are provided, append them to the message content
  if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
    messageContent += "\n\nCitations:\n";
    data.citations.forEach((citation: string, index: number) => {
      messageContent += `[${index + 1}] ${citation}\n`;
    });
  }

  return messageContent;
}

/**
 * Formats search results from the Perplexity Search API into a readable string.
 *
 * @param {any} data - The search response data from the API.
 * @returns {string} Formatted search results.
 */
function formatSearchResults(data: any): string {
  if (!data.results || !Array.isArray(data.results)) {
    return "No search results found.";
  }

  let formattedResults = `Found ${data.results.length} search results:\n\n`;
  
  data.results.forEach((result: any, index: number) => {
    formattedResults += `${index + 1}. **${result.title}**\n`;
    formattedResults += `   URL: ${result.url}\n`;
    if (result.snippet) {
      formattedResults += `   ${result.snippet}\n`;
    }
    if (result.date) {
      formattedResults += `   Date: ${result.date}\n`;
    }
    formattedResults += `\n`;
  });

  return formattedResults;
}

/**
 * Performs a web search using the Perplexity Search API.
 *
 * @param {string} query - The search query string.
 * @param {number} maxResults - Maximum number of results to return (1-20).
 * @param {number} maxTokensPerPage - Maximum tokens to extract per webpage.
 * @param {string} country - Optional ISO country code for regional results.
 * @returns {Promise<string>} The formatted search results.
 * @throws Will throw an error if the API request fails.
 */
async function performSearch(
  query: string,
  maxResults: number = 10,
  maxTokensPerPage: number = 1024,
  country?: string
): Promise<string> {
  const url = new URL("https://api.perplexity.ai/search");
  const body: any = {
    query: query,
    max_results: maxResults,
    max_tokens_per_page: maxTokensPerPage,
  };

  if (country) {
    body.country = country;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout: Perplexity Search API did not respond within ${TIMEOUT_MS}ms. Consider increasing PERPLEXITY_TIMEOUT_MS.`);
    }
    throw new Error(`Network error while calling Perplexity Search API: ${error}`);
  }

  // Check for non-successful HTTP status
  if (!response.ok) {
    let errorText;
    try {
      errorText = await response.text();
    } catch (parseError) {
      errorText = "Unable to parse error response";
    }
    throw new Error(
      `Perplexity Search API error: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (jsonError) {
    throw new Error(`Failed to parse JSON response from Perplexity Search API: ${jsonError}`);
  }

  return formatSearchResults(data);
}

const MAX_REQUEST_SIZE_BYTES = 512 * 1024;
const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

type ToolCallArguments = Record<string, unknown>;
type ToolCallRequest = {
  name?: string;
  arguments?: ToolCallArguments;
};

function getRequestPath(req: IncomingMessage): string {
  const requestUrl = req.url ?? "/";
  try {
    return new URL(requestUrl, "http://localhost").pathname;
  } catch {
    return "/";
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    "Content-Length": Buffer.byteLength(body, "utf8").toString(),
  });
  res.end(body);
}

function sendNoContent(res: ServerResponse): void {
  res.writeHead(204, {
    ...DEFAULT_HEADERS,
    "Content-Length": "0",
  });
  res.end();
}

async function readJsonBody(req: IncomingMessage): Promise<ToolCallRequest> {
  return new Promise((resolve, reject) => {
    let raw = "";
    let aborted = false;

    req.setEncoding("utf8");

    req.on("data", (chunk: string) => {
      if (aborted) {
        return;
      }
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_SIZE_BYTES) {
        aborted = true;
        req.destroy();
        reject(new HttpError(413, "Request body too large"));
      }
    });

    req.on("end", () => {
      if (aborted) {
        return;
      }
      if (raw.trim().length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, "Request body must be valid JSON"));
      }
    });

    req.on("error", (error) => {
      if (aborted) {
        return;
      }
      aborted = true;
      reject(
        new HttpError(
          400,
          `Failed to read request body: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    });
  });
}

async function invokeTool(name: string, args: ToolCallArguments): Promise<string> {
  const trimmedName = name.trim();

  switch (trimmedName) {
    case "perplexity_ask": {
      const messages = args["messages"];
      if (!Array.isArray(messages)) {
        throw new Error("Invalid arguments for perplexity_ask: 'messages' must be an array");
      }
      return performChatCompletion(
        messages as Array<{ role: string; content: string }>,
        "sonar-pro"
      );
    }
    case "perplexity_research": {
      const messages = args["messages"];
      if (!Array.isArray(messages)) {
        throw new Error("Invalid arguments for perplexity_research: 'messages' must be an array");
      }
      return performChatCompletion(
        messages as Array<{ role: string; content: string }>,
        "sonar-deep-research"
      );
    }
    case "perplexity_reason": {
      const messages = args["messages"];
      if (!Array.isArray(messages)) {
        throw new Error("Invalid arguments for perplexity_reason: 'messages' must be an array");
      }
      return performChatCompletion(
        messages as Array<{ role: string; content: string }>,
        "sonar-reasoning-pro"
      );
    }
    case "perplexity_search": {
      const query = args["query"];
      if (typeof query !== "string" || query.trim().length === 0) {
        throw new Error("Invalid arguments for perplexity_search: 'query' must be a non-empty string");
      }

      const maxResultsRaw = args["max_results"];
      const maxTokensRaw = args["max_tokens_per_page"];
      const countryRaw = args["country"];

      const maxResults = typeof maxResultsRaw === "number" ? maxResultsRaw : 10;
      const maxTokensPerPage = typeof maxTokensRaw === "number" ? maxTokensRaw : 1024;
      const countryCode = typeof countryRaw === "string" ? countryRaw : undefined;

      if (maxResults < 1 || maxResults > 20) {
        throw new Error("Invalid arguments for perplexity_search: 'max_results' must be between 1 and 20");
      }
      if (maxTokensPerPage < 256 || maxTokensPerPage > 2048) {
        throw new Error(
          "Invalid arguments for perplexity_search: 'max_tokens_per_page' must be between 256 and 2048"
        );
      }

      return performSearch(query, maxResults, maxTokensPerPage, countryCode);
    }
    default:
      throw new Error(`Unknown tool: ${trimmedName}`);
  }
}

const serverStartTime = new Date().toISOString();
const rawPort = process.env.PORT ?? "3000";
const PORT = Number.parseInt(rawPort, 10);

if (!Number.isFinite(PORT)) {
  console.error(`Invalid PORT environment variable: ${rawPort}`);
  process.exit(1);
}

const HOST = "0.0.0.0";

const server = createServer((req, res) => {
  (async () => {
    const method = (req.method ?? "GET").toUpperCase();
    const path = getRequestPath(req);

    if (method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    if (method === "GET" && path === "/") {
      sendJson(res, 200, {
        service: "perplexity-mcp",
        mode: "http",
        tools: AVAILABLE_TOOLS.map((tool) => tool.name),
      });
      return;
    }

    if (method === "GET" && path === "/health") {
      sendJson(res, 200, {
        status: "ok",
        uptimeSeconds: process.uptime(),
        startTime: serverStartTime,
      });
      return;
    }

    if (method === "GET" && path === "/tools") {
      sendJson(res, 200, { tools: AVAILABLE_TOOLS });
      return;
    }

    if (method === "POST" && path === "/tools/call") {
      const contentType = (req.headers["content-type"] ?? "").toString().toLowerCase();
      if (!contentType.includes("application/json")) {
        sendJson(res, 415, { error: "Content-Type must be application/json" });
        return;
      }

      let body: ToolCallRequest;
      try {
        body = await readJsonBody(req);
      } catch (error) {
        const err = error as HttpError;
        const statusCode = err.statusCode ?? 500;
        sendJson(res, statusCode, { error: err.message });
        return;
      }

      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        sendJson(res, 400, { error: "Request body must include a non-empty 'name' field" });
        return;
      }

      const args = (body.arguments ?? {}) as ToolCallArguments;

      try {
        const result = await invokeTool(body.name, args);
        sendJson(res, 200, {
          content: [{ type: "text", text: result }],
          isError: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Tool invocation failed for ${body.name}:`, message);
        sendJson(res, 400, {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        });
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  })().catch((error) => {
    console.error("Unhandled error while processing request:", error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Internal server error" });
    } else {
      res.destroy();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Perplexity MCP HTTP server listening on port ${PORT}`);
});

server.on("error", (error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});

const handleShutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
