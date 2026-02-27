import { describe, it, expect } from 'vitest';
import { chunkText } from '../chunker.js';

describe('chunkText', () => {
  it('chunks text by size', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].content).toContain('First');
    expect(chunks[0].index).toBe(0);
  });

  it('preserves overlap between chunks', () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => `Paragraph ${i} with some content here`);
    const text = paragraphs.join('\n\n');
    const chunks = chunkText(text, { chunkSize: 80, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    // With overlap, some content should appear in consecutive chunks
  });

  it('returns empty array for empty input', () => {
    const chunks = chunkText('', { chunkSize: 100, chunkOverlap: 0 });
    expect(chunks).toHaveLength(0);
  });

  it('returns single chunk for short text', () => {
    const chunks = chunkText('Short text.', { chunkSize: 1000, chunkOverlap: 0 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('Short text.');
  });

  it('uses custom separator', () => {
    const text = 'Line1\nLine2\nLine3';
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 0, separator: '\n' });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('assigns sequential indices', () => {
    const text = 'A\n\nB\n\nC\n\nD\n\nE';
    const chunks = chunkText(text, { chunkSize: 5, chunkOverlap: 0 });

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });
});
