// services/scheduling/utils/randomization.ts
// Randomization utilities for schedule generation

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Get random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Pick a random element from array
 */
export function randomChoice<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  return array[randomInt(0, array.length - 1)]
}

/**
 * Pick N random elements from array (without replacement)
 */
export function randomSample<T>(array: T[], n: number): T[] {
  const shuffled = shuffle(array)
  return shuffled.slice(0, Math.min(n, array.length))
}

/**
 * Return true with given probability (0-1)
 */
export function randomChance(probability: number): boolean {
  return Math.random() < probability
}

/**
 * Weighted random selection
 * @param items Array of items with weights
 * @returns Selected item or undefined if empty
 */
export function weightedRandom<T>(items: { item: T; weight: number }[]): T | undefined {
  if (items.length === 0) return undefined
  
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0)
  if (totalWeight === 0) return randomChoice(items.map(i => i.item))
  
  let random = Math.random() * totalWeight
  
  for (const { item, weight } of items) {
    random -= weight
    if (random <= 0) return item
  }
  
  return items[items.length - 1].item
}
