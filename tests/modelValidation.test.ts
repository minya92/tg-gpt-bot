import { describe, expect, it } from 'vitest';
import { filterModels, isModelAllowed } from '../src/utils/modelValidation';

describe('model validation', () => {
  const models = [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', description: 'OpenAI model' },
    { id: 'mistral/mistral-large', name: 'Mistral Large', description: 'Mistral model' }
  ];

  it('validates model id by exact match', () => {
    expect(isModelAllowed('openai/gpt-4o-mini', models)).toBe(true);
    expect(isModelAllowed('openai/unknown', models)).toBe(false);
  });

  it('filters models by id, name or description', () => {
    expect(filterModels(models, 'openai').map((m) => m.id)).toEqual(['openai/gpt-4o-mini']);
    expect(filterModels(models, 'large').map((m) => m.id)).toEqual(['mistral/mistral-large']);
    expect(filterModels(models, '').length).toBe(2);
  });
});
