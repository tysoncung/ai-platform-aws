import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '../../providers/registry.js';
import type { AIProvider } from '../../providers/types.js';

function createMockProvider(name: string): AIProvider {
  return {
    name,
    complete: vi.fn(),
    completeStream: vi.fn() as unknown as AIProvider['completeStream'],
    embed: vi.fn(),
  };
}

describe('ProviderRegistry', () => {
  it('registers and retrieves a provider', () => {
    const registry = new ProviderRegistry();
    const provider = createMockProvider('test');
    registry.register('test', provider);

    expect(registry.get('test')).toBe(provider);
  });

  it('throws on unknown provider', () => {
    const registry = new ProviderRegistry();
    expect(() => registry.get('nope')).toThrow('Provider not found: nope');
  });

  it('lists registered providers', () => {
    const registry = new ProviderRegistry();
    registry.register('a', createMockProvider('a'));
    registry.register('b', createMockProvider('b'));

    expect(registry.list()).toEqual(['a', 'b']);
  });

  it('resolves fallback provider', () => {
    const registry = new ProviderRegistry();
    const primary = createMockProvider('bedrock');
    const fallback = createMockProvider('openai');
    registry.register('bedrock', primary, 'openai');
    registry.register('openai', fallback);

    expect(registry.getFallback('bedrock')).toBe(fallback);
    expect(registry.getFallback('openai')).toBeUndefined();
  });

  it('resolves provider for model name', () => {
    const registry = new ProviderRegistry();
    const bedrock = createMockProvider('bedrock');
    const openai = createMockProvider('openai');
    registry.register('bedrock', bedrock);
    registry.register('openai', openai);

    expect(registry.resolveForModel('claude-3-haiku').name).toBe('bedrock');
    expect(registry.resolveForModel('gpt-4o').name).toBe('openai');
    expect(registry.resolveForModel('titan-embed').name).toBe('bedrock');
    expect(() => registry.resolveForModel('unknown-model')).toThrow('No provider found');
  });
});
