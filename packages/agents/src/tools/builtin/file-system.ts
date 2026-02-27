import type { Tool, ToolResult } from '../types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface FileSystemToolOptions {
  /** Allowed root directories. All operations are sandboxed to these paths. */
  allowedPaths: string[];
  /** Maximum file size to read in bytes (default: 1MB) */
  maxReadSize?: number;
}

function isPathAllowed(filePath: string, allowedPaths: string[]): boolean {
  const resolved = path.resolve(filePath);
  return allowedPaths.some((allowed) => resolved.startsWith(path.resolve(allowed)));
}

/**
 * Create a sandboxed file system tool.
 */
export function createFileSystemTool(options: FileSystemToolOptions): Tool {
  const maxReadSize = options.maxReadSize || 1024 * 1024;

  return {
    name: 'file_system',
    description: 'Read and write files within allowed directories. Operations: read, write, list, exists, delete.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['read', 'write', 'list', 'exists', 'delete'],
          description: 'File operation to perform',
        },
        path: { type: 'string', description: 'File or directory path' },
        content: { type: 'string', description: 'Content to write (for write operation)' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
      },
      required: ['operation', 'path'],
    },
    execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
      const operation = params.operation as string;
      const filePath = params.path as string;
      const encoding = (params.encoding as BufferEncoding) || 'utf-8';

      if (!isPathAllowed(filePath, options.allowedPaths)) {
        return { success: false, data: null, error: `Path "${filePath}" is outside allowed directories` };
      }

      try {
        switch (operation) {
          case 'read': {
            const stat = await fs.stat(filePath);
            if (stat.size > maxReadSize) {
              return { success: false, data: null, error: `File exceeds max read size (${maxReadSize} bytes)` };
            }
            const content = await fs.readFile(filePath, encoding);
            return { success: true, data: content };
          }
          case 'write': {
            const content = params.content as string;
            if (!content && content !== '') {
              return { success: false, data: null, error: 'Content is required for write operation' };
            }
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content, encoding);
            return { success: true, data: `Written ${content.length} characters to ${filePath}` };
          }
          case 'list': {
            const entries = await fs.readdir(filePath, { withFileTypes: true });
            return {
              success: true,
              data: entries.map((e: { name: string; isDirectory: () => boolean }) => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })),
            };
          }
          case 'exists': {
            try {
              await fs.access(filePath);
              return { success: true, data: true };
            } catch {
              return { success: true, data: false };
            }
          }
          case 'delete': {
            await fs.unlink(filePath);
            return { success: true, data: `Deleted ${filePath}` };
          }
          default:
            return { success: false, data: null, error: `Unknown operation: ${operation}` };
        }
      } catch (err) {
        return { success: false, data: null, error: `File system error: ${(err as Error).message}` };
      }
    },
  };
}
