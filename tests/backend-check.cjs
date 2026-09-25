const fs = require('node:fs');
const path = require('node:path');
const mo = require(process.env.MOTOKO_PACKAGE || 'motoko');
const root = path.resolve(__dirname, '..');
mo.loadPackage(require(path.join(path.dirname(require.resolve(process.env.MOTOKO_PACKAGE || 'motoko')), 'packages/latest/core.json')));
if (process.env.MOTOKO_CORE) {
  mo.clearPackages();
  function load(directory, target) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const local = path.join(directory, entry.name), virtual = target + '/' + entry.name;
      if (entry.isDirectory()) load(local, virtual);
      else if (entry.name.endsWith('.mo')) mo.write(virtual, fs.readFileSync(local, 'utf8'));
    }
  }
  load(process.env.MOTOKO_CORE, 'core');
  mo.usePackage('core', 'core');
}
mo.setExtraFlags(['--default-persistent-actors', '--implicit-package=core']);
mo.write('main.mo', fs.readFileSync(path.join(root, 'src/backend/main.mo'), 'utf8'));
const diagnostics = mo.check('main.mo');
for (const d of diagnostics.filter(d => d.severity === 1)) console.log(JSON.stringify(d));
if (diagnostics.some(d => d.severity === 1)) process.exit(1);
console.log('Backend typecheck passed with Motoko ' + mo.version);
if (process.argv.includes('--emit-did')) {
  fs.writeFileSync(path.join(root, 'src/backend/dist/backend.did'), mo.candid('main.mo'));
}
if (process.argv.includes('--build')) {
  const compiled = mo.wasm('main.mo', 'ic');
  console.log('IC WebAssembly build passed: ' + compiled.wasm.length + ' bytes');
  console.log('Build output fields: ' + Object.keys(compiled).join(', '));
  mo.write('previous.most', fs.readFileSync(path.join(root, 'baselines/caffeine-export-v23.most'), 'utf8'));
  mo.write('updated.most', compiled.stable);
  const compatibility = mo.compiler.stableCompatible('previous.most', 'updated.most');
  console.log('Stable-state compatibility: ' + JSON.stringify(compatibility));
  if (compatibility.diagnostics?.some(d => d.severity === 1)) process.exit(1);
}
if (process.argv.includes('--test')) {
  mo.setRunStepLimit(100000000);
  mo.write('test.mo', fs.readFileSync(path.join(root, 'src/backend/main.mo'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'accounting.mo'), 'utf8'));
  const result = mo.run('test.mo');
  console.log(result.stdout);
  console.log(result.stderr);
  if (result.result?.error || /error \[|execution error|assertion failure/i.test(result.stderr)) process.exit(1);
}
