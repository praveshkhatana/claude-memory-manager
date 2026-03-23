#!/usr/bin/env node

/**
 * Verify restored memory data
 */

const initSqlJs = require('sql.js');
const fs = require('fs');

const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';

initSqlJs().then(SQL => {
  console.log('✓ SQL.js loaded');
  console.log('✓ Database path:', DB_PATH);
  console.log('');

  // Load database
  let db;
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Test 1: Check total count
  console.log('=== Test 1: Total Conversations ===');
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM conversations');
  while (countStmt.step()) {
    const row = countStmt.getAsObject();
    console.log(`✓ Total conversations: ${row.count}`);
  }
  countStmt.free();
  console.log('');

  // Test 2: Check embedding presence
  console.log('=== Test 2: Embedding Presence ===');
  const embeddingStmt = db.prepare('SELECT COUNT(*) as count FROM conversations WHERE embedding IS NOT NULL');
  while (embeddingStmt.step()) {
    const row = embeddingStmt.getAsObject();
    console.log(`✓ Conversations with embeddings: ${row.count}`);
  }
  embeddingStmt.free();
  console.log('');

  // Test 3: Check tags presence
  console.log('=== Test 3: Tags Presence ===');
  const tagsStmt = db.prepare('SELECT COUNT(*) as count FROM conversations WHERE tags IS Not NULL');
  while (tagsStmt.step()) {
    const row = tagsStmt.getAsObject();
    console.log(`✓ Conversations with tags: ${row.count}`);
  }
  tagsStmt.free();
  console.log('');

  // Test 4: List all conversations
  console.log('=== Test 4: All Conversations ===');
  const listStmt = db.prepare(`
    SELECT
      id,
      project,
      summary,
      substr(user_message, 1, 50) as user_preview,
      json_extract(tags, '$[0]') as first_tag,
      length(embedding) as embedding_length
    FROM conversations
    ORDER by timestamp DESC
    LIMIT 10
  `);

  let count = 0;
  while (listStmt.step()) {
    const row = listStmt.getAsObject();
    count++;
    console.log(`\n${count}. ID: ${row.id}`);
    console.log(`   Project: ${row.project}`);
    console.log(`   Summary: ${row.summary}`);
    console.log(`   First tag: ${row.first_tag}`);
    console.log(`   Embedding length: ${row.embedding_length} chars`);
  }
  listStmt.free();
  console.log('');

  // Test 5: Check tag relations
  console.log('=== Test 5: Tag Relations ===');
  const tagRelationsStmt = db.prepare('SELECT COUNT(*) as count FROM tag_relations');
  while (tagRelationsStmt.step()) {
    const row = tagRelationsStmt.getAsObject();
    console.log(`✓ Tag relations: ${row.count}`);
  }
  tagRelationsStmt.free();
  console.log('');

  // Test 6: Check projects
  console.log('=== Test 6: Projects ===');
  const projectStmt = db.prepare('SELECT DISTINCT project, COUNT(*) as count FROM conversations GROUP BY project');
  while (projectStmt.step()) {
    const row = projectStmt.getAsObject();
    console.log(`✓ Project: ${row.project} (${row.count} conversations)`);
  }
  projectStmt.free();
  console.log('');

  // Test 7: Sample embedding content
  console.log('=== Test 7: Embedding Content Sample ===');
  const sampleStmt = db.prepare(`
    SELECT
      id,
      substr(user_message, 1, 100) as message_preview,
      embedding
    FROM conversations
    LIMIT 1
  `);
  if (sampleStmt.step()) {
    const row = sampleStmt.getAsObject();
    console.log(`✓ Sample ID: ${row.id}`);
    console.log(`✓ Embedding type: ${typeof row.embedding}`);
    console.log(`✓ Embedding preview: ${row.embedding ? row.embedding.substring(0, 100) + '...' : 'NULL'}`);
  }
  sampleStmt.free();
  console.log('');

  console.log('✅ Verification complete!');
  console.log(`Database: ${DB_PATH}`);
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});