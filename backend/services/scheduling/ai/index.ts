// services/scheduling/ai/index.ts
// AI module exports

// Types
export type {
  AIProposal,
  AIChange,
  AIContext,
  AIConstraints,
  AIEmployee,
  AIEmployeeStats,
  AIWarning,
  AIMonthInfo,
  AIValidationResult,
  AIRejectedChange,
  AIConfig,
} from './types.js'

export { DEFAULT_AI_CONFIG } from './types.js'

// Client
export { AIClient } from './ai-client.js'

// Builders
export { buildAIContext } from './ai-context-builder.js'
export { buildPrompt } from './ai-prompt-builder.js'

// Validators
export { validateProposalStructure, validateAndApplyChanges } from './ai-proposal-validator.js'

// Logger
export { AILogger } from './ai-logger.js'
