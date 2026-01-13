import OpenAI from 'openai';
import { AgentProfile, LLMProvider } from '../types';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  /**
   * Generates a completion for a specific agent.
   * Dynamically constructs the OpenAI client based on the provider config.
   */
  static async generateCompletion(
    provider: LLMProvider,
    agent: AgentProfile,
    messages: Message[],
    jsonMode: boolean = false
  ): Promise<string> {

    if (!provider.apiKey && provider.type === 'openai') {
      throw new Error(`Provider ${provider.name} is missing an API Key.`);
    }

    // Initialize Client
    // Note: dangerouslyAllowBrowser is needed because we are in a Chrome Extension environment (technically a browser),
    // but we trust the user's own keys.
    const client = new OpenAI({
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey || 'dummy', // Ollama might not need a key, but SDK requires string
      dangerouslyAllowBrowser: true
    });

    try {
      const response = await client.chat.completions.create({
        model: agent.modelString,
        messages: [
          // Inject custom system prompt if it exists, otherwise rely on the caller's messages
          ...(agent.customSystemPrompt ? [{ role: 'system' as const, content: agent.customSystemPrompt }] : []),
          ...messages
        ],
        temperature: jsonMode ? 0 : agent.parameters.temperature,
        top_p: agent.parameters.top_p,
        max_tokens: agent.parameters.max_tokens,
        response_format: jsonMode ? { type: 'json_object' } : undefined
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('LLM Call Failed:', error);
      throw new Error(`LLM Error [${agent.name}]: ${error.message}`);
    }
  }
}
