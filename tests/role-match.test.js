// Tests for the role-matching gate. No dependencies, no build step:
//
//   node tests/role-match.test.js
//
// The LLM half of the gate is stubbed, because what is under test is the decision logic, not the
// model: every test states what the model replied (including "it did not reply at all").
var assert = require('assert');
var RoleMatch = require('../role-match.js');

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

// ---------- fixtures ----------

var GENAI_ROLE = 'Generative AI Engineer';

// A real match for the selected role.
var GENAI_JOB = {
  title: 'Generative AI Engineer',
  company: 'Acme AI',
  description: [
    'Build and ship LLM-powered features end to end.',
    'Responsibilities: design RAG pipelines over our document corpus, fine-tuning and evaluation of',
    'open-weight models, prompt engineering, and deploying model inference services.',
    'Required skills: Python, PyTorch, LangChain, vector databases, embeddings, Hugging Face transformers.',
    'Nice to have: MLOps experience, AWS, Docker.'
  ].join('\n')
};

// The jobs the user complained about - each one shares a generic skill with the role.
var FRONTEND_JOB = {
  title: 'Frontend Developer',
  company: 'Acme AI',
  description: [
    'We are an AI-first company. You will join the frontend team.',
    'Responsibilities: build responsive UI in React and Next.js, manage state with Redux,',
    'write CSS/Tailwind, ensure cross-browser support and web accessibility (WCAG).',
    'Required skills: JavaScript, TypeScript, React, HTML, CSS, REST APIs, Git.',
    'You will integrate our AI chat widget into the product.'
  ].join('\n')
};

var BACKEND_JOB = {
  title: 'Backend Developer (Python)',
  company: 'Fintech Co',
  description: [
    'Responsibilities: design and build microservices, REST and GraphQL APIs, and background jobs.',
    'Required skills: Python, Django, FastAPI, PostgreSQL, Redis, Docker, Kubernetes, AWS.',
    'Experience with message queues (RabbitMQ) and server-side performance tuning.'
  ].join('\n')
};

var DATA_ANALYST_JOB = {
  title: 'Data Analyst',
  company: 'Retail Group',
  description: [
    'Responsibilities: build dashboards and reports, track KPIs, support business stakeholders.',
    'Required skills: SQL, Advanced Excel, Power BI or Tableau, Python for data wrangling.',
    'Business intelligence and reporting experience preferred.'
  ].join('\n')
};

var ML_JOB = {
  title: 'Machine Learning Engineer',
  company: 'Scale Labs',
  description: [
    'Responsibilities: train and deploy deep learning models, own model evaluation and inference.',
    'You will work on NLP and large language model fine-tuning for our search product.',
    'Required skills: Python, PyTorch, transformers, MLOps, feature engineering.'
  ].join('\n')
};

// Honest trap: an AI-flavoured title on a job that is really frontend work.
var AI_TITLED_FRONTEND_JOB = {
  title: 'AI Product Frontend Developer',
  company: 'Startup',
  description: 'Build React components for our AI chat product. CSS, Tailwind, responsive design.'
};

var GOOD_LLM = { job_discipline: 'generative AI engineering', verdict: 'match', confidence: 0.93, reason: 'Same role' };

function decide(role, job, llm, llmError) {
  return RoleMatch.decide({
    roleSpec: RoleMatch.parseRole(role),
    title: job.title,
    company: job.company,
    description: job.description,
    llmRaw: llm,
    llmError: llmError
  });
}

// ---------- parsing the user's selected role (requirement 4: any role works) ----------

test('parseRole derives the discipline of the selected role', function() {
  assert.deepStrictEqual(RoleMatch.parseRole('Generative AI Engineer').families, ['ai-ml']);
  assert.strictEqual(RoleMatch.parseRole('Frontend Developer').primaryFamily, 'frontend');
  assert.strictEqual(RoleMatch.parseRole('Data Analyst').primaryFamily, 'data-analytics');
  assert.strictEqual(RoleMatch.parseRole('Senior DevOps Engineer').primaryFamily, 'devops');
  assert.strictEqual(RoleMatch.parseRole('iOS Developer').primaryFamily, 'mobile');
  assert.strictEqual(RoleMatch.parseRole('QA Automation Engineer').primaryFamily, 'qa');
});

test('parseRole keeps only the role-defining words', function() {
  var spec = RoleMatch.parseRole('Senior Generative AI Engineer (Remote)');
  assert.deepStrictEqual(spec.distinctiveTokens, ['generative', 'ai']);
  assert.ok(spec.valid);
});

test('parseRole copes with a role outside the taxonomy', function() {
  var spec = RoleMatch.parseRole('Technical Writer');
  assert.deepStrictEqual(spec.families.length ? spec.primaryFamily : null, 'content');
  var exotic = RoleMatch.parseRole('Beekeeping Supervisor');
  assert.strictEqual(exotic.primaryFamily, null);
  assert.ok(exotic.distinctiveTokens.indexOf('beekeeping') >= 0);
  assert.ok(exotic.valid);
});

