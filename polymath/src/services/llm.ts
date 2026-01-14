import { AgentProfile, LLMProvider } from '../types';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  /**
   * Generates a completion using native Fetch API.
   * Compatible with OpenAI, Ollama, DeepSeek, etc.
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

    const maxRetries = 5;
    let lastError: any;

    const baseUrl = provider.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    // Some providers might already include /chat/completions in the baseUrl (user error prevention)
    // If baseUrl ends in /v1, we usually append /chat/completions
    // If user provided full path, we should respect it? Standard is to provide base URL.
    // We'll assume standard OpenAI format: BASE_URL/chat/completions
    const endpoint = `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    // Prepare Body
    const body = {
      model: agent.modelString,
      messages: [
        ...(agent.customSystemPrompt ? [{ role: 'system', content: agent.customSystemPrompt }] : []),
        ...messages
      ],
      temperature: jsonMode ? 0 : agent.parameters.temperature,
      top_p: agent.parameters.top_p,
      max_tokens: agent.parameters.max_tokens,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      stream: false
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = `HTTP ${response.status} ${response.statusText}`;
          try {
             const json = JSON.parse(errorText);
             if (json.error && json.error.message) errorMsg = json.error.message;
          } catch (e) {
             // raw text
             if (errorText) errorMsg = errorText;
          }

          throw {
            status: response.status,
            message: errorMsg,
            isHttpError: true
          };
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';

      } catch (error: any) {
        console.error(`LLM Call Failed (Attempt ${attempt}/${maxRetries}):`, error);
        lastError = error;

        // Determine if retryable
        let isRetryable = false;

        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
           // Timeout
           isRetryable = true;
        } else if (error.isHttpError) {
           // 5xx errors or 429 (Rate Limit)
           if (error.status >= 500 || error.status === 429) isRetryable = true;
        } else if (error.message) {
           const msg = error.message.toLowerCase();
           if (msg.includes('network error') ||
               msg.includes('failed to fetch') ||
               msg.includes('connection refused') ||
               msg.includes('timeout')) {
             isRetryable = true;
           }
        }

        if (attempt < maxRetries && isRetryable) {
          const delay = Math.min(Math.pow(2, attempt) * 1000, 30000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        break;
      }
    }

    throw new Error(`LLM Error [${agent.name}]: ${lastError?.message || lastError || 'Unknown error'}`);
  }
}
