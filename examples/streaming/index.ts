/**
 * Streaming Example - SSE chat completion via the AI Gateway
 *
 * Connects to the gateway and streams tokens as they arrive.
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:3000 npx tsx index.ts
 */

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function streamChat(messages: ChatMessage[]): Promise<void> {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      provider: "bedrock",
      model: "anthropic.claude-3-sonnet-20240229-v1:0",
      messages,
      stream: true,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    throw new Error(`Gateway returned ${res.status}: ${await res.text()}`);
  }

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  process.stdout.write("\nAssistant: ");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        process.stdout.write("\n\n");
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          process.stdout.write(token);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  process.stdout.write("\n\n");
}

async function main(): Promise<void> {
  console.log(`Streaming from ${GATEWAY_URL}\n`);

  await streamChat([
    { role: "system", content: "You are a helpful assistant. Be concise." },
    { role: "user", content: "Explain serverless computing in 3 sentences." },
  ]);
}

main().catch(console.error);
