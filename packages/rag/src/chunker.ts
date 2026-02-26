import type { ChunkOptions, TextChunk } from './types.js';

export function chunkText(text: string, options: ChunkOptions): TextChunk[] {
  const { chunkSize, chunkOverlap, separator = '\n\n' } = options;
  const chunks: TextChunk[] = [];

  const paragraphs = text.split(separator);
  let current = '';
  let index = 0;

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > chunkSize && current.length > 0) {
      chunks.push({
        content: current.trim(),
        index: index++,
        metadata: {},
      });

      // Keep overlap
      const words = current.split(' ');
      const overlapWords = Math.ceil((chunkOverlap / chunkSize) * words.length);
      current = words.slice(-overlapWords).join(' ') + separator + paragraph;
    } else {
      current = current ? current + separator + paragraph : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push({
      content: current.trim(),
      index: index++,
      metadata: {},
    });
  }

  return chunks;
}

export function chunkByTokenEstimate(text: string, maxTokens: number, overlap: number = 100): TextChunk[] {
  // Rough estimate: 1 token ≈ 4 characters
  return chunkText(text, {
    chunkSize: maxTokens * 4,
    chunkOverlap: overlap * 4,
  });
}
