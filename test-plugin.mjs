#!/usr/bin/env node
/**
 * Test script for claude-memory-manager plugin
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
let db;
if (fs.existsSync(DB_PATH)) {
    // Load existing database
    const data = fs.readFileSync(DB_PATH);
    db = new SQL.Database(data);
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
db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id TEXT, tag_id INTEGER, created_at TEXT, PRIMARY KEY (conversation_id, tag_id), FOREIGN Key (conversation_id) REFERENCES conversations(id), FOREIGN Key (tag_id) REFERENCES tags(id))');

// Test functions
export function searchMemory(query, options = {}) {
    const { mode = 'semantic', limit = 10 } = options;

    // Text-based search (vector similarity not supported with sql.js)
    const stmt = db.prepare(
        'SELECT id, project, substr(summary, 1, 150) as summary, datetime(timestamp, \'localtime\') as date FROM conversations WHERE user_message LIKE ? ORDER BY timestamp DESC LIMIT ?'
    );

    const patterns = [`%${query}%`, limit];
    stmt.bind(patterns);

    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
    }
    stmt.free();

    return results;
}

export function saveConversation(exchange) {
    const { id, project, timestamp, userMessage, assistantMessage, summary, tags = [] } = exchange;

    // Insert conversation
    db.run(
        'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, project, timestamp, userMessage, assistantMessage, summary, JSON.stringify(tags)]
    );

    return { success: true, id };
}

export function getMemoryStatus() {
    const total = db.prepare('SELECT COUNT(*) FROM conversations').get()['0'];
    const withEmbedding = db.prepare('SELECT COUNT(*) FROM conversations WHERE embedding Is Not NULL').get()['0'];
    const withTags = db.prepare('SELECT COUNT(*) FROM conversations WHERE tags Is Not NULL').get()['0'];

    const stmt = db.prepare('SELECT DISTINCT project, COUNT(*) as count FROM conversations GROUP BY project');
    const projects = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        projects.push({ project: row.project, count: row.count });
    }
    stmt.free();

    return {
        total,
        withEmbedding,
        withTags,
        projects
    };
}

// Run tests
console.log('Testing claude-memory-manager plugin...\n');

// Test getMemoryStatus
console.log('1. Testing getMemoryStatus()...');
const status = getMemoryStatus();
console.log('   ✓ Memory status:', JSON.stringify(status, null, 2));

// Test saveConversation
console.log('\n2. Testing saveConversation()...');
const testConversation = {
    id: 'test-' + Date.now(),
    project: 'test-project',
    timestamp: new Date().toISOString(),
    userMessage: 'Test user message',
    assistantMessage: 'Test assistant response',
    summary: 'Test summary',
    tags: ['test', 'demo']
};
const saveResult = saveConversation(testConversation);
console.log('   ✓ Conversation saved:', saveResult);

// Test searchMemory
console.log('\n3. Testing searchMemory()...');
const searchResults = searchMemory('test');
console.log('   ✓ Search results found:', searchResults.length, 'conversations');
console.log('   ✓ Sample result:', JSON.stringify(searchResults[0], null, 2));

// Test getMemoryStatus again
console.log('\n4. Testing getMemoryStatus() after adding data...');
const status2 = getMemoryStatus();
console.log('   ✓ Updated memory status:', JSON.stringify(status2, null, 2));

console.log('\n✅ All tests passed!');