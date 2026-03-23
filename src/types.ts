/**
 * TypeScript type definitions for Memory Plugin
 */

export interface ConversationExchange {
  id: string;
  project: string;
  timestamp: string;
  userMessage: string;
  assistantMessage: string;
  summary?: string;
  embedding?: number[];
  tags?: string[];
  parentUuid?: string;
  isSidechain?: boolean;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  claudeVersion?: string;
  thinkingLevel?: string;
  thinkingDisabled?: boolean;
  thinkingTriggers?: string;
}

export interface MemorySearchQuery {
  query: string;
  mode?: 'semantic' | 'text' | 'hybrid';
  limit?: number;
  tags?: string;
}

export interface MemorySearchResult {
  exchangeId: string;
  summary: string;
  relevanceScore: number;
  tags?: string[];
  timestamp: string;
}

export interface MemoryConfig {
  defaultSearchMode: 'semantic' | 'text' | 'hybrid';
  autoIndex: boolean;
  tokenLimit: number;
  modelName: string;
}