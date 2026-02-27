/**
 * Basic Agent Example
 *
 * A simple agent with calculator and HTTP tools that can answer research questions.
 */
import { AIGateway } from '@ai-gateway-aws/sdk';
import { Agent, calculatorTool, httpTool } from '@ai-gateway-aws/agents';

async function main() {
  // Connect to the AI Gateway
  const gateway = new AIGateway({
    baseUrl: process.env.GATEWAY_URL || 'http://localhost:3100',
    apiKey: process.env.API_KEY,
  });

  // Create an agent with calculator and HTTP tools
  const agent = new Agent(
    {
      name: 'research-assistant',
      description: 'A helpful research assistant that can perform calculations and fetch data from the web.',
      model: process.env.MODEL || 'claude-3-haiku',
      tools: [calculatorTool, httpTool],
      maxIterations: 5,
    },
    gateway,
  );

  // Run the agent with a task
  const task = process.argv[2] || 'What is the square root of 144 plus the cube of 3?';
  console.log(`\nTask: ${task}\n`);

  const result = await agent.run(task);

  console.log(`Success: ${result.success}`);
  console.log(`Output: ${result.output}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Tool calls: ${result.toolCalls.length}`);

  for (const call of result.toolCalls) {
    console.log(`  - ${call.toolName}(${JSON.stringify(call.parameters)})`);
  }
}

main().catch(console.error);
