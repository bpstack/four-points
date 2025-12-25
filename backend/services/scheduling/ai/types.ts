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
  /** Schedule matrix in readable format */
  matrix: string
  /** Current warnings/errors to resolve */
  warnings: AIWarning[]
  /** Month information */
  monthInfo: AIMonthInfo
}

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
  /** Current month statistics */
  stats: AIEmployeeStats
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
// CONFIG
// ============================================

/**
 * AI configuration
 */
export interface AIConfig {
  /** Claude model to use */
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
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
  enabled: true,
}
