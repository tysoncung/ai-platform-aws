import { MongoClient, type Collection, type Db } from 'mongodb';
import type { PromptTemplate, RenderedPrompt } from './types.js';

export class PromptManager {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<PromptTemplate> | null = null;

  constructor(
    private url: string,
    private database: string,
  ) {
    this.client = new MongoClient(url);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.database);
    this.collection = this.db.collection<PromptTemplate>('prompt_templates');
    await this.collection.createIndex({ name: 1, version: -1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async create(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    const now = new Date();
    const doc: PromptTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.collection!.insertOne(doc as never);
    return doc;
  }

  async getLatest(name: string): Promise<PromptTemplate | null> {
    return this.collection!.findOne(
      { name },
      { sort: { version: -1 } },
    ) as Promise<PromptTemplate | null>;
  }

  async getVersion(name: string, version: number): Promise<PromptTemplate | null> {
    return this.collection!.findOne({ name, version }) as Promise<PromptTemplate | null>;
  }

  async render(name: string, variables: Record<string, string>, version?: number): Promise<RenderedPrompt> {
    const template = version
      ? await this.getVersion(name, version)
      : await this.getLatest(name);

    if (!template) throw new Error(`Template not found: ${name}`);

    let content = template.template;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }

    return {
      content,
      templateId: template.id,
      version: template.version,
    };
  }

  async list(): Promise<PromptTemplate[]> {
    return this.collection!.find().sort({ name: 1, version: -1 }).toArray() as Promise<PromptTemplate[]>;
  }
}
