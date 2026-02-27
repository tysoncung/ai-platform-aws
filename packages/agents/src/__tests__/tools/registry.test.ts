import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../../tools/registry.js';
import type { Tool } from '../../tools/types.js';

function makeTool(name: string): Tool {
  return {
    name,
    description: `${name} tool`,
    parameters: { type: 'object', properties: {} },
    execute: vi.fn(),
  };
}

describe('ToolRegistry', () => {
  it('registers and retrieves a tool', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('test');
    registry.register(tool);

    expect(registry.get('test')).toBe(tool);
    expect(registry.has('test')).toBe(true);
  });

  it('throws on duplicate registration', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('dup'));

    expect(() => registry.register(makeTool('dup'))).toThrow('already registered');
  });

  it('returns undefined for unknown tool', () => {
    const registry = new ToolRegistry();
    expect(registry.get('nope')).toBeUndefined();
  });

  it('lists all tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('a'));
    registry.register(makeTool('b'));

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('returns tool descriptions', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('calc'));

    const descs = registry.getDescriptions();
    expect(descs[0]).toEqual({
      name: 'calc',
      description: 'calc tool',
      parameters: { type: 'object', properties: {} },
    });
  });

  it('unregisters tools', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('temp'));
    registry.unregister('temp');

    expect(registry.has('temp')).toBe(false);
  });
});
