import { describe, it, expect, vi } from 'vitest';
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
});
