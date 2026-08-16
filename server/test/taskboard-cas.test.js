import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/routes/quality/taskboard.js', import.meta.url),
  'utf8'
);

function patchRouteSource() {
  const start = source.indexOf("router.patch('/v2/tasks/:date/:id'");
  const end = source.indexOf("router.delete('/v2/tasks/:date/:id'", start);
  assert.notEqual(start, -1, 'PATCH v2 task route must exist');
  assert.notEqual(end, -1, 'DELETE v2 task route must follow PATCH route');
  return source.slice(start, end);
}

test('taskboard v2 PATCH performs an atomic compare-and-swap update', () => {
  const route = patchRouteSource();
  assert.match(
    route,
    /UPDATE taskboard_tasks[\s\S]*WHERE id = \? AND version = \?/
  );
  assert.match(route, /updateResult\.changes === 0/);
});

test('a compare-and-swap loser returns the current server task as a 409', () => {
  const route = patchRouteSource();
  assert.match(route, /updateResult\.changes === 0[\s\S]*status\(409\)\.json\(/);
  assert.match(route, /serverTask/);
  assert.match(route, /serverVersion/);
  assert.match(route, /clientVersion/);
});
