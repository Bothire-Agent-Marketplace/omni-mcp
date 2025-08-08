## MCP Client Integration Guide (Gateway)

This file describes how an MCP client (e.g., Cursor, Claude Desktop, or a custom MCP agent) should
interact with the Gateway using MCP JSON‑RPC. The instructions are written for the client/agent.

### Endpoint

- POST requests to `http://localhost:37373/mcp`
- Required headers:
  - `Content-Type: application/json`
  - `x-api-key: dev-api-key-12345`

### Supported MCP methods

- `tools/list`
- `tools/call`
- `resources/list`, `resources/read`
- `prompts/list`, `prompts/get`

### Discover tools

Request:

```json
{ "jsonrpc": "2.0", "id": "t1", "method": "tools/list", "params": {} }
```

Response (excerpt):

```json
{
  "jsonrpc": "2.0",
  "id": "t1",
  "result": {
    "tools": [
      {
        "name": "linear_search_issues",
        "description": "Search for Linear issues with optional filters",
        "inputSchema": { "type": "object", "properties": { "query": { "type": "string" } } }
      }
    ]
  }
}
```

### Call a tool

Send arguments that conform to the tool’s `inputSchema`.

Example (Linear search):

```json
{
  "jsonrpc": "2.0",
  "id": "t2",
  "method": "tools/call",
  "params": {
    "name": "linear_search_issues",
    "arguments": { "query": "PHOENIX-265", "limit": 5 }
  }
}
```

Result contract:

- The gateway returns `result.content` as an array of `{ type: "text", text: string }`.
- For data tools, `text` is a JSON string you should parse.
- Linear search returns a JSON object with:
  - `issues`: array of issues (each includes `identifier`, `title`, `team`, and `relatedIssues`)
  - `count`: number in this page
  - `pageInfo`: `{ hasNextPage: boolean, endCursor: string | null }`

Example parsed payload (excerpt):

```json
{
  "issues": [
    {
      "identifier": "PHOENIX-265",
      "title": "Register Date Field Malfunctioning…",
      "team": "Phoenix",
      "relatedIssues": [{ "relationType": "relates_to", "identifier": "IOS-19147", "team": "Ios" }]
    }
  ],
  "pageInfo": { "hasNextPage": true, "endCursor": "<cursor>" }
}
```

### Pagination (cursor‑based)

- If `pageInfo.hasNextPage` is true, pass `cursor` back into the next call’s arguments:

```json
{
  "jsonrpc": "2.0",
  "id": "t3",
  "method": "tools/call",
  "params": {
    "name": "linear_search_issues",
    "arguments": { "query": "PHOENIX-265", "limit": 25, "cursor": "<endCursor>" }
  }
}
```

### Prompts and resources

- `prompts/list` → list available prompts
- `prompts/get` with `{ name, arguments }` → returns `messages`
- `resources/list` → list resources
- `resources/read` with `{ uri }` → returns `contents`

### Error handling

- Errors are standard MCP JSON‑RPC errors in `error` field.
- Common: `401 Unauthorized` (missing/invalid `x-api-key`). Ensure header is present on every call.

### Notes for clients

- Always parse `result.content[*].text` when `type === "text"` to obtain JSON payloads from tools.
- Tool `inputSchema` is a JSON Schema object; validate arguments before sending if desired.
- Linear search now includes `relatedIssues` for each returned issue.