test('an empty selected role is never a match', function() {
  var spec = RoleMatch.parseRole('   ');
  assert.strictEqual(spec.valid, false);
  assert.strictEqual(decide('   ', GENAI_JOB, GOOD_LLM).apply, false);
});

// ---------- title screen: the cheap gate run on every search-result card ----------

test('title screen accepts the selected role and its synonyms', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  ['Generative AI Engineer', 'Senior Generative AI Engineer', 'GenAI Engineer',
   'LLM Engineer', 'Machine Learning Engineer', 'AI/ML Engineer', 'NLP Engineer'
  ].forEach(function(t) {
    assert.notStrictEqual(RoleMatch.screenTitle(spec, t).verdict, 'reject', t + ' should not be rejected');
  });
});

test('title screen rejects the unrelated roles that boards return anyway', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  ['Frontend Developer', 'Backend Developer', 'Data Analyst', 'React Developer',
   'Java Backend Engineer', 'DevOps Engineer', 'QA Automation Engineer', 'Android Developer',
   'UI/UX Designer', 'Business Analyst', 'Technical Support Engineer', 'Accountant',
   'Digital Marketing Executive', 'Power BI Developer'
  ].forEach(function(t) {
    var r = RoleMatch.screenTitle(spec, t);
    assert.strictEqual(r.verdict, 'reject', t + ' should be rejected, got ' + r.verdict + ': ' + r.reason);
  });
});

test('an AI-flavoured title on another discipline is still rejected', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  assert.strictEqual(RoleMatch.screenTitle(spec, 'AI Product Frontend Developer').verdict, 'reject');
  assert.strictEqual(RoleMatch.screenTitle(spec, 'Full Stack Developer - AI Team').verdict, 'reject');
});

test('title screen works the other way round too (role = Frontend Developer)', function() {
  var spec = RoleMatch.parseRole('Frontend Developer');
  assert.strictEqual(RoleMatch.screenTitle(spec, 'React Developer').verdict, 'accept');
  assert.strictEqual(RoleMatch.screenTitle(spec, 'Generative AI Engineer').verdict, 'reject');
  assert.strictEqual(RoleMatch.screenTitle(spec, 'Data Engineer').verdict, 'reject');
});

test('whole-word matching: no false hits on substrings', function() {
  var spec = RoleMatch.parseRole('Frontend Developer');
  // "reactor"/"reaction" must not read as React
  assert.notStrictEqual(RoleMatch.screenTitle(spec, 'Nuclear Reactor Technician').verdict, 'accept');
});

// ---------- job screen: title + description + responsibilities + required skills ----------

test('job screen accepts a genuine posting for the selected role', function() {
  var r = RoleMatch.screenJob(RoleMatch.parseRole(GENAI_ROLE), GENAI_JOB.title, GENAI_JOB.description);
  assert.strictEqual(r.verdict, 'accept', r.reason);
});

test('job screen rejects unrelated postings that share Python/SQL (requirement 3)', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  [FRONTEND_JOB, BACKEND_JOB, DATA_ANALYST_JOB, AI_TITLED_FRONTEND_JOB].forEach(function(job) {
    var r = RoleMatch.screenJob(spec, job.title, job.description);
    assert.strictEqual(r.verdict, 'reject', job.title + ' should be rejected, got ' + r.verdict + ': ' + r.reason);
  });
});

test('generic skills are never counted as role evidence', function() {
  var sig = RoleMatch.familySignals('Python SQL Git Docker Kubernetes AWS Linux agile REST API');
  assert.deepStrictEqual(Object.keys(sig.counts), [],
    'generic tooling produced discipline signals: ' + JSON.stringify(sig.counts));
});

test('a job that only name-drops the field is not that role', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  var job = {
    title: 'Software Engineer',
    description: 'Join our AI-powered startup. You will build REST APIs in Java and Spring Boot, ' +
      'work with microservices, PostgreSQL and Kubernetes. Our product uses machine learning.'
  };
  var r = RoleMatch.screenJob(spec, job.title, job.description);
  assert.strictEqual(r.verdict, 'reject', r.reason);
});

test('a missing description never upgrades a job to accepted', function() {
  var spec = RoleMatch.parseRole(GENAI_ROLE);
  var r = RoleMatch.screenJob(spec, 'Generative AI Engineer', '');
  assert.strictEqual(r.verdict, 'uncertain', r.reason);
});

// ---------- model-reply validation (requirement 5) ----------

test('validateVerdict accepts a well-formed reply and normalises percent confidence', function() {
  var ok = RoleMatch.validateVerdict({ job_discipline: 'ai', verdict: 'MATCH', confidence: 85, reason: 'x' });
  assert.ok(ok.ok);
  assert.strictEqual(ok.verdict.verdict, 'match');
  assert.strictEqual(ok.verdict.confidence, 0.85);
});

test('validateVerdict rejects every malformed reply', function() {
  [null, undefined, 'match', 42, [], {}, { verdict: 'yes', confidence: 1 },
   { verdict: 'match' }, { verdict: 'match', confidence: 'very' },
   { verdict: 'match', confidence: -1 }, { verdict: 'match', confidence: 500 }
  ].forEach(function(raw) {
    assert.strictEqual(RoleMatch.validateVerdict(raw).ok, false,
      'should have been rejected: ' + JSON.stringify(raw));
  });
});

