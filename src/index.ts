#!/usr/bin/env node

/**
 * Claude Memory Manager Plugin
 * Lightweight embedded memory plugin for Claude Code
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const home = process.env.HOME || process.env.USERPROFILE || '.';
const DB_PATH = join(home, '.claude', 'memory', 'memory.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Load SQLite.js
const SQL = await initSqlJs();

// Create database from file or new database
let db: any;
if (fs.existsSync(DB_PATH)) {
  // Load existing database
  const data = fs.readFileSync(DB_PATH);
  db = new SQL.Database(data as any);
} else {
  // Create new database
  db = new SQL.Database();
}

// Enable foreign keys and WAL mode
db.run('PRAGMA foreign_keys = ON;');
db.run('PRAGMA journal_mode = WAL;');

// Create tables if they don't exist
db.run('CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project TEXT, timestamp TEXT, user_message TEXT, assistant_message TEXT, summary TEXT, embedding BLOB, tags TEXT, parent_uuid TEXT, is_sidechain INTEGER DEFAULT 0, session_id TEXT, cwd TEXT, git_branch TEXT, claude_version TEXT, thinking_level TEXT, thinking_disabled INTEGER DEFAULT 0, thinking_triggers TEXT)');
db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id TEXT, tag_id INTEGER, created_at TEXT, PRIMARY KEY (conversation_id, tag_id), FOREIGN KEY (conversation_id) REFERENCES conversations(id), FOREIGN Key (tag_id) REFERENCES tags(id))');

export function searchMemory(query: string, options: any = {}) {
  const { mode = 'semantic', limit = 10, tags = [], useEmbedding = false } = options;

  // Build WHERE clause with tag filters
  let whereClause = 'WHERE 1=1';
  const params = [];

  // Add tag filters
  if (tags && tags.length > 0) {
    const tagConditions = tags.map((tag: string) => {
      params.push(tag);
      return `EXISTS (SELECT 1 FROM tags WHERE id = (SELECT tag_id FROM tag_relations WHERE conversation_id = c.id AND created_at = (SELECT MAX(created_at) FROM tag_relations WHERE conversation_id = c.id)))`;
    });
    whereClause += ` AND (${tagConditions.join(' OR ')})`;
  }

  // Add text search condition based on mode
  if (mode === 'text') {
    // Pure text search
    whereClause += ` AND (user_message LIKE ? OR summary LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  } else if (mode === 'hybrid') {
    // Hybrid: text search OR semantic search
    whereClause += ` AND (user_message LIKE ? OR summary LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  // Default: semantic search (only if embeddings available)
  if (mode === 'semantic' && useEmbedding) {
    // Vector similarity search would go here
    // For now, fallback to timestamp-based results
    whereClause += ` AND embedding IS NOT NULL`;
  }

  // Build ORDER BY clause
  let orderByClause = 'ORDER BY timestamp DESC';

  // Final query
  const stmt = db.prepare(
    `SELECT c.id, c.project, c.summary, c.user_message, c.assistant_message, c.timestamp, datetime(c.timestamp, 'localtime') as date FROM conversations c ${whereClause} ${orderByClause} LIMIT ?`
  );

  params.push(limit);
  stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();

  return results;
}

// Generate vector embedding for semantic search
export function generateEmbedding(text: string): number[] {
  // Simple hash-based embedding for demonstration
  // In production, use a proper embedding model like OpenAI embeddings
  const hash = simpleHash(text);
  const embedding = new Array(1536).fill(0);

  // Distribute hash values across 1536 dimensions
  for (let i = 0; i < 256; i++) {
    const dim = (hash.charCodeAt(i) % 1536);
    const value = (hash.charCodeAt(i) * (i + 1) * 3) % 1000 / 1000;
    embedding[dim] = value;
  }

  return embedding;
}

// Simple hash function for embedding generation
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export function saveConversation(exchange: any) {
  const { id, project, timestamp, userMessage, assistantMessage, summary, tags = [] } = exchange;

  // Generate embedding for semantic search
  const embedding = generateEmbedding(userMessage);

  // Insert conversation with all fields including embedding and tags
  db.run(
    `INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags, parent_uuid, is_sidechain, session_id, cwd, git_branch, claude_version, thinking_level, thinking_disabled, thinking_triggers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      project,
      timestamp,
      userMessage,
      assistantMessage,
      summary,
      Buffer.from(embedding.join(',')), // Vector embedding (1536-dim array as blob)
      JSON.stringify(tags), // Tags as JSON array
      exchange.parent_uuid || null,
      exchange.is_sidechain || 0,
      exchange.session_id || null,
      exchange.cwd || null,
      exchange.git_branch || null,
      exchange.claude_version || null,
      exchange.thinking_level || null,
      exchange.thinking_disabled || 0,
      exchange.thinking_triggers || null
    ]
  );

  // Store tags separately
  if (tags && tags.length > 0) {
    // Get or create tag entries
    tags.forEach((tag: string) => {
      if (!tag.startsWith('project:') && !tag.startsWith('topic:') && !tag.startsWith('concept:') && !tag.startsWith('action:') && !tag.startsWith('error:') && !tag.startsWith('success:')) {
        // Check if tag exists
        const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag);
        if (!existingTag) {
          // Create new tag
          db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', [tag]);
        }
      }
    });
  }

  return { success: true, id };
}

export function getMemoryStatus() {
  const total = db.prepare('SELECT COUNT(*) FROM conversations').get()['0'];
  const withEmbedding = db.prepare('SELECT COUNT(*) FROM conversations WHERE embedding IS NOT NULL').get()['0'];
  const withTags = db.prepare('SELECT COUNT(*) FROM conversations WHERE tags Is Not NULL').get()['0'];
  const stmt = db.prepare('SELECT DISTINCT project, COUNT(*) as count FROM conversations GROUP BY project');
  const projects: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    projects.push({ project: row.project, count: row.count });
  }
  stmt.free();

  return {
    total,
    withEmbedding,
    withTags,
    projects: projects.map((p: any) => ({ project: p.project, count: p.count }))
  };
}

// Plugin metadata
export const pluginInfo = {
  name: 'claude-memory-manager',
  version: '1.0.0',
  description: 'Lightweight memory plugin for Claude Code',
  main: 'dist/index.js'
};

// Run if executed directly
if (import.meta.url === `file://${__filename}`) {
  console.log('Claude Memory Manager Plugin loaded');
  console.log(`Database: ${DB_PATH}`);
}
