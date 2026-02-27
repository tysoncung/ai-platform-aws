/**
 * Auto-Tagger Agent Example
 *
 * An agent that queries a product catalog database for items without tags,
 * analyzes their descriptions, generates relevant tags, and applies them.
 */
import { MongoClient } from 'mongodb';
import { AIGateway } from '@ai-platform-aws/sdk';
import {
  Agent,
  createDatabaseTool,
  calculatorTool,
  Guardrails,
  HumanApproval,
  approveWrites,
} from '@ai-platform-aws/agents';

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'product_catalog';
  const mongoClient = new MongoClient(mongoUri);

  try {
    await mongoClient.connect();

    const gateway = new AIGateway({
      baseUrl: process.env.GATEWAY_URL || 'http://localhost:3100',
      apiKey: process.env.API_KEY,
    });

    // Create database tool with access to products collection
    const dbTool = createDatabaseTool({
      client: mongoClient,
      dbName,
      allowedCollections: ['products'],
      readOnly: false,
    });

    // Set up guardrails
    const guardrails = new Guardrails({
      blockDestructiveOps: true, // Block DELETE operations
      maxIterations: 20,
    });

    // Optional: human approval for write operations
    const approval = new HumanApproval({
      requireApproval: approveWrites(),
      handler: async (_call, description) => {
        console.log(`\n  Approval requested:\n${description}`);
        // Auto-approve in this example; in production, prompt the user
        console.log(' Auto-approved (demo mode)\n');
        return true;
      },
    });

    // Create the auto-tagger agent
    const agent = new Agent(
      {
        name: 'auto-tagger',
        description: 'Analyzes product catalog items and generates relevant tags based on their descriptions.',
        model: process.env.MODEL || 'claude-3-haiku',
        tools: [dbTool, calculatorTool],
        maxIterations: 15,
        onToolCall: async (call) => {
          const gr = await guardrails.checkToolCall(call);
          if (!gr.allowed) {
            console.log(` Guardrail blocked: ${gr.reason}`);
            return false;
          }
          return approval.requestApproval(call);
        },
        systemPrompt: `You are a product catalog auto-tagger. Your job is to:
1. Query the database for products that have empty tags arrays
2. For each untagged product, analyze its name, description, and category
3. Generate 3-5 relevant tags for each product
4. Update the product in the database with the generated tags

Tags should be lowercase, descriptive, and useful for search/filtering.
Examples: "wireless", "noise-cancelling", "eco-friendly", "portable", "premium"

Process all untagged products in the catalog.`,
      },
      gateway,
    );

    console.log('  Starting auto-tagger agent...\n');

    const result = await agent.run(
      'Find all products without tags in the products collection and add relevant tags to each one based on their description and category.',
    );

    console.log('\n--- Result ---');
    console.log(`Success: ${result.success}`);
    console.log(`Output: ${result.output}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Tool calls: ${result.toolCalls.length}`);

    // Verify results
    const db = mongoClient.db(dbName);
    const products = await db
      .collection('products')
      .find({}, { projection: { name: 1, tags: 1 } })
      .toArray();

    console.log('\n--- Updated Products ---');
    for (const p of products) {
      const tags = (p.tags as string[]) || [];
      console.log(`  ${p.name}: ${tags.length > 0 ? tags.join(', ') : '(no tags)'}`);
    }
  } finally {
    await mongoClient.close();
  }
}

main().catch(console.error);
