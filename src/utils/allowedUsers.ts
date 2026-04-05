// Парсит whitelist пользователей из CSV-строки окружения.
export function parseAllowedUserIds(rawValue: string | undefined): Set<number> {
  if (!rawValue || !rawValue.trim()) {
    return new Set<number>();
  }

  const ids = rawValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
    .filter((id) => Number.isInteger(id) && id > 0);

  return new Set<number>(ids);
}

export function isAllowedUser(allowedUserIds: Set<number>, userId: number | undefined): boolean {
  if (!userId) {
    return false;
  }
  return allowedUserIds.has(userId);
}
