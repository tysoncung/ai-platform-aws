import type { AIGateway } from '@ai-platform-aws/sdk';
import type { AgentConfig, AgentContext, AgentResult, Message } from './types.js';
import type { ToolCall, ToolResult } from './tools/types.js';
import { ConversationMemory } from './memory/conversation.js';

export class Agent {
  readonly name: string;
  readonly description: string;
  private config: AgentConfig;
  private gateway: AIGateway;

  constructor(config: AgentConfig, gateway: AIGateway) {
    this.name = config.name;
    this.description = config.description;
    this.config = config;
    this.gateway = gateway;

    if (!config.memory) {
      this.config.memory = new ConversationMemory();
    }
  }

  /**
   * Run the agent on a task using the ReAct (Reason + Act) loop.
   *
   * 1. Send task + history to LLM with tool descriptions
   * 2. LLM returns either a final answer OR a tool call
   * 3. If tool call: execute tool, add result to history, loop back to 1
   * 4. If final answer: return result
   */
  async run(task: string, context?: AgentContext): Promise<AgentResult> {
    const memory = this.config.memory!;
    const maxIterations = this.config.maxIterations || 10;
    const toolCalls: ToolCall[] = [];
    let iterations = 0;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(context);

    // Add user task
    await memory.addMessage({
      role: 'user',
      content: task,
      timestamp: new Date(),
    });

    while (iterations < maxIterations) {
      iterations++;

      // Get conversation history
      const history = await memory.getHistory();
      const messages = this.formatMessages(systemPrompt, history);

      // Call LLM
      const response = await this.gateway.complete({
        model: this.config.model,
        messages,
      });

      const content = response.content || '';

      // Check if the response contains a tool call
      const parsedToolCall = this.parseToolCall(content);

      if (!parsedToolCall) {
        // Final answer — no tool call found
        await memory.addMessage({
          role: 'assistant',
          content,
          timestamp: new Date(),
        });

        return {
          success: true,
          output: this.extractFinalAnswer(content),
          toolCalls,
          iterations,
        };
      }

      // Tool call detected
      const { toolName, parameters } = parsedToolCall;
      const tool = this.config.tools.find((t) => t.name === toolName);

      if (!tool) {
        await memory.addMessage({
          role: 'assistant',
          content,
          timestamp: new Date(),
        });
        await memory.addMessage({
          role: 'tool',
          content: `Error: Tool "${toolName}" not found. Available tools: ${this.config.tools.map((t) => t.name).join(', ')}`,
          timestamp: new Date(),
        });
        continue;
      }

      const call: ToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        toolName,
        parameters,
        timestamp: new Date(),
      };

      // Human-in-the-loop approval
      if (this.config.onToolCall) {
        const approved = await this.config.onToolCall(call);
        if (!approved) {
          await memory.addMessage({
            role: 'tool',
            content: `Tool call "${toolName}" was rejected by the human operator.`,
            timestamp: new Date(),
          });
          continue;
        }
      }

      // Execute tool
      let result: ToolResult;
      try {
        result = await tool.execute(parameters);
      } catch (err) {
        result = { success: false, data: null, error: `Tool execution error: ${(err as Error).message}` };
      }

      toolCalls.push(call);

      // Add assistant thought + tool result to memory
      await memory.addMessage({
        role: 'assistant',
        content,
        toolCall: call,
        timestamp: new Date(),
      });
      await memory.addMessage({
        role: 'tool',
        content: JSON.stringify(result, null, 2),
        toolResult: result,
        timestamp: new Date(),
      });
    }

    return {
      success: false,
      output: 'Agent reached maximum iterations without a final answer.',
      toolCalls,
      iterations,
      error: `Max iterations (${maxIterations}) reached`,
    };
  }

  private buildSystemPrompt(context?: AgentContext): string {
    const toolDescriptions = this.config.tools
      .map((t) => `- **${t.name}**: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`)
      .join('\n');

    const base = this.config.systemPrompt || `You are ${this.config.name}: ${this.config.description}`;

    return `${base}

You have access to the following tools:
${toolDescriptions}

## How to use tools

When you need to use a tool, respond with a thought and then a tool call in this exact format:

Thought: [your reasoning about what to do next]

Action: [tool_name]
Action Input: [JSON parameters]

When you have enough information to answer the question, respond with:

Thought: [your final reasoning]

Final Answer: [your complete answer]

${context?.variables ? `\nContext variables: ${JSON.stringify(context.variables)}` : ''}`;
  }

  private formatMessages(systemPrompt: string, history: Message[]): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of history) {
      if (msg.role === 'tool') {
        messages.push({ role: 'user', content: `Observation: ${msg.content}` });
      } else if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    return messages;
  }

  private parseToolCall(content: string): { toolName: string; parameters: Record<string, unknown> } | null {
    // Look for "Action: toolname\nAction Input: {...}"
    const actionMatch = content.match(/Action:\s*(\w+)\s*\n\s*Action Input:\s*(\{[\s\S]*?\})\s*$/m);

    if (actionMatch) {
      try {
        return {
          toolName: actionMatch[1],
          parameters: JSON.parse(actionMatch[2]),
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  private extractFinalAnswer(content: string): string {
    const match = content.match(/Final Answer:\s*([\s\S]+)$/m);
    return match ? match[1].trim() : content.trim();
  }
}
