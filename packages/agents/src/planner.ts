import type { AIGateway } from '@ai-gateway-aws/sdk';
import type { Plan, PlanStep } from './types.js';
import type { Tool } from './tools/types.js';

export interface PlannerConfig {
  model: string;
  provider?: string;
}

/**
 * Task decomposition planner. Uses an LLM to break complex tasks into subtasks.
 */
export class Planner {
  private gateway: AIGateway;
  private config: PlannerConfig;

  constructor(gateway: AIGateway, config: PlannerConfig) {
    this.gateway = gateway;
    this.config = config;
  }

  /**
   * Decompose a complex task into an ordered list of subtasks.
   */
  async plan(task: string, tools: Tool[]): Promise<Plan> {
    const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

    const response = await this.gateway.complete({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: `You are a task planner. Given a task and available tools, decompose the task into a sequence of steps.

Available tools:
${toolList}

Respond with a JSON plan in this exact format:
{
  "goal": "the overall goal",
  "steps": [
    {
      "id": "step_1",
      "description": "what this step does",
      "toolName": "tool_to_use or null if no tool needed",
      "dependsOn": ["step_ids this depends on"]
    }
  ]
}

Only output valid JSON, nothing else.`,
        },
        { role: 'user', content: task },
      ],
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        goal: parsed.goal,
        steps: parsed.steps.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          description: s.description as string,
          toolName: (s.toolName as string) || undefined,
          dependsOn: (s.dependsOn as string[]) || [],
          status: 'pending' as const,
        })),
      };
    } catch {
      // If parsing fails, create a single-step plan
      return {
        goal: task,
        steps: [
          {
            id: 'step_1',
            description: task,
            dependsOn: [],
            status: 'pending' as const,
          },
        ],
      };
    }
  }

  /**
   * Re-plan when a step fails, adjusting remaining steps.
   */
  async replan(plan: Plan, failedStep: PlanStep, error: string): Promise<Plan> {
    const completedSteps = plan.steps
      .filter((s) => s.status === 'done')
      .map((s) => `- ${s.id}: ${s.description} (completed${s.result ? ': ' + s.result : ''})`)
      .join('\n');

    const remainingSteps = plan.steps
      .filter((s) => s.status === 'pending')
      .map((s) => `- ${s.id}: ${s.description}`)
      .join('\n');

    const response = await this.gateway.complete({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: `You are a task planner. A plan step has failed and you need to create a revised plan.

Original goal: ${plan.goal}

Completed steps:
${completedSteps || 'None'}

Failed step: ${failedStep.id}: ${failedStep.description}
Error: ${error}

Remaining steps:
${remainingSteps || 'None'}

Create a revised plan that works around the failure. Respond with JSON in the same format as before.
Only output valid JSON, nothing else.`,
        },
        { role: 'user', content: `Replan after failure of step "${failedStep.id}": ${error}` },
      ],
    });

    try {
      const parsed = JSON.parse(response.content);
      // Keep completed steps, replace remaining with new plan
      const done = plan.steps.filter((s) => s.status === 'done');
      const newSteps = parsed.steps.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        description: s.description as string,
        toolName: (s.toolName as string) || undefined,
        dependsOn: (s.dependsOn as string[]) || [],
        status: 'pending' as const,
      }));

      return {
        goal: parsed.goal || plan.goal,
        steps: [...done, ...newSteps],
      };
    } catch {
      return plan;
    }
  }
}
