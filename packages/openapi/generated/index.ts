// Convenience re-exports from generated OpenAPI types
export type { paths, components, operations } from './types.js';

// Schema type aliases for direct use
import type { components } from './types.js';

export type Message = components['schemas']['Message'];
export type CompletionRequest = components['schemas']['CompletionRequest'];
export type CompletionResponse = components['schemas']['CompletionResponse'];
export type EmbeddingRequest = components['schemas']['EmbeddingRequest'];
export type EmbeddingResponse = components['schemas']['EmbeddingResponse'];
export type ClassifyRequest = components['schemas']['ClassifyRequest'];
export type ClassifyResponse = components['schemas']['ClassifyResponse'];
export type HealthResponse = components['schemas']['HealthResponse'];
