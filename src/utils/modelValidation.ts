import { OpenRouterModel } from '../types';

export function isModelAllowed(modelId: string, models: OpenRouterModel[]): boolean {
  return models.some((model) => model.id === modelId);
}

export function filterModels(models: OpenRouterModel[], rawFilter: string): OpenRouterModel[] {
  const filter = rawFilter.trim().toLowerCase();
  if (!filter) {
    return models;
  }

  return models.filter((model) => {
    const name = model.name?.toLowerCase() ?? '';
    const id = model.id.toLowerCase();
    const description = model.description?.toLowerCase() ?? '';
    return name.includes(filter) || id.includes(filter) || description.includes(filter);
  });
}
