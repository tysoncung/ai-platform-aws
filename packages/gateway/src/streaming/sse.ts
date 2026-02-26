import type { FastifyReply } from 'fastify';

export async function sendSSE(reply: FastifyReply, generator: AsyncGenerator<string>): Promise<void> {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    for await (const chunk of generator) {
      reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    reply.raw.write('data: [DONE]\n\n');
  } catch (err) {
    reply.raw.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
  } finally {
    reply.raw.end();
  }
}
