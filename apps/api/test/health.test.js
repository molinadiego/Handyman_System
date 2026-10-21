import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { app } from '../src/app.js';

test('GET /health reports that the API is running', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');

  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'handy-api');
});

test('unknown routes return a structured 404', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');

  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});
