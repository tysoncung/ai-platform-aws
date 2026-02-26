export interface PromptTemplate {
  id: string;
  name: string;
  version: number;
  template: string;
  variables: string[];
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderedPrompt {
  content: string;
  templateId: string;
  version: number;
}
