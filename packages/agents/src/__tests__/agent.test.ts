import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../agent.js';
import type { AIGateway } from '@ai-platform-aws/sdk';
import type { Tool } from '../tools/types.js';

function createMockGateway(responses: string[]): AIGateway {
  let callIndex = 0;
  return {
    complete: vi.fn(async () => ({
      id: 'test',
      content: responses[callIndex++] || 'Final Answer: done',
      model: 'test',
      provider: 'test',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
      latencyMs: 50,
    })),
    embed: vi.fn(),
    stream: vi.fn(),
    classify: vi.fn(),
    health: vi.fn(),
  } as unknown as AIGateway;
}

function createMockTool(name: string, result: unknown): Tool {
  return {
    name,
    description: `Mock ${name} tool`,
    parameters: { type: 'object', properties: { input: { type: 'string' } } },
    execute: vi.fn().mockResolvedValue({ success: true, data: result }),
  };
}

describe('Agent', () => {
  it('returns direct answer when no tool call needed', async () => {
    const gateway = createMockGateway(['Final Answer: 42']);
    const agent = new Agent(
      { name: 'test', description: 'test agent', model: 'test', tools: [] },
      gateway,
    );

    const result = await agent.run('What is the answer?');

    expect(result.success).toBe(true);
    expect(result.output).toBe('42');
    expect(result.toolCalls).toHaveLength(0);
    expect(result.iterations).toBe(1);
  });

  it('executes tool and loops back', async () => {
    const gateway = createMockGateway([
      'Thought: I need to calculate\n\nAction: calculator\nAction Input: {"input": "2+2"}',
      'Final Answer: The result is 4',
    ]);
    const tool = createMockTool('calculator', 4);
    const agent = new Agent(
      { name: 'test', description: 'test agent', model: 'test', tools: [tool] },
      gateway,
    );

    const result = await agent.run('What is 2+2?');

    expect(result.success).toBe(true);
    expect(result.output).toBe('The result is 4');
    expect(result.toolCalls).toHaveLength(1);
    expect(tool.execute).toHaveBeenCalledWith({ input: '2+2' });
  });

  it('stops at max iterations', async () => {
    const gateway = createMockGateway(
      Array(5).fill('Thought: still thinking\n\nAction: calc\nAction Input: {"input": "1"}'),
    );
    const tool = createMockTool('calc', 1);
    const agent = new Agent(
      { name: 'test', description: 'test', model: 'test', tools: [tool], maxIterations: 3 },
      gateway,
    );

    const result = await agent.run('Loop forever');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Max iterations');
    expect(result.iterations).toBe(3);
  });

  it('includes tool descriptions in system prompt', async () => {
    const gateway = createMockGateway(['Final Answer: done']);
    const tool = createMockTool('search', []);
    const agent = new Agent(
      { name: 'test', description: 'test', model: 'test', tools: [tool] },
      gateway,
    );

    await agent.run('test');

    const callArgs = (gateway.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const systemMsg = callArgs.messages[0];
    expect(systemMsg.content).toContain('search');
    expect(systemMsg.content).toContain('Mock search tool');
  });
});
