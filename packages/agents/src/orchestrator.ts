import type { AIGateway } from '@ai-gateway-aws/sdk';
import type { Agent } from './agent.js';
import type { AgentResult } from './types.js';

export interface OrchestratorConfig {
  gateway: AIGateway;
  model: string;
  provider?: string;
}

/**
 * Multi-agent orchestrator. Routes tasks, pipelines agents, and supports
 * parallel execution and supervisor patterns.
 */
export class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private gateway: AIGateway;
  private model: string;
  private provider?: string;

  constructor(config: OrchestratorConfig) {
    this.gateway = config.gateway;
    this.model = config.model;
    this.provider = config.provider;
  }

  /** Register an agent with the orchestrator. */
  addAgent(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  /** Remove an agent. */
  removeAgent(name: string): void {
    this.agents.delete(name);
  }

  /** Get a registered agent by name. */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Route a task to the best agent based on the task description.
   * Uses the LLM to decide which agent is most appropriate.
   */
  async route(task: string): Promise<AgentResult> {
    const agentList = Array.from(this.agents.entries())
      .map(([name, agent]) => `- ${name}: ${agent.description}`)
      .join('\n');

    const response = await this.gateway.complete({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a task router. Given a task and available agents, select the best agent.

Available agents:
${agentList}

Respond with ONLY the agent name, nothing else.`,
        },
        { role: 'user', content: task },
      ],
    });

    const agentName = response.content.trim();
    const agent = this.agents.get(agentName);

    if (!agent) {
      return {
        success: false,
        output: '',
        toolCalls: [],
        iterations: 0,
        error: `Router selected unknown agent "${agentName}". Available: ${Array.from(this.agents.keys()).join(', ')}`,
      };
    }

    return agent.run(task);
  }

  /**
   * Run agents in sequence (pipeline). Each agent's output becomes the next agent's input.
   */
  async pipeline(task: string, agentNames: string[]): Promise<AgentResult> {
    let currentInput = task;
    let lastResult: AgentResult | undefined;
    const allToolCalls: AgentResult['toolCalls'] = [];
    let totalIterations = 0;

    for (const name of agentNames) {
      const agent = this.agents.get(name);
      if (!agent) {
        return {
          success: false,
          output: '',
          toolCalls: allToolCalls,
          iterations: totalIterations,
          error: `Agent "${name}" not found`,
        };
      }

      lastResult = await agent.run(currentInput);
      allToolCalls.push(...lastResult.toolCalls);
      totalIterations += lastResult.iterations;

      if (!lastResult.success) {
        return {
          ...lastResult,
          toolCalls: allToolCalls,
          iterations: totalIterations,
          error: `Pipeline failed at agent "${name}": ${lastResult.error}`,
        };
      }

      currentInput = `Previous agent (${name}) output:\n${lastResult.output}\n\nOriginal task: ${task}\n\nContinue processing.`;
    }

    return {
      success: true,
      output: lastResult?.output || '',
      toolCalls: allToolCalls,
      iterations: totalIterations,
    };
  }

  /**
   * Run agents in parallel and return all results.
   */
  async parallel(task: string, agentNames: string[]): Promise<AgentResult[]> {
    const promises = agentNames.map(async (name) => {
      const agent = this.agents.get(name);
      if (!agent) {
        return {
          success: false,
          output: '',
          toolCalls: [],
          iterations: 0,
          error: `Agent "${name}" not found`,
        } as AgentResult;
      }
      return agent.run(task);
    });

    return Promise.all(promises);
  }

  /**
   * Supervisor pattern: one agent delegates subtasks to other agents.
   * The supervisor agent gets a special tool to delegate work.
   */
  async supervise(task: string, supervisorName: string): Promise<AgentResult> {
    const supervisor = this.agents.get(supervisorName);
    if (!supervisor) {
      return {
        success: false,
        output: '',
        toolCalls: [],
        iterations: 0,
        error: `Supervisor agent "${supervisorName}" not found`,
      };
    }

    // The supervisor runs with knowledge of available agents
    const agentList = Array.from(this.agents.entries())
      .filter(([name]) => name !== supervisorName)
      .map(([name, agent]) => `${name}: ${agent.description}`)
      .join('\n');

    const augmentedTask = `${task}

You can delegate subtasks to these worker agents:
${agentList}

To delegate, describe what each agent should do. Synthesize their outputs into a final answer.`;

    return supervisor.run(augmentedTask);
  }
}
