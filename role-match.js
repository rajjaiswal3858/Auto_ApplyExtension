// Role matching for Auto Apply.
//
// Why this file exists: the job boards decide what a search for "Generative AI Engineer" returns,
// and they return loosely related jobs (Frontend Developer, Backend Developer, Data Analyst) because
// they fuzzy-match on "Engineer" or on a single shared skill. Applying to every quick-apply card in
// the results therefore applies to the wrong roles. Everything here answers one question:
//
//   does THIS posting belong to the role the user actually selected?
//
// Two independent gates must agree before an application is allowed:
//   1. deterministic discipline analysis (this file, no model involved)
//   2. the local LLM's classification, validated and confidence-checked
// Anything else - a conflict, an uncertain model, an unreachable model, a malformed reply - skips
// the job. The bias is always towards not applying.
//
// Nothing here is hardcoded to one role: the role the user typed is parsed at runtime into a
// discipline family + distinctive tokens, so any role works.
(function(root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // tests (node)
  if (root) root.RoleMatch = api;                                           // side panel
})(typeof window !== 'undefined' ? window : null, function() {

  // Skills so widely shared that they are never evidence that a job matches a role.
  // "It needs Python" must not make a Frontend job look like an AI job.
  var GENERIC_SKILL_TERMS = [
    'python', 'sql', 'java', 'javascript', 'typescript', 'git', 'github', 'gitlab', 'docker',
    'kubernetes', 'linux', 'unix', 'bash', 'shell', 'aws', 'azure', 'gcp', 'google cloud', 'cloud',
    'agile', 'scrum', 'jira', 'rest', 'rest api', 'api', 'json', 'excel', 'communication',
    'problem solving', 'teamwork', 'ci/cd', 'c', 'c++', 'c#', 'go', 'golang', 'scala', 'r',
    'data', 'database', 'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'nosql',
    'computer science', 'bachelor', 'master', 'degree', 'software', 'development', 'developer',
    'engineer', 'engineering', 'programming', 'coding', 'testing', 'debugging', 'documentation'
  ];

  // Words in a role title that carry no discipline information on their own.
  var ROLE_STOP_TOKENS = [
    'engineer', 'engineering', 'developer', 'development', 'dev', 'programmer', 'specialist',
    'consultant', 'analyst', 'architect', 'manager', 'lead', 'leader', 'head', 'director',
    'senior', 'sr', 'junior', 'jr', 'staff', 'principal', 'associate', 'assistant', 'intern',
    'internship', 'trainee', 'graduate', 'fresher', 'entry', 'level', 'mid', 'i', 'ii', 'iii',
    'iv', 'and', 'or', 'of', 'the', 'a', 'an', 'in', 'for', 'with', 'remote', 'hybrid', 'onsite',
    'full', 'time', 'fulltime', 'part', 'contract', 'permanent', 'position', 'role', 'job',
    'software', 'technical', 'tech', 'it', 'professional', 'expert', 'officer', 'executive'
  ];

  // Discipline families and the terms that are *distinctive* of each one. Generic skills are
  // deliberately absent: a family is recognised by its own vocabulary, not by shared tooling.
  var ROLE_FAMILIES = {
    'ai-ml': {
      label: 'AI / ML',
      terms: [
        'generative ai', 'gen ai', 'genai', 'generative-ai', 'llm', 'llms', 'large language model',
        'large language models', 'foundation model', 'foundation models', 'prompt engineering',
        'prompt engineer', 'rag', 'retrieval augmented generation', 'retrieval-augmented generation',
        'vector database', 'vector db', 'embeddings', 'embedding model', 'fine tuning',
        'fine-tuning', 'finetuning', 'langchain', 'llamaindex', 'hugging face', 'huggingface',
        'transformers', 'transformer architecture', 'openai', 'anthropic', 'ollama', 'gpt',
        'diffusion model', 'stable diffusion', 'agentic ai', 'ai agents', 'ai agent',
        'machine learning', 'ml engineer', 'deep learning', 'neural network', 'neural networks',
        'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'scikit learn', 'sklearn', 'xgboost',
        'nlp', 'natural language processing', 'computer vision', 'image recognition',
        'speech recognition', 'reinforcement learning', 'mlops', 'model deployment',
        'model training', 'model inference', 'artificial intelligence', 'ai engineer',
        'ai/ml', 'ml ops', 'feature engineering', 'model evaluation'
      ]
    },
    'data-science': {
      label: 'Data science',
      terms: [
        'data scientist', 'data science', 'statistical modeling', 'statistical modelling',
        'predictive modeling', 'predictive modelling', 'predictive analytics', 'hypothesis testing',
        'a/b testing', 'ab testing', 'experimentation', 'forecasting', 'time series',
        'regression analysis', 'statistics', 'statistical analysis', 'bayesian'
      ]
    },
    'data-analytics': {
      label: 'Data analytics / BI',
      terms: [
        'data analyst', 'data analytics', 'business intelligence', 'bi developer', 'bi analyst',
        'power bi', 'powerbi', 'tableau', 'looker', 'qlik', 'qliksense', 'google data studio',
        'dashboards', 'dashboarding', 'reporting', 'reports', 'kpi', 'kpis', 'pivot table',
        'pivot tables', 'vlookup', 'google analytics', 'business analytics', 'mis'
      ]
    },
    'data-engineering': {
      label: 'Data engineering',
      terms: [
        'data engineer', 'data engineering', 'etl', 'elt', 'data pipeline', 'data pipelines',
        'data warehouse', 'data warehousing', 'data lake', 'lakehouse', 'apache spark', 'pyspark',
        'hadoop', 'hive', 'kafka', 'airflow', 'dbt', 'snowflake', 'databricks', 'redshift',
        'bigquery', 'informatica', 'talend', 'ssis', 'data modeling', 'data modelling',
        'data ingestion'
      ]
    },
    'frontend': {
      label: 'Frontend / UI',
      terms: [
        'frontend', 'front end', 'front-end', 'ui developer', 'ui engineer', 'web developer',
        'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js', 'svelte',
        'next.js', 'nextjs', 'nuxt', 'jquery', 'html', 'html5', 'css', 'css3', 'sass', 'scss',
        'less', 'tailwind', 'bootstrap', 'material ui', 'styled components', 'redux', 'webpack',
        'vite', 'babel', 'dom', 'responsive design', 'cross browser', 'cross-browser',
        'web accessibility', 'wcag', 'single page application', 'spa', 'storybook'
      ]
    },
    'backend': {
      label: 'Backend',
      terms: [
        'backend', 'back end', 'back-end', 'server side', 'server-side', 'microservices',
        'microservice', 'spring boot', 'spring framework', 'hibernate', 'j2ee', 'jpa', 'django',
        'flask', 'fastapi', 'express', 'expressjs', 'express.js', 'nestjs', 'node.js', 'nodejs',
        '.net', 'asp.net', 'dotnet', 'laravel', 'php', 'symfony', 'codeigniter', 'ruby on rails',
        'rails', 'graphql', 'grpc', 'soap', 'message queue', 'rabbitmq', 'orm',
        'api development', 'backend services'
      ]
    },
    'fullstack': {
      label: 'Full stack',
      terms: [
        'full stack', 'fullstack', 'full-stack', 'mern', 'mean stack', 'mevn', 'lamp stack'
      ]
    },
    'mobile': {
      label: 'Mobile',
      terms: [
        'android', 'ios', 'android developer', 'ios developer', 'mobile developer',
        'mobile application', 'mobile app', 'flutter', 'dart', 'react native', 'swift', 'swiftui',
        'objective-c', 'kotlin', 'jetpack compose', 'xamarin', 'ionic', 'play store', 'app store'
      ]
    },
    'devops': {
      label: 'DevOps / Cloud / SRE',
      terms: [
        'devops', 'site reliability', 'sre', 'platform engineer', 'cloud engineer',
        'infrastructure engineer', 'terraform', 'ansible', 'puppet', 'chef', 'helm', 'jenkins',
        'argocd', 'prometheus', 'grafana', 'observability', 'cloudformation', 'eks', 'ecs',
        'load balancer', 'autoscaling', 'provisioning', 'infrastructure as code', 'sysadmin',
        'system administrator', 'network engineer'
      ]
    },
    'qa': {
      label: 'QA / Test',
      terms: [
        'qa', 'qa engineer', 'qa automation', 'quality assurance', 'quality engineer',
        'test engineer', 'sdet', 'test automation', 'automation testing', 'tester',
        'automation tester', 'manual testing', 'manual tester', 'selenium', 'cypress',
        'playwright', 'appium', 'testng', 'junit', 'pytest', 'jmeter', 'postman', 'test cases',
        'test plan', 'regression testing', 'functional testing', 'performance testing',
        'load testing', 'bug tracking', 'defect tracking'
      ]
    },
    'security': {
      label: 'Security',
      terms: [
        'cyber security', 'cybersecurity', 'information security', 'infosec', 'security engineer',
        'security analyst', 'soc analyst', 'penetration testing', 'pentest', 'ethical hacking',
        'vulnerability assessment', 'vapt', 'siem', 'splunk', 'threat hunting', 'incident response',
        'owasp', 'application security', 'appsec', 'iam', 'firewall', 'cissp', 'ceh'
      ]
    },
    'embedded': {
      label: 'Embedded / Hardware',
      terms: [
        'embedded', 'firmware', 'microcontroller', 'rtos', 'freertos', 'arm cortex', 'stm32',
        'arduino', 'raspberry pi', 'vhdl', 'verilog', 'fpga', 'pcb', 'device driver', 'drivers',
        'can bus', 'i2c', 'spi', 'uart', 'iot', 'hardware design', 'vlsi'
      ]
    },
    'design': {
      label: 'Design / UX',
      terms: [
        'ux designer', 'ui designer', 'ux/ui', 'ui/ux', 'user experience', 'user research',
        'interaction design', 'visual design', 'graphic design', 'graphic designer', 'figma',
        'sketch', 'adobe xd', 'photoshop', 'illustrator', 'wireframe', 'wireframes', 'prototyping',
        'design system', 'typography', 'branding', 'motion graphics'
      ]
    },
    'product': {
      label: 'Product / Business',
      terms: [
        'product manager', 'product management', 'product owner', 'business analyst',
        'business analysis', 'roadmap', 'stakeholder management', 'user stories', 'requirement',
        'requirements gathering', 'go to market', 'go-to-market', 'product strategy', 'pmo',
        'project manager', 'project management', 'scrum master', 'program manager'
      ]
    },
    'sales-marketing': {
      label: 'Sales / Marketing',
      terms: [
        'sales', 'business development', 'bde', 'lead generation', 'cold calling', 'inside sales',
        'account executive', 'account manager', 'marketing', 'digital marketing', 'seo', 'sem',
        'social media marketing', 'content marketing', 'content writer', 'copywriter',
        'email marketing', 'performance marketing', 'crm', 'salesforce', 'hubspot', 'brand',
        'campaign', 'ppc', 'google ads'
      ]
    },
    'hr-admin': {
      label: 'HR / Admin',
      terms: [
        'human resources', 'hr executive', 'hr manager', 'recruiter', 'recruitment',
        'talent acquisition', 'sourcing', 'onboarding', 'payroll', 'employee engagement',
        'hr operations', 'hrbp', 'administrative', 'office admin', 'back office'
      ]
    },
    'finance': {
      label: 'Finance / Accounting',
      terms: [
        'accountant', 'accounting', 'accounts payable', 'accounts receivable', 'bookkeeping',
        'tally', 'gst', 'taxation', 'audit', 'auditing', 'financial analyst', 'financial modeling',
        'financial modelling', 'investment banking', 'equity research', 'treasury', 'ca inter',
        'chartered accountant', 'bank reconciliation'
      ]
    },
    'support': {
      label: 'Support / Operations',
      terms: [
        'customer support', 'customer service', 'technical support', 'help desk', 'helpdesk',
        'service desk', 'bpo', 'call center', 'call centre', 'voice process', 'non voice process',
        'chat support', 'ticketing', 'itil', 'desktop support', 'operations executive',
        'data entry', 'telecaller', 'telecalling'
      ]
    },
    'content': {
      label: 'Content / Writing',
      terms: [
        'technical writer', 'technical writing', 'content writing', 'editor', 'proofreading',
        'copy editing', 'documentation writer', 'blog writing', 'scriptwriter', 'translator',
        'transcription'
      ]
    }
  };

  // Families close enough that a title in the neighbour family is not an automatic reject - but it
  // still has to be confirmed by the model before anything is submitted.
  var FAMILY_ADJACENCY = {
    'ai-ml': ['data-science'],
    'data-science': ['ai-ml', 'data-analytics'],
    'data-analytics': ['data-science'],
    'data-engineering': [],
    'frontend': ['fullstack'],
    'backend': ['fullstack'],
    'fullstack': ['frontend', 'backend'],
    'mobile': [],
    'devops': [],
    'qa': [],
    'security': [],
    'embedded': [],
    'design': [],
    'product': [],
    'sales-marketing': [],
    'hr-admin': [],
    'finance': [],
    'support': [],
    'content': []
  };

  // The model must be at least this sure before an application is allowed.
  var MIN_CONFIDENCE = 0.7;

  // ---------- text helpers ----------

  function normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[‐-―]/g, '-')
      .replace(/[^a-z0-9+#./\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Whole-term match: "react" must not fire on "reactor", "ai" must not fire on "aid".
  function hasTerm(normText, term) {
    if (!normText || !term) return false;
    var re = new RegExp('(^|[^a-z0-9+#])' + escapeRe(term) + '([^a-z0-9+#]|$)');
    return re.test(normText);
  }

  function tokenize(s) {
    return normalize(s).split(/[^a-z0-9+#.]+/).filter(Boolean);
  }

  function isGenericTerm(term) {
    return GENERIC_SKILL_TERMS.indexOf(normalize(term)) >= 0;
  }

  function unique(arr) {
    var out = [];
    arr.forEach(function(x) { if (out.indexOf(x) < 0) out.push(x); });
    return out;
  }

  // ---------- the user's selected role ----------

  // Which families does this text speak the vocabulary of, and how strongly?
  function familySignals(text) {
    var norm = normalize(text);
    var counts = {}, matched = {};
    Object.keys(ROLE_FAMILIES).forEach(function(fam) {
      ROLE_FAMILIES[fam].terms.forEach(function(term) {
        if (isGenericTerm(term)) return; // belt and braces: generic words never count as evidence
        if (hasTerm(norm, term)) {
          counts[fam] = (counts[fam] || 0) + 1;
          (matched[fam] = matched[fam] || []).push(term);
        }
      });
    });
    return { counts: counts, matched: matched };
  }

  // "Generative AI Engineer" -> family ai-ml, distinctive tokens [generative, ai]
  // "Technical Writer"       -> no family, distinctive tokens [writer]  (still usable)
  function parseRole(role) {
    var normalized = normalize(role);
    var tokens = tokenize(role);
    var distinctiveTokens = unique(tokens.filter(function(t) {
      return ROLE_STOP_TOKENS.indexOf(t) < 0 && t.length > 1;
    }));
    var sig = familySignals(normalized);
    var families = Object.keys(sig.counts).sort(function(a, b) { return sig.counts[b] - sig.counts[a]; });
    return {
      raw: String(role == null ? '' : role).trim(),
      normalized: normalized,
      tokens: tokens,
      distinctiveTokens: distinctiveTokens,
      families: families,
      primaryFamily: families[0] || null,
      matchedTerms: sig.matched,
      valid: normalized.length > 0
    };
  }

  function relatedFamilies(fam) {
    return [fam].concat(FAMILY_ADJACENCY[fam] || []);
  }

  // Is `fam` the same as, or adjacent to, any family of the selected role?
  function isRelated(roleSpec, fam) {
    return roleSpec.families.some(function(rf) { return relatedFamilies(rf).indexOf(fam) >= 0; });
  }

  function familyLabel(fam) {
    return (ROLE_FAMILIES[fam] && ROLE_FAMILIES[fam].label) || fam;
  }

  // ---------- gate 1: deterministic screening ----------

  // Title-only screen. Cheap enough to run on every search-result card before opening the job,
  // which is where most of the wrong roles (Frontend Developer, Data Analyst...) are caught.
  function screenTitle(roleSpec, title) {
    var norm = normalize(title);
    if (!roleSpec || !roleSpec.valid) {
      return { verdict: 'reject', reason: 'No role selected to match against' };
    }
    if (!norm) return { verdict: 'uncertain', reason: 'Job title is empty' };

    var sig = familySignals(norm);
    var fams = Object.keys(sig.counts);

    if (roleSpec.families.length) {
      var ownHit = fams.filter(function(f) { return roleSpec.families.indexOf(f) >= 0; });
      var conflicting = fams.filter(function(f) { return !isRelated(roleSpec, f); });

      // A title that names another discipline is wrong even if it also mentions the role's
      // vocabulary ("Frontend Developer (AI team)") - unless the role itself spans both.
      if (conflicting.length) {
        return {
          verdict: 'reject',
          reason: 'Title is ' + familyLabel(conflicting[0]) + ' ("' + sig.matched[conflicting[0]][0] +
            '"), not ' + familyLabel(roleSpec.primaryFamily)
        };
      }
      if (ownHit.length) {
        return {
          verdict: 'accept',
          reason: 'Title matches ' + familyLabel(ownHit[0]) + ' ("' + sig.matched[ownHit[0]][0] + '")'
        };
      }
      if (fams.length) {
        return { verdict: 'uncertain', reason: 'Title is adjacent (' + familyLabel(fams[0]) + '), needs the description' };
      }
      return { verdict: 'uncertain', reason: 'Title names no discipline, needs the description' };
    }

    // Role we have no taxonomy for: fall back to its own distinctive words.
    var tokenHit = roleSpec.distinctiveTokens.some(function(t) { return hasTerm(norm, t); });
    if (tokenHit) return { verdict: 'accept', reason: 'Title contains the selected role wording' };
    if (fams.length) {
      return {
        verdict: 'reject',
        reason: 'Title is ' + familyLabel(fams[0]) + ' and shares no wording with "' + roleSpec.raw + '"'
      };
    }
    return { verdict: 'uncertain', reason: 'Title shares no wording with "' + roleSpec.raw + '", needs the description' };
  }

  // Title + description screen. Used once the posting is open.
  function screenJob(roleSpec, title, description) {
    var titleScreen = screenTitle(roleSpec, title);
    if (titleScreen.verdict === 'reject') return titleScreen;

    var normDesc = normalize(description).slice(0, 12000);
    if (!normDesc) {
      // No description to corroborate with: an accepting title is still only "uncertain".
      return {
        verdict: titleScreen.verdict === 'accept' ? 'uncertain' : titleScreen.verdict,
        reason: 'No job description available to confirm the role'
      };
    }

    var sig = familySignals(normDesc);
    var roleCount = 0;
    roleSpec.families.forEach(function(f) { roleCount += sig.counts[f] || 0; });

    var conflicts = Object.keys(sig.counts).filter(function(f) { return !isRelated(roleSpec, f); });
    var topConflict = conflicts.sort(function(a, b) { return sig.counts[b] - sig.counts[a]; })[0];
    var conflictCount = topConflict ? sig.counts[topConflict] : 0;

    if (roleSpec.families.length) {
      // The posting never speaks the role's language -> it is not that role, whatever skills it shares.
      if (roleCount === 0 && titleScreen.verdict !== 'accept') {
        return {
          verdict: 'reject',
          reason: 'Description shows no ' + familyLabel(roleSpec.primaryFamily) + ' work' +
            (topConflict ? ' (reads as ' + familyLabel(topConflict) + ')' : '')
        };
      }
      // Another discipline out-weighs the role in the posting itself. This is what catches a job
      // that only name-drops the field ("our product uses machine learning") while the actual
      // responsibilities are someone else's discipline.
      if (conflictCount >= 2 && conflictCount > roleCount) {
        return {
          verdict: 'reject',
          reason: 'Description is mostly ' + familyLabel(topConflict) + ' (' + conflictCount +
            ' signals vs ' + roleCount + ' for ' + familyLabel(roleSpec.primaryFamily) + ')'
        };
      }
      if (titleScreen.verdict === 'accept' && roleCount > 0) {
        return { verdict: 'accept', reason: titleScreen.reason + '; description confirms it (' + roleCount + ' signals)' };
      }
      return { verdict: 'uncertain', reason: titleScreen.reason + '; ' + roleCount + ' role signals in the description' };
    }

    var tokenHit = roleSpec.distinctiveTokens.some(function(t) { return hasTerm(normDesc, t); });
    if (!tokenHit && titleScreen.verdict !== 'accept') {
      return { verdict: 'reject', reason: 'Neither title nor description mentions "' + roleSpec.raw + '"' };
    }
    if (titleScreen.verdict === 'accept' && tokenHit) {
      return { verdict: 'accept', reason: 'Title and description both match "' + roleSpec.raw + '"' };
    }
    return { verdict: 'uncertain', reason: titleScreen.reason };
  }

  // ---------- gate 2: the local model ----------

  // Ollama structured output. An enum keeps a small model from inventing a third answer.
  var VERDICT_SCHEMA = {
    type: 'object',
    properties: {
      job_discipline: { type: 'string' },
      verdict: { type: 'string', enum: ['match', 'mismatch', 'unsure'] },
      confidence: { type: 'number' },
      reason: { type: 'string' }
    },
    required: ['job_discipline', 'verdict', 'confidence', 'reason']
  };

  function buildClassifierPrompt(roleSpec, job) {
    var system =
      'You classify whether a job posting is the SAME ROLE the candidate selected. You are a strict ' +
      'gatekeeper, not a recommender: approving a wrong role costs far more than rejecting a right one.\n' +
      'Rules:\n' +
      '1. Compare the job title, responsibilities and required skills against the selected role.\n' +
      '2. Answer "match" only if the day-to-day work of this job IS the selected role (or an obvious ' +
      'synonym of it). A different discipline is "mismatch" even when the company, product, domain or ' +
      'industry is the same.\n' +
      '3. Shared general-purpose skills are NOT a match. Python, SQL, Git, Docker, Kubernetes, AWS, ' +
      'Linux, REST APIs, agile and a CS degree appear in almost every posting and prove nothing.\n' +
      '4. A passing mention of the selected role\'s field ("our product uses AI", "you will work with ' +
      'the ML team") does not make a posting that role.\n' +
      '5. Seniority wording alone is not a mismatch; the discipline is what matters.\n' +
      '6. If the posting is vague, truncated, or you cannot tell, answer "unsure" - never guess "match".\n' +
      '7. "confidence" is your probability from 0 to 1 that your verdict is right.\n' +
      '8. "job_discipline" is a short plain-English name for what this job actually is ' +
      '(e.g. "frontend web development", "generative AI engineering", "business intelligence").\n' +
      'Reply with JSON only.';

    var user =
      'SELECTED ROLE: ' + roleSpec.raw + '\n\n' +
      'JOB TITLE: ' + (job.title || '(none)') + '\n' +
      'COMPANY: ' + (job.company || '(unknown)') + '\n\n' +
      'JOB DESCRIPTION / RESPONSIBILITIES / REQUIRED SKILLS:\n' +
      String(job.description || '(none provided)').slice(0, 4000) + '\n\n' +
      'Is this job the role "' + roleSpec.raw + '"?';

    return { system: system, user: user };
  }

  // A local 3B model can return anything. Only a fully well-formed reply may approve an application.
  function validateVerdict(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'model returned no JSON object' };
    }
    var v = typeof raw.verdict === 'string' ? raw.verdict.trim().toLowerCase() : '';
    if (['match', 'mismatch', 'unsure'].indexOf(v) < 0) {
      return { ok: false, error: 'model returned an unknown verdict "' + String(raw.verdict).slice(0, 40) + '"' };
    }
    var c = typeof raw.confidence === 'number' ? raw.confidence : parseFloat(raw.confidence);
    if (!isFinite(c)) return { ok: false, error: 'model returned no numeric confidence' };
    if (c > 1 && c <= 100) c = c / 100; // some models answer in percent
    if (c < 0 || c > 1) return { ok: false, error: 'model returned an out-of-range confidence' };
    return {
      ok: true,
      verdict: {
        verdict: v,
        confidence: c,
        reason: String(raw.reason == null ? '' : raw.reason).slice(0, 300),
        jobDiscipline: String(raw.job_discipline == null ? '' : raw.job_discipline).slice(0, 120)
      }
    };
  }

  // ---------- the decision ----------

  // opts: { roleSpec, title, company, description, llmRaw, llmError, minConfidence }
  // Returns { apply, stage, reason, screen, llm }. apply===true needs both gates to agree.
  function decide(opts) {
    var roleSpec = opts.roleSpec;
    var minConfidence = typeof opts.minConfidence === 'number' ? opts.minConfidence : MIN_CONFIDENCE;

    if (!roleSpec || !roleSpec.valid) {
      return { apply: false, stage: 'role', reason: 'No role selected to match against' };
    }

    var screen = screenJob(roleSpec, opts.title, opts.description);
    if (screen.verdict === 'reject') {
      return { apply: false, stage: 'rules', reason: screen.reason, screen: screen };
    }

    // Gate 2 is mandatory: no usable model answer means no application.
    if (opts.llmError) {
      return {
        apply: false, stage: 'llm-unavailable',
        reason: 'Role check unavailable (' + opts.llmError + ')', screen: screen
      };
    }
    var parsed = validateVerdict(opts.llmRaw);
    if (!parsed.ok) {
      return {
        apply: false, stage: 'llm-invalid',
        reason: 'Role check unusable: ' + parsed.error, screen: screen
      };
    }
    var llm = parsed.verdict;

    if (llm.verdict !== 'match') {
      return {
        apply: false, stage: 'llm',
        reason: (llm.verdict === 'unsure' ? 'Role unclear: ' : 'Different role: ') +
          (llm.reason || llm.jobDiscipline || 'model said ' + llm.verdict),
        screen: screen, llm: llm
      };
    }
    if (llm.confidence < minConfidence) {
      return {
        apply: false, stage: 'llm-confidence',
        reason: 'Role match only ' + Math.round(llm.confidence * 100) + '% confident (needs ' +
          Math.round(minConfidence * 100) + '%)',
        screen: screen, llm: llm
      };
    }

    // Cross-check the model against itself: if the discipline it named belongs to another family,
    // its "match" contradicts its own reading of the posting.
    if (llm.jobDiscipline && roleSpec.families.length) {
      var dSig = familySignals(llm.jobDiscipline);
      var dFams = Object.keys(dSig.counts);
      var dConflict = dFams.filter(function(f) { return !isRelated(roleSpec, f); });
      if (dConflict.length && !dFams.some(function(f) { return isRelated(roleSpec, f); })) {
        return {
          apply: false, stage: 'llm-contradiction',
          reason: 'Model called it "' + llm.jobDiscipline + '" (' + familyLabel(dConflict[0]) +
            ') yet answered match',
          screen: screen, llm: llm
        };
      }
    }

    return {
      apply: true,
      stage: 'ok',
      reason: screen.reason + ' | model: ' + (llm.reason || 'match') +
        ' (' + Math.round(llm.confidence * 100) + '%)',
      screen: screen,
      llm: llm
    };
  }

  return {
    GENERIC_SKILL_TERMS: GENERIC_SKILL_TERMS,
    ROLE_STOP_TOKENS: ROLE_STOP_TOKENS,
    ROLE_FAMILIES: ROLE_FAMILIES,
    FAMILY_ADJACENCY: FAMILY_ADJACENCY,
    MIN_CONFIDENCE: MIN_CONFIDENCE,
    VERDICT_SCHEMA: VERDICT_SCHEMA,
    normalize: normalize,
    tokenize: tokenize,
    hasTerm: hasTerm,
    familySignals: familySignals,
    familyLabel: familyLabel,
    parseRole: parseRole,
    screenTitle: screenTitle,
    screenJob: screenJob,
    buildClassifierPrompt: buildClassifierPrompt,
    validateVerdict: validateVerdict,
    decide: decide
  };
});
