// services/scheduling/ai/types.ts
// Types for AI integration

// ============================================
// AI PROPOSAL TYPES
// ============================================

/**
 * AI's response with proposed changes
 */
export interface AIProposal {
  /** Brief analysis of the main problem */
  analysis: string
  /** List of proposed changes */
  changes: AIChange[]
  /** Confidence level 0-1 */
  confidence: number
  /** If true, AI cannot resolve without breaking rules */
  cannotResolve?: boolean
  /** Explanation of why these changes solve the problem */
  reasoning?: string
}

/**
 * A single change proposed by AI
 */
export interface AIChange {
  /** Employee ID */
  employeeId: string
  /** Day number (1-31) */
  day: number
  /** Current shift code */
  from: string
  /** Proposed new shift code */
  to: string
  /** Reason for the change */
  reason: string
}

// ============================================
// AI CONTEXT TYPES
// ============================================

/**
 * Context sent to AI for optimization
 */
export interface AIContext {
  /** System constraints/rules */
  constraints: AIConstraints
  /** Employees with their stats */
  employees: AIEmployee[]
  /** Schedule matrix as JSON: { employeeName: { "day": "shiftCode" } } */
  matrix: AIMatrix
  /** Current warnings/errors to resolve */
  warnings: AIWarning[]
  /** Month information */
  monthInfo: AIMonthInfo
  /** Daily coverage analysis */
  coverage: AICoverage
  /** Employee workload balance */
  balance: AIBalance
  /** Holidays in this month */
  holidays: number[]
}

/**
 * Schedule matrix for AI - JSON format to avoid parsing issues with 2-char shifts
 * Format: { "employeeName (employeeId)": { "1": "M", "2": "T", ... } }
 */
export type AIMatrix = Record<string, Record<string, string>>

/**
 * System constraints for AI to respect
 */
export interface AIConstraints {
  minMorningStaff: number
  minAfternoonStaff: number
  minNightStaff: number
  minNightBlock: number
  maxNightBlock: number
  minRestHours: number
  maxConsecutiveWorkDays: number
  minMonthlyLibre: number
  maxMonthlyLibre: number
}

/**
 * Employee info for AI context
 */
export interface AIEmployee {
  id: string
  name: string
  /** Formatted rules string */
  rules: string
  /** Raw rules object for detailed access */
  rulesRaw: AIEmployeeRulesRaw
  /** Current month statistics */
  stats: AIEmployeeStats
  /** Is this employee overworked compared to average */
  overworked: boolean
  /** Is this employee underworked compared to average */
  underworked: boolean
}

/**
 * Raw employee rules for AI
 */
export interface AIEmployeeRulesRaw {
  shiftPriority?: string
  fixedShift?: string
  fixedDays?: number[]
  noWeekends?: boolean
  maxShiftPerMonth?: Record<string, number>
}

/**
 * Employee statistics for AI
 */
export interface AIEmployeeStats {
  M: number
  T: number
  N: number
  L: number
  presencias: number
}

/**
 * Warning info for AI
 */
export interface AIWarning {
  type: string
  severity: string
  day?: number
  employeeId?: string
  message: string
}

/**
 * Month info for AI
 */
export interface AIMonthInfo {
  year: number
  month: number
  totalDays: number
}

/**
 * Daily coverage analysis for AI
 */
export interface AICoverage {
  /** Days with insufficient morning coverage */
  underCoveredMorning: number[]
  /** Days with insufficient afternoon coverage */
  underCoveredAfternoon: number[]
  /** Days with insufficient night coverage */
  underCoveredNight: number[]
  /** Days with excess staff (potential for optimization) */
  overCovered: number[]
}

/**
 * Employee workload balance for AI
 */
export interface AIBalance {
  /** Average presencias across all employees */
  avgPresencias: number
  /** Standard deviation of presencias */
  stdDevPresencias: number
  /** Most overworked employee ID */
  mostOverworked?: string
  /** Most underworked employee ID */
  mostUnderworked?: string
  /** Balance score 0-1 (1 = perfectly balanced) */
  balanceScore: number
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Result of validating and applying AI changes
 */
export interface AIValidationResult {
  /** All changes were valid */
  valid: boolean
  /** Changes that were applied */
  appliedChanges: AIChange[]
  /** Changes that were rejected with reasons */
  rejectedChanges: AIRejectedChange[]
}

/**
 * A rejected change with reason
 */
export interface AIRejectedChange {
  change: AIChange
  reason: string
}

// ============================================
// PROVIDER TYPES
// ============================================

/**
 * Supported AI providers
 */
export type AIProviderType = 'none' | 'claude' | 'gemini' | 'openai' | 'ollama'

/**
 * Provider-specific configuration
 */
export interface AIProviderConfig {
  /** Provider type */
  provider: AIProviderType
  /** API key (for cloud providers) */
  apiKey?: string
  /** Model name */
  model: string
  /** Temperature (0-1, lower = more consistent) */
  temperature: number
  /** Max tokens in response */
  maxTokens: number
  /** Timeout in ms */
  timeout: number
  /** Max retry attempts */
  maxRetries: number
  /** Base URL (for Ollama or custom endpoints) */
  baseUrl?: string
}

/**
 * Provider interface - all providers must implement this
 */
export interface IAIProvider {
  /** Provider name for logging */
  readonly name: string
  /** Check if provider is available (has API key, etc.) */
  isAvailable(): boolean
  /** Send prompt and get response */
  sendPrompt(prompt: string): Promise<string>
}

// ============================================
// CONFIG
// ============================================

/**
 * AI configuration (legacy - kept for compatibility)
 */
export interface AIConfig {
  /** Model to use */
  model: string
  /** Temperature (0-1, lower = more consistent) */
  temperature: number
  /** Max tokens in response */
  maxTokens: number
  /** Timeout in ms */
  timeout: number
  /** Max retry attempts */
  maxRetries: number
  /** Is AI enabled */
  enabled: boolean
}

/**
 * Default configurations per provider
 */
export const PROVIDER_DEFAULTS: Record<AIProviderType, Partial<AIProviderConfig>> = {
  none: {
    provider: 'none',
    model: '',
    temperature: 0,
    maxTokens: 0,
    timeout: 0,
    maxRetries: 0,
  },
  claude: {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000,
    maxRetries: 3,
  },
  gemini: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000,
    maxRetries: 3,
  },
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000,
    maxRetries: 3,
  },
  ollama: {
    provider: 'ollama',
    model: 'llama2:latest',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 180000, // 3 minutos - modelos locales son más lentos
    maxRetries: 2,
    baseUrl: 'http://localhost:11434',
  },
}

/**
 * Default AI configuration (legacy)
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
  enabled: true,
}
