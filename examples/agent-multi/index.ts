/**
 * Multi-Agent Pipeline Example
 *
 * Three agents work in sequence:
 * 1. Researcher - gathers information
 * 2. Writer - drafts content based on research
 * 3. Reviewer - reviews and improves the content
 */
import { AIGateway } from '@ai-platform-aws/sdk';
import { Agent, Orchestrator, httpTool, calculatorTool } from '@ai-platform-aws/agents';

async function main() {
  const gateway = new AIGateway({
    baseUrl: process.env.GATEWAY_URL || 'http://localhost:3100',
    apiKey: process.env.API_KEY,
  });

  const model = process.env.MODEL || 'claude-3-haiku';

  // Create specialized agents
  const researcher = new Agent(
    {
      name: 'researcher',
      description: 'Gathers information and data on a topic using web searches and calculations.',
      model,
      tools: [httpTool, calculatorTool],
      maxIterations: 5,
      systemPrompt: 'You are a research specialist. Gather key facts, statistics, and insights on the given topic. Be thorough and cite sources.',
    },
    gateway,
  );

  const writer = new Agent(
    {
      name: 'writer',
      description: 'Takes research and writes clear, engaging content.',
      model,
      tools: [],
      maxIterations: 3,
      systemPrompt: 'You are a content writer. Take the research provided and write a clear, well-structured article. Use headers, bullet points, and engaging language.',
    },
    gateway,
  );

  const reviewer = new Agent(
    {
      name: 'reviewer',
      description: 'Reviews content for accuracy, clarity, and quality.',
      model,
      tools: [],
      maxIterations: 3,
      systemPrompt: 'You are an editor and reviewer. Review the content for accuracy, clarity, grammar, and overall quality. Provide the improved version.',
    },
    gateway,
  );

  // Create orchestrator and register agents
  const orchestrator = new Orchestrator({
    gateway,
    model,
  });

  orchestrator.addAgent(researcher);
  orchestrator.addAgent(writer);
  orchestrator.addAgent(reviewer);

  // Run as a pipeline: researcher → writer → reviewer
  const topic = process.argv[2] || 'The impact of renewable energy on global economics';
  console.log(`\nTopic: ${topic}\n`);
  console.log('Running pipeline: researcher → writer → reviewer\n');

  const result = await orchestrator.pipeline(topic, ['researcher', 'writer', 'reviewer']);

  console.log('--- Final Output ---');
  console.log(result.output);
  console.log('\n--- Stats ---');
  console.log(`Success: ${result.success}`);
  console.log(`Total iterations: ${result.iterations}`);
  console.log(`Total tool calls: ${result.toolCalls.length}`);
}

main().catch(console.error);
