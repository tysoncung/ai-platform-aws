import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpTool } from '../../../tools/builtin/http.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('httpTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes GET requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: 'test' }),
    });

    const result = await httpTool.execute({ url: 'https://api.example.com/data' });

    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', expect.objectContaining({ method: 'GET' }));
  });

  it('makes POST requests with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1 }),
    });

    const result = await httpTool.execute({
      url: 'https://api.example.com/items',
      method: 'POST',
      body: { name: 'test' },
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    );
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await httpTool.execute({ url: 'https://api.example.com/down' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('handles non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Server error',
    });

    const result = await httpTool.execute({ url: 'https://api.example.com/error' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });
});
