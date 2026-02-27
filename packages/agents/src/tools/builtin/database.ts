import type { Tool, ToolResult } from '../types.js';
import type { MongoClient, Db, Document } from 'mongodb';

export interface DatabaseToolOptions {
  client: MongoClient;
  dbName: string;
  allowedCollections?: string[];
  readOnly?: boolean;
}

/**
 * Create a MongoDB database tool with the given connection.
 */
export function createDatabaseTool(options: DatabaseToolOptions): Tool {
  const { client, dbName, allowedCollections, readOnly = false } = options;

  const getDb = (): Db => client.db(dbName);

  const checkCollection = (collection: string): string | null => {
    if (allowedCollections && !allowedCollections.includes(collection)) {
      return `Collection "${collection}" is not in the allowed list`;
    }
    return null;
  };

  return {
    name: 'database',
    description: `Query MongoDB database. Supports find, aggregate, count${readOnly ? '' : ', updateOne, updateMany, insertOne, insertMany, deleteOne, deleteMany'} operations.`,
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: readOnly
            ? ['find', 'aggregate', 'count']
            : ['find', 'aggregate', 'count', 'updateOne', 'updateMany', 'insertOne', 'insertMany', 'deleteOne', 'deleteMany'],
          description: 'The database operation to perform',
        },
        collection: { type: 'string', description: 'The collection name' },
        filter: { type: 'object', description: 'Query filter (for find, count, update, delete)' },
        pipeline: { type: 'object', description: 'Aggregation pipeline stages (for aggregate)' },
        update: { type: 'object', description: 'Update operations (for updateOne/updateMany)' },
        document: { type: 'object', description: 'Document to insert (for insertOne)' },
        documents: { type: 'object', description: 'Documents to insert (for insertMany)' },
        sort: { type: 'object', description: 'Sort specification' },
        limit: { type: 'number', description: 'Maximum documents to return (default: 20)' },
        projection: { type: 'object', description: 'Field projection' },
      },
      required: ['operation', 'collection'],
    },
    execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
      const operation = params.operation as string;
      const collection = params.collection as string;
      const filter = (params.filter as Document) || {};
      const limit = (params.limit as number) || 20;

      const colError = checkCollection(collection);
      if (colError) return { success: false, data: null, error: colError };

      try {
        const db = getDb();
        const col = db.collection(collection);

        switch (operation) {
          case 'find': {
            const docs = await col
              .find(filter)
              .sort((params.sort as Document) || {})
              .limit(limit)
              .project((params.projection as Document) || {})
              .toArray();
            return { success: true, data: docs };
          }
          case 'aggregate': {
            const pipeline = params.pipeline as Document[];
            if (!Array.isArray(pipeline)) {
              return { success: false, data: null, error: 'Pipeline must be an array' };
            }
            const results = await col.aggregate(pipeline).toArray();
            return { success: true, data: results };
          }
          case 'count': {
            const count = await col.countDocuments(filter);
            return { success: true, data: count };
          }
          case 'updateOne': {
            const result = await col.updateOne(filter, params.update as Document);
            return { success: true, data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount } };
          }
          case 'updateMany': {
            const result = await col.updateMany(filter, params.update as Document);
            return { success: true, data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount } };
          }
          case 'insertOne': {
            const result = await col.insertOne(params.document as Document);
            return { success: true, data: { insertedId: result.insertedId } };
          }
          case 'insertMany': {
            const docs = params.documents as Document[];
            const result = await col.insertMany(docs);
            return { success: true, data: { insertedCount: result.insertedCount } };
          }
          case 'deleteOne': {
            const result = await col.deleteOne(filter);
            return { success: true, data: { deletedCount: result.deletedCount } };
          }
          case 'deleteMany': {
            const result = await col.deleteMany(filter);
            return { success: true, data: { deletedCount: result.deletedCount } };
          }
          default:
            return { success: false, data: null, error: `Unknown operation: ${operation}` };
        }
      } catch (err) {
        return { success: false, data: null, error: `Database error: ${(err as Error).message}` };
      }
    },
  };
}
