import type { Tool, JSONSchema, ToolResult } from './types.js';
import { globalRegistry } from './registry.js';

export interface ToolDecoratorOptions {
  name: string;
  description: string;
  parameters: JSONSchema;
  register?: boolean;
}

/**
 * Decorator to turn a method into a Tool.
 *
 * Usage:
 * ```typescript
 * class MyTools {
 *   @tool({
 *     name: 'greet',
 *     description: 'Greet a person',
 *     parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
 *   })
 *   async greet(params: { name: string }): Promise<ToolResult> {
 *     return { success: true, data: `Hello, ${params.name}!` };
 *   }
 * }
 * ```
 */
export function tool(options: ToolDecoratorOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<ToolResult>;

    const toolDef: Tool = {
      name: options.name,
      description: options.description,
      parameters: options.parameters,
      execute: async (params: Record<string, unknown>) => originalMethod(params),
    };

    if (options.register !== false) {
      globalRegistry.register(toolDef);
    }

    // Attach tool metadata to the method
    (descriptor.value as Record<string, unknown>).__tool = toolDef;

    return descriptor;
  };
}

/**
 * Create a Tool from a plain function without decorators.
 */
export function createTool(
  name: string,
  description: string,
  parameters: JSONSchema,
  execute: (params: Record<string, unknown>) => Promise<ToolResult>,
): Tool {
  return { name, description, parameters, execute };
}
