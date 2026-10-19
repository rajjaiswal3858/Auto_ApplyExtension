// Tests the role gate as wired into the Auto Apply orchestrator (autoapply.js), including the
// pre-submit validation. Ollama is replaced by a fake fetch, so no model and no browser is needed:
//
//   node tests/autoapply-role-gate.test.js
var assert = require('assert');
var fs = require('fs');
var path = require('path');

// ---------- minimal side-panel environment ----------
global.window = global;
global.document = { getElementById: function() { return { value: 'qwen2.5:3b' }; } };
var noListener = { addListener: function() {} };
global.chrome = {
  storage: { local: { get: function() { return Promise.resolve({}); }, set: function() { return Promise.resolve(); } } },
  tabs: { onUpdated: noListener, onRemoved: noListener },
  runtime: { onMessage: noListener },
  debugger: { onEvent: noListener, onDetach: noListener }
};

var fetchCalls = [];
var fetchImpl = null;
global.fetch = function(url, opts) {
  fetchCalls.push({ url: url, body: JSON.parse(opts.body) });
  return fetchImpl(url, opts);
};
function respondWith(obj) {
  fetchImpl = function() {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve({ message: { content: JSON.stringify(obj) } }); } });
  };
}
function respondRaw(text) {
  fetchImpl = function() {
    return Promise.resolve({ ok: true, json: function() { return Promise.resolve({ message: { content: text } }); } });
  };
}
function failWith(message) {
  fetchImpl = function() { return Promise.reject(new Error(message)); };
}

require('../role-match.js');                                          // -> window.RoleMatch
var dir = path.join(__dirname, '..');
new Function(fs.readFileSync(path.join(dir, 'autoapply.js'), 'utf8'))(); // -> window.AutoApply

var RoleMatch = global.window.RoleMatch;
var AA = global.window.AutoApply;

// ---------- fixtures ----------
var ROLE = RoleMatch.parseRole('Generative AI Engineer');

var GENAI = {
  id: '1', title: 'Generative AI Engineer', company: 'Acme AI',
  description: 'Build LLM features: RAG pipelines, fine-tuning, prompt engineering, model inference. ' +
    'Required: Python, PyTorch, LangChain, embeddings, Hugging Face transformers.'
};
var FRONTEND = {
  id: '2', title: 'Frontend Developer', company: 'Acme AI',
  description: 'Build responsive UI in React and Next.js, Redux state, Tailwind CSS, WCAG accessibility. ' +
    'Required: JavaScript, TypeScript, React, HTML, CSS, REST APIs, Git.'
};
var MATCH_REPLY = { job_discipline: 'generative AI engineering', verdict: 'match', confidence: 0.94, reason: 'same role' };

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

// ---------- roleGate ----------

test('roleGate applies to a job that is the selected role', async function() {
  fetchCalls = [];
  respondWith(MATCH_REPLY);
  var d = await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description);
  assert.strictEqual(d.apply, true, d.reason);
  assert.strictEqual(fetchCalls.length, 1, 'the model should have been consulted');
});

test('roleGate sends the posting and the strict schema to Ollama', async function() {
  fetchCalls = [];
  respondWith(MATCH_REPLY);
  await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description);
  var body = fetchCalls[0].body;
  assert.deepStrictEqual(body.format.properties.verdict.enum, ['match', 'mismatch', 'unsure']);
  assert.strictEqual(body.options.temperature, 0);
  var user = body.messages[1].content;
  assert.ok(user.indexOf('Generative AI Engineer') >= 0);
  assert.ok(user.indexOf('RAG pipelines') >= 0, 'the required skills / responsibilities must be sent');
});

test('roleGate rejects an unrelated job without spending a model call', async function() {
  fetchCalls = [];
  respondWith(MATCH_REPLY); // the model would say yes - it is never asked
  var d = await AA._roleGate(ROLE, FRONTEND, FRONTEND.title, FRONTEND.description);
  assert.strictEqual(d.apply, false, d.reason);
  assert.strictEqual(d.stage, 'rules');
  assert.strictEqual(fetchCalls.length, 0, 'an obvious mismatch should not reach the model');
});

test('roleGate skips the job when Ollama is unreachable', async function() {
  failWith('Failed to fetch');
  var d = await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description);
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-unavailable');
});

test('roleGate skips the job when Ollama returns non-JSON', async function() {
  respondRaw('Sure! This job looks like a great fit for you.');
  var d = await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description);
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-unavailable'); // JSON.parse throws inside the Ollama call
});

test('roleGate skips the job when Ollama returns an unusable verdict', async function() {
  respondWith({ verdict: 'maybe', confidence: 0.9, job_discipline: 'ai', reason: '' });
  var d = await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description);
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-invalid');
});

test('roleGate skips the job when the model is unsure or unconfident', async function() {
  respondWith({ verdict: 'unsure', confidence: 0.99, job_discipline: 'unclear', reason: 'truncated' });
  assert.strictEqual((await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description)).apply, false);
  respondWith({ verdict: 'match', confidence: 0.3, job_discipline: 'generative ai', reason: 'guess' });
  assert.strictEqual((await AA._roleGate(ROLE, GENAI, GENAI.title, GENAI.description)).apply, false);
});

test('roleGate refuses to run without a selected role', async function() {
  var d = await AA._roleGate(RoleMatch.parseRole(''), GENAI, GENAI.title, GENAI.description);
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'role');
});

// ---------- assertRole: the check inside the apply path, before submitting ----------

test('assertRole blocks a job that never passed the role gate', function() {
  var job = { title: GENAI.title, company: GENAI.company, roleSpec: ROLE }; // roleVerified missing
  var r = AA._assertRole(job);
  assert.strictEqual(r.ok, false);
  assert.ok(/did not pass the role check/.test(r.reason), r.reason);
});

test('assertRole blocks a job with no selected role at all', function() {
  var r = AA._assertRole({ title: GENAI.title, roleVerified: true });
  assert.strictEqual(r.ok, false);
  assert.ok(/no selected role/.test(r.reason), r.reason);
});

test('assertRole passes a verified job', function() {
  var job = {
    title: GENAI.title, company: GENAI.company, roleSpec: ROLE,
    roleVerified: true, roleDescription: GENAI.description
  };
  assert.strictEqual(AA._assertRole(job).ok, true);
});

test('assertRole blocks when the application page shows a different role', function() {
  // The card said one thing, the form page says another (re-used listing, redirect, wrong card).
  var job = {
    title: GENAI.title, company: GENAI.company, roleSpec: ROLE,
    roleVerified: true, roleDescription: GENAI.description
  };
  var r = AA._assertRole(job, 'Frontend Developer', FRONTEND.description);
  assert.strictEqual(r.ok, false);
  assert.ok(/Role validation failed before submit/.test(r.reason), r.reason);
});

// ---------- runner ----------
(async function() {
  var failed = 0;
  for (var i = 0; i < tests.length; i++) {
    try {
      await tests[i].fn();
      console.log('  PASS  ' + tests[i].name);
    } catch (e) {
      failed++;
      console.log('  FAIL  ' + tests[i].name + '\n        ' + (e && e.message ? e.message : e));
    }
  }
  console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
  process.exit(failed ? 1 : 0);
})();
