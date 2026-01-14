import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '../services/llm';
import { AgentProfile, LLMProvider } from '../types';

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockCreate
        }
      }
    }
  }
});

describe('LLMService', () => {
  const mockProvider: LLMProvider = {
    id: 'p1',
    name: 'Test Provider',
    type: 'openai',
    baseUrl: 'https://api.test.com',
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

  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('should call OpenAI with correct parameters', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello World' } }]
    });

    const messages = [{ role: 'user' as const, content: 'Hi' }];
    const result = await LLMService.generateCompletion(mockProvider, mockAgent, messages);

    expect(result).toBe('Hello World');
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-test',
      messages: [
        { role: 'system', content: 'System Prompt' },
        { role: 'user', content: 'Hi' }
      ],
      temperature: 0.7,
      top_p: 1,
      max_tokens: 100,
      response_format: undefined
    });
  });

  it('should force JSON mode when requested', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{}' } }]
    });

    await LLMService.generateCompletion(mockProvider, mockAgent, [], true);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      temperature: 0,
      response_format: { type: 'json_object' }
    }));
  });

  it('should retry on 504 error and succeed', async () => {
    vi.useFakeTimers(); // Enable fake timers

    // Fail once with 504
    mockCreate.mockRejectedValueOnce({ status: 504, message: 'Gateway Timeout' });
    // Succeed next
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Recovered' } }]
    });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);

    // Fast-forward
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('Recovered');
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should retry on Connection error', async () => {
    vi.useFakeTimers();

    mockCreate.mockRejectedValueOnce({ message: 'Connection error' });
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Success' } }]
    });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('Success');
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should fail after max retries', async () => {
    vi.useFakeTimers();

    // Fail 5 times
    mockCreate.mockRejectedValue({ status: 500, message: 'Server Error' });

    const promise = LLMService.generateCompletion(mockProvider, mockAgent, []);

    // Fast-forward all delays
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('LLM Error [Test Agent]: Server Error');

    expect(mockCreate).toHaveBeenCalledTimes(5);

    vi.useRealTimers();
  });
});
