const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number.parseInt(process.env.PORT || "5177", 10);
const ROOT = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

// Helper function to log webhook calls
function logWebhook(type, org, data, headers) {
  const timestamp = new Date().toISOString();
  const separator = "=".repeat(60);

  console.log("");
  console.log(colors.bright + colors.cyan + separator + colors.reset);
  console.log(colors.bright + "📨 WEBHOOK RECEIVED" + colors.reset);
  console.log(colors.cyan + separator + colors.reset);
  console.log(colors.yellow + "Time:         " + colors.reset + timestamp);
  console.log(colors.yellow + "Type:         " + colors.reset + colors.bright + type.toUpperCase() + colors.reset);
  console.log(colors.yellow + "Organization: " + colors.reset + colors.bright + org + colors.reset);
  console.log(colors.cyan + separator + colors.reset);

  console.log(colors.green + "Headers:" + colors.reset);
  Object.entries(headers).forEach(([key, value]) => {
    if (key.toLowerCase().includes('content') || key.toLowerCase().includes('user-agent')) {
      console.log("  " + colors.dim + key + ":" + colors.reset + " " + value);
    }
  });

  console.log("");
  console.log(colors.green + "Payload:" + colors.reset);
  console.log(JSON.stringify(data, null, 2));
  console.log(colors.cyan + separator + colors.reset);
  console.log("");
}

// Parse JSON body from request
function parseBody(req, callback) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (err) {
      callback(err, null);
    }
  });
}

// Handle webhook endpoints
function handleWebhook(req, res) {
  const url = new URL(req.url, "http://localhost:" + PORT);
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid webhook path" }));
    return;
  }

  const type = pathParts[0];
  const org = pathParts[1];

  parseBody(req, (err, data) => {
    if (err) {
      console.error(colors.red + "Error parsing webhook body:" + colors.reset, err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }

    // Log the webhook
    logWebhook(type, org, data, req.headers);

    // Respond with success
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      message: type + " webhook received for " + org,
      timestamp: new Date().toISOString(),
      receivedData: data,
    }));
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  const url = new URL(req.url, "http://localhost:" + PORT);
  const pathname = url.pathname;

  // Check if this is a webhook endpoint
  const webhookTypes = ["/webhook/", "/n8n/", "/make/", "/discord/", "/telegram/", "/slack/"];
  const isWebhook = webhookTypes.some((type) => pathname.startsWith(type));

  if (isWebhook) {
    handleWebhook(req, res);
    return;
  }

  // Serve static files
  const safePath = decodeURIComponent(pathname);
  const requestPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.join(ROOT, requestPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(colors.bright + colors.green + "🧪 Test Lab Server" + colors.reset);
  console.log(colors.cyan + "═══════════════════════════════════════════════" + colors.reset);
  console.log(colors.yellow + "Server running at: " + colors.reset + colors.bright + "http://localhost:" + PORT + colors.reset);
  console.log("");
  console.log(colors.yellow + "Webhook Endpoints:" + colors.reset);
  console.log("  " + colors.dim + "•" + colors.reset + " POST /webhook/:org");
  console.log("  " + colors.dim + "•" + colors.reset + " POST /n8n/:org");
  console.log("  " + colors.dim + "•" + colors.reset + " POST /make/:org");
  console.log("  " + colors.dim + "•" + colors.reset + " POST /discord/:org");
  console.log("  " + colors.dim + "•" + colors.reset + " POST /telegram/:org");
  console.log("  " + colors.dim + "•" + colors.reset + " POST /slack/:org");
  console.log(colors.cyan + "═══════════════════════════════════════════════" + colors.reset);
  console.log("");
  console.log(colors.green + "✓" + colors.reset + " Ready to receive webhooks...");
  console.log("");
});
