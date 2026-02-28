# Streaming Example

Demonstrates SSE (Server-Sent Events) streaming from the AI Gateway.

## Setup

```bash
npm install
```

## Run

```bash
# Start the gateway first (see root README)
GATEWAY_URL=http://localhost:3000 npm start
```

The example sends a chat completion request with `stream: true` and prints tokens to stdout as they arrive.

## How It Works

1. Sends a POST to `/v1/chat/completions` with `stream: true`
2. Reads the SSE response body as a stream
3. Parses each `data:` line and extracts `choices[0].delta.content`
4. Prints tokens immediately -- no buffering

You can change the provider and model in `index.ts`.
