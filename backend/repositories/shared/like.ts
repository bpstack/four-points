// repositories/shared/like.ts

// LIKE '%...%' pattern for user text: escapes the wildcards so "%%" or "_"
// match literally instead of listing every row; backslash is MySQL's default
// LIKE escape character
export function likeContains(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
