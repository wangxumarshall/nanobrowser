import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from '../services/llm';
import { AgentProfile, LLMProvider } from '../types';

describe('LLMService (Fetch Implementation)', () => {
  const mockProvider: LLMProvider = {
    id: 'p1',
    name: 'Test Provider',
    type: 'openai',
    baseUrl: 'https://api.test.com/v1',
    apiKey: 'sk-test'
  };

  const mockAgent: AgentProfile = {
    id: 'a1',
    name: 'Test Agent',
    providerId: 'p1',
    modelString: 'gpt-test',
    parameters: { temperature: 0.7, top_p: 1, max_tokens: 100 },
    customSystemPrompt: 'System Prompt'
  };

  const globalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = globalFetch;
    vi.useRealTimers();
  });

  it('should call fetch with correct parameters', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello World' } }]
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const messages = [{ role: 'user' as const, content: 'Hi' }];
    const promise = LLMService.generateCompletion(mockProvider, mockAgent, messages);

    // Fetch should happen immediately, no delay
    const result = await promise;

    expect(result).toBe('Hello World');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-test'
        },
        body: JSON.stringify({
          model: 'gpt-test',
          messages: [
            { role: 'system', content: 'System Prompt' },
            { role: 'user', content: 'Hi' }
          ],
          temperature: 0.7,
          top_p: 1,
          max_tokens: 100,
          stream: false
        })
      })
    );
  });

  it('should retry on 500 error and succeed', async () => {
    // Fail once
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'Internal Error'
    });
    // Succeed next
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Recovered' } }] })
    });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);

    // Fast-forward delay
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('Recovered');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    // Fail 5 times
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'Overloaded'
    });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('LLM Error [Test Agent]: Overloaded');
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it('should retry on network failure (throw)', async () => {
    // Throw network error once
    (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));
    // Succeed next
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Network Recovered' } }] })
    });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('Network Recovered');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
