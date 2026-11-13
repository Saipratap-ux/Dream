const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js','utf8');
test('app includes local persistence and safe HTML escaping',()=>{
  assert.match(app,/localStorage\.setItem\(STORE/);
  assert.match(app,/function escapeHTML/);
  assert.match(app,/replace\(\/\[&<>"'\]/);
});
test('app includes reflective archetype mapping for common dream motifs',()=>{
  for (const term of ['The Shadow','The Journey / The Seeker','The Unconscious / The Great Mother','The House as a symbol of the psyche']) assert.ok(app.includes(term));
});
test('AI provider is routed through configurable backend, not a client API key',()=>{
  assert.match(app,/window\.SOMNIA_API_BASE/);
  assert.doesNotMatch(app,/sk-[A-Za-z0-9]{12,}/);
});
test('PWA service worker and manifest are present',()=>{
  assert.ok(fs.existsSync('service-worker.js'));
  assert.ok(fs.existsSync('manifest.webmanifest'));
});
