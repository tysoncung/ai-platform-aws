import type { Tool, ToolResult } from '../types.js';

/**
 * HTTP request tool for making API calls.
 */
export const httpTool: Tool = {
  name: 'http_request',
  description: 'Make an HTTP request to a URL. Supports GET, POST, PUT, DELETE methods.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to request' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method (default: GET)' },
      headers: { type: 'object', description: 'Request headers as key-value pairs' },
      body: { type: 'object', description: 'Request body (will be JSON-serialized)' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
    },
    required: ['url'],
  },
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const url = params.url as string;
    const method = (params.method as string) || 'GET';
    const headers = (params.headers as Record<string, string>) || {};
    const body = params.body as Record<string, unknown> | undefined;
    const timeout = (params.timeout as number) || 30000;

    try {
      const fetchHeaders: Record<string, string> = { ...headers };
      if (body && !fetchHeaders['Content-Type']) {
        fetchHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: unknown;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: data,
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (err) {
      return { success: false, data: null, error: `HTTP request failed: ${(err as Error).message}` };
    }
  },
};
