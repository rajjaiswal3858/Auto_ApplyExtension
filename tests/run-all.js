// Runs every Auto Apply test file:  node tests/run-all.js
var cp = require('child_process');
var path = require('path');
var files = ['role-match.test.js', 'autoapply-role-gate.test.js'];
var failed = 0;
files.forEach(function(f) {
  console.log('\n== ' + f + ' ==');
  var r = cp.spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
});
console.log('\n' + (failed ? failed + ' test file(s) FAILED' : 'all test files passed'));
process.exit(failed ? 1 : 0);
