import test from 'node:test';
import assert from 'node:assert/strict';

import { splitSqlStatements } from '../src/migrate.js';

test('keeps a $$ PL/pgSQL function body and trigger intact', () => {
  const sql = `
    -- Install the transition guard.
    CREATE FUNCTION guard_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.status = 'approved; final' THEN
        -- This comment is part of the function body.
        BEGIN
          PERFORM write_audit(NEW.id);
          NEW.note := 'keep -- this text';
        END;
      END IF;
      /* This block comment is also part of the function body. */
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER guard_status
      BEFORE UPDATE ON records
      FOR EACH ROW EXECUTE FUNCTION guard_status_transition();
  `;

  const statements = splitSqlStatements(sql);

  assert.equal(statements.length, 2);
  assert.match(statements[0], /^CREATE FUNCTION/);
  assert.match(statements[0], /PERFORM write_audit\(NEW\.id\);/);
  assert.match(statements[0], /-- This comment is part of the function body\./);
  assert.match(statements[0], /\/\* This block comment is also part of the function body\. \*\//);
  assert.match(statements[0], /END;\s*\$\$$/);
  assert.match(statements[1], /^CREATE TRIGGER/);
});

test('keeps a named dollar-quoted body intact', () => {
  const sql = `
    DO $guard$
    BEGIN
      PERFORM 'named tag; -- still text';
    END;
    $guard$;
    SELECT 1;
  `;

  const statements = splitSqlStatements(sql);

  assert.equal(statements.length, 2);
  assert.match(statements[0], /^DO \$guard\$/);
  assert.match(statements[0], /PERFORM 'named tag; -- still text';/);
  assert.match(statements[0], /\$guard\$$/);
  assert.equal(statements[1], 'SELECT 1');
});

test('still splits a plain multi-statement migration and strips comments', () => {
  const sql = `
    -- leading comment
    CREATE TABLE widgets (id integer);
    /* outside block comment */
    INSERT INTO widgets (id) VALUES (1); -- trailing comment
    UPDATE widgets SET id = 2;
  `;

  assert.deepEqual(splitSqlStatements(sql), [
    'CREATE TABLE widgets (id integer)',
    'INSERT INTO widgets (id) VALUES (1)',
    'UPDATE widgets SET id = 2',
  ]);
});

test('does not split or strip comment markers inside quoted literals', () => {
  const sql = `
    INSERT INTO messages (body) VALUES ('semi; -- literal /* literal */');
    SELECT "column;--name" FROM messages; -- outside comment
  `;

  assert.deepEqual(splitSqlStatements(sql), [
    "INSERT INTO messages (body) VALUES ('semi; -- literal /* literal */')",
    'SELECT "column;--name" FROM messages',
  ]);
});

test('throws on an unterminated block comment instead of silently dropping SQL', () => {
  // The tail after the open comment (`SELECT 2`) would otherwise be swallowed
  // silently, and the migration recorded as applied with the DDL missing.
  const sql = `
    SELECT 1;
    /* this comment is never closed
    SELECT 2;
  `;

  assert.throws(
    () => splitSqlStatements(sql),
    /Unterminated block comment/,
  );
});

test('throws on an unterminated dollar-quoted body instead of silently swallowing it', () => {
  const sql = `
    SELECT 1;
    CREATE FUNCTION broken() RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM 1;
  `;

  assert.throws(
    () => splitSqlStatements(sql),
    /Unterminated dollar-quoted string/,
  );
});

test('handles nested block comments so an inner semicolon is not a separator', () => {
  // Postgres supports nested block comments. The inner `;` inside the nested
  // comment must not split the following statement off early.
  const sql = `
    /* outer /* inner ; still comment */ back to outer ; still comment */
    SELECT 1;
    SELECT 2;
  `;

  assert.deepEqual(splitSqlStatements(sql), ['SELECT 1', 'SELECT 2']);
});
