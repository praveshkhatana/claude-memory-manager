#!/usr/bin/env node

/**
 * Test script to verify database operations work
 */

const initSqlJs = require('sql.js');
const path = require('path');

const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';

initSqlJs().then(SQL => {
  console.log('SQL.js loaded successfully');
  console.log('Database path:', DB_PATH);

  // Test database operations
  const db = new SQL.Database();

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Test insert
  db.run('CREATE TABLE IF NOT EXISTS test (id TEXT, value TEXT)');

  db.run('INSERT INTO test (id, value) VALUES (?, ?)', ['test-1', 'hello world']);

  // Test query
  const stmt = db.prepare('SELECT * FROM test');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log('Query result:', row);
  }
  stmt.free();

  console.log('\n✅ Database operations working correctly');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});