// ---------- decide(): both gates must agree ----------

test('decide applies to a relevant job when both gates agree', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, GOOD_LLM);
  assert.strictEqual(d.apply, true, d.reason);
  assert.strictEqual(d.stage, 'ok');
});

test('decide applies to an adjacent-title job the model confirms', function() {
  var d = decide(GENAI_ROLE, ML_JOB, GOOD_LLM);
  assert.strictEqual(d.apply, true, d.reason);
});

test('decide skips irrelevant jobs even when the model says match', function() {
  [FRONTEND_JOB, BACKEND_JOB, DATA_ANALYST_JOB, AI_TITLED_FRONTEND_JOB].forEach(function(job) {
    var d = decide(GENAI_ROLE, job, GOOD_LLM);
    assert.strictEqual(d.apply, false, job.title + ' was approved: ' + d.reason);
    assert.strictEqual(d.stage, 'rules');
  });
});

test('decide skips when Ollama is unavailable (requirement 5)', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, null, 'Failed to fetch');
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-unavailable');
  assert.ok(/Failed to fetch/.test(d.reason));
});

test('decide skips when Ollama returns an invalid response', function() {
  [{ verdict: 'probably', confidence: 0.9 }, 'not json', null, {}].forEach(function(raw) {
    var d = decide(GENAI_ROLE, GENAI_JOB, raw);
    assert.strictEqual(d.apply, false, JSON.stringify(raw) + ' was approved');
    assert.strictEqual(d.stage, 'llm-invalid');
  });
});

test('decide skips when the model is unsure', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, { job_discipline: 'unclear', verdict: 'unsure', confidence: 0.9, reason: 'vague posting' });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm');
});

test('decide skips a low-confidence match', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, { job_discipline: 'generative ai', verdict: 'match', confidence: 0.4, reason: 'maybe' });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-confidence');
});

test('decide skips when the model contradicts itself', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, {
    job_discipline: 'frontend web development', verdict: 'match', confidence: 0.99, reason: 'uses Python'
  });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm-contradiction');
});

test('decide skips a mismatch verdict', function() {
  var d = decide(GENAI_ROLE, GENAI_JOB, { job_discipline: 'data analytics', verdict: 'mismatch', confidence: 0.95, reason: 'different role' });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.stage, 'llm');
});

// ---------- the same logic for other selected roles (requirement 4) ----------

test('role matching is dynamic: every selected role gets its own gate', function() {
  var cases = [
    { role: 'Frontend Developer', job: FRONTEND_JOB, discipline: 'frontend web development', apply: true },
    { role: 'Frontend Developer', job: GENAI_JOB, discipline: 'generative AI engineering', apply: false },
    { role: 'Data Analyst', job: DATA_ANALYST_JOB, discipline: 'business intelligence', apply: true },
    { role: 'Data Analyst', job: GENAI_JOB, discipline: 'generative AI engineering', apply: false },
    { role: 'Data Analyst', job: FRONTEND_JOB, discipline: 'frontend web development', apply: false },
    { role: 'Backend Developer', job: BACKEND_JOB, discipline: 'backend services', apply: true },
    { role: 'Backend Developer', job: FRONTEND_JOB, discipline: 'frontend web development', apply: false },
    { role: 'Machine Learning Engineer', job: ML_JOB, discipline: 'machine learning', apply: true },
    { role: 'Machine Learning Engineer', job: DATA_ANALYST_JOB, discipline: 'business intelligence', apply: false }
  ];
  cases.forEach(function(c) {
    var d = decide(c.role, c.job, {
      job_discipline: c.discipline, verdict: 'match', confidence: 0.92, reason: 'model says match'
    });
    assert.strictEqual(d.apply, c.apply,
      '"' + c.role + '" vs "' + c.job.title + '" expected apply=' + c.apply + ', got ' + d.apply + ' (' + d.reason + ')');
  });
});

// ---------- the prompt sent to Ollama ----------

test('the classifier prompt carries the role, title and the posting itself', function() {
  var p = RoleMatch.buildClassifierPrompt(RoleMatch.parseRole(GENAI_ROLE), GENAI_JOB);
  assert.ok(p.user.indexOf(GENAI_ROLE) >= 0);
  assert.ok(p.user.indexOf('Generative AI Engineer') >= 0);
  assert.ok(p.user.indexOf('RAG pipelines') >= 0);
  assert.ok(/strict/i.test(p.system), 'the system prompt must not invite leniency');
  assert.ok(/not a match/i.test(p.system), 'the system prompt must discount generic shared skills');
  assert.deepStrictEqual(RoleMatch.VERDICT_SCHEMA.properties.verdict.enum, ['match', 'mismatch', 'unsure']);
});

// ---------- runner ----------

var failed = 0;
tests.forEach(function(t) {
  try {
    t.fn();
    console.log('  PASS  ' + t.name);
  } catch (e) {
    failed++;
    console.log('  FAIL  ' + t.name + '\n        ' + (e && e.message ? e.message : e));
  }
});
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
process.exit(failed ? 1 : 0);
