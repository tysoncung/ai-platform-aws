import type { AIProvider, ProviderConfig } from './types.js';
import { BedrockProvider } from './bedrock.js';
import { OpenAIProvider } from './openai.js';

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private fallbacks = new Map<string, string>();

  register(name: string, provider: AIProvider, fallback?: string): void {
    this.providers.set(name, provider);
    if (fallback) {
      this.fallbacks.set(name, fallback);
    }
  }

  get(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider not found: ${name}`);
    return provider;
  }

  getFallback(name: string): AIProvider | undefined {
    const fallbackName = this.fallbacks.get(name);
    return fallbackName ? this.providers.get(fallbackName) : undefined;
  }

  resolveForModel(model: string): AIProvider {
    for (const [, provider] of this.providers) {
      // Check if any provider config knows this model
      if (provider.name === 'bedrock' && model.startsWith('claude-3')) return provider;
      if (provider.name === 'bedrock' && model.startsWith('titan')) return provider;
      if (provider.name === 'openai' && model.startsWith('gpt-')) return provider;
      if (provider.name === 'openai' && model.startsWith('text-embedding')) return provider;
    }
    throw new Error(`No provider found for model: ${model}`);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  static fromConfig(configs: Record<string, ProviderConfig>): ProviderRegistry {
    const registry = new ProviderRegistry();

    for (const [name, config] of Object.entries(configs)) {
      let provider: AIProvider;

      switch (config.provider) {
        case 'bedrock':
          provider = new BedrockProvider(config.models);
          break;
        case 'openai':
          provider = new OpenAIProvider(config.models);
          break;
        default:
          throw new Error(`Unknown provider type: ${config.provider}`);
      }

      registry.register(name, provider, config.fallback);
    }

    return registry;
  }
}
