import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, type Span, SpanStatusCode, type Tracer } from '@opentelemetry/api';

const SERVICE_NAME = 'ai-gateway';
const SERVICE_VERSION = process.env.npm_package_version || '0.1.0';

let provider: NodeTracerProvider | null = null;

export function initTracing(): Tracer {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  provider = new NodeTracerProvider({ resource });

  const exporter = new OTLPTraceExporter({ url: endpoint });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  return trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}

export function getTracer(): Tracer {
  return trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
}

export interface LLMSpanAttributes {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  cost?: number;
  cached?: boolean;
}

export function startLLMSpan(name: string, attrs: Partial<LLMSpanAttributes> = {}): Span {
  const tracer = getTracer();
  const span = tracer.startSpan(name);
  if (attrs.provider) span.setAttribute('llm.provider', attrs.provider);
  if (attrs.model) span.setAttribute('llm.model', attrs.model);
  return span;
}

export function endLLMSpan(span: Span, attrs: LLMSpanAttributes, error?: Error): void {
  span.setAttribute('llm.provider', attrs.provider);
  span.setAttribute('llm.model', attrs.model);
  if (attrs.inputTokens != null) span.setAttribute('llm.input_tokens', attrs.inputTokens);
  if (attrs.outputTokens != null) span.setAttribute('llm.output_tokens', attrs.outputTokens);
  if (attrs.latencyMs != null) span.setAttribute('llm.latency_ms', attrs.latencyMs);
  if (attrs.cost != null) span.setAttribute('llm.cost', attrs.cost);
  if (attrs.cached != null) span.setAttribute('llm.cached', attrs.cached);

  if (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export async function shutdownTracing(): Promise<void> {
  if (provider) {
    await provider.shutdown();
  }
}
