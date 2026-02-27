interface MetricCounter {
  value: number;
  labelValues: Record<string, number>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface MetricHistogram {
  sum: number;
  count: number;
  buckets: HistogramBucket[];
  labels: Record<string, { sum: number; count: number; buckets: HistogramBucket[] }>;
}

function createBuckets(boundaries: number[]): HistogramBucket[] {
  return [...boundaries, Infinity].map((le) => ({ le, count: 0 }));
}

const LATENCY_BOUNDARIES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

class MetricsRegistry {
  private counters: Record<string, MetricCounter> = {
    requests_total: { value: 0, labelValues: {} },
    tokens_total: { value: 0, labelValues: {} },
    cost_total: { value: 0, labelValues: {} },
    errors_total: { value: 0, labelValues: {} },
  };

  private histograms: Record<string, MetricHistogram> = {
    latency_seconds: {
      sum: 0,
      count: 0,
      buckets: createBuckets(LATENCY_BOUNDARIES),
      labels: {},
    },
  };

  increment(name: string, value: number = 1, labels?: { provider?: string; model?: string }): void {
    const counter = this.counters[name];
    if (!counter) return;
    counter.value += value;

    if (labels) {
      const key = `${labels.provider || ''}:${labels.model || ''}`;
      counter.labelValues[key] = (counter.labelValues[key] || 0) + value;
    }
  }

  observe(name: string, value: number, labels?: { provider?: string; model?: string }): void {
    const hist = this.histograms[name];
    if (!hist) return;
    hist.sum += value;
    hist.count += 1;
    for (const bucket of hist.buckets) {
      if (value <= bucket.le) bucket.count += 1;
    }

    if (labels) {
      const key = `${labels.provider || ''}:${labels.model || ''}`;
      if (!hist.labels[key]) {
        hist.labels[key] = { sum: 0, count: 0, buckets: createBuckets(LATENCY_BOUNDARIES) };
      }
      const lh = hist.labels[key];
      lh.sum += value;
      lh.count += 1;
      for (const bucket of lh.buckets) {
        if (value <= bucket.le) bucket.count += 1;
      }
    }
  }

  recordRequest(provider: string, model: string, inputTokens: number, outputTokens: number, cost: number, latencyMs: number, error?: boolean): void {
    const labels = { provider, model };
    this.increment('requests_total', 1, labels);
    this.increment('tokens_total', inputTokens + outputTokens, labels);
    this.increment('cost_total', cost, labels);
    this.observe('latency_seconds', latencyMs, labels);
    if (error) this.increment('errors_total', 1, labels);
  }

  getStats(): { requests: number; tokens: number; cost: number; errors: number; avgLatencyMs: number } {
    const latency = this.histograms['latency_seconds'];
    return {
      requests: this.counters['requests_total'].value,
      tokens: this.counters['tokens_total'].value,
      cost: this.counters['cost_total'].value,
      errors: this.counters['errors_total'].value,
      avgLatencyMs: latency.count > 0 ? latency.sum / latency.count : 0,
    };
  }

  toPrometheus(): string {
    const lines: string[] = [];

    for (const [name, counter] of Object.entries(this.counters)) {
      lines.push(`# HELP ai_gateway_${name} Counter for ${name}`);
      lines.push(`# TYPE ai_gateway_${name} counter`);
      lines.push(`ai_gateway_${name} ${counter.value}`);
      for (const [key, val] of Object.entries(counter.labelValues)) {
        const [provider, model] = key.split(':');
        lines.push(`ai_gateway_${name}{provider="${provider}",model="${model}"} ${val}`);
      }
    }

    for (const [name, hist] of Object.entries(this.histograms)) {
      lines.push(`# HELP ai_gateway_${name} Histogram for ${name}`);
      lines.push(`# TYPE ai_gateway_${name} histogram`);
      for (const bucket of hist.buckets) {
        const le = bucket.le === Infinity ? '+Inf' : String(bucket.le);
        lines.push(`ai_gateway_${name}_bucket{le="${le}"} ${bucket.count}`);
      }
      lines.push(`ai_gateway_${name}_sum ${hist.sum}`);
      lines.push(`ai_gateway_${name}_count ${hist.count}`);
    }

    return lines.join('\n') + '\n';
  }
}

export const metrics = new MetricsRegistry();
export default metrics;
