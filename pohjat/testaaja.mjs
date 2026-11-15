// Shared test helper: runs an n8n Code node script outside n8n with mocked $input and $().
import { readFileSync } from 'node:fs';

export function runCode(file, items, nodes = {}, extra = {}) {
  const code = readFileSync(file, 'utf8');
  const wrap = (arr) => ({ all: () => arr, first: () => arr[0] });
  const input = wrap(items.map((json) => ({ json })));
  const $ = (name) => {
    if (!(name in nodes)) throw new Error('Unknown node in test: ' + name);
    return wrap(Array.isArray(nodes[name]) ? nodes[name].map((json) => ({ json })) : [{ json: nodes[name] }]);
  };
  const fn = new Function('$input', '$', '$getWorkflowStaticData', code);
  return fn(input, $, extra.staticData ? () => extra.staticData : () => ({})).map((i) => i.json);
}

let failed = 0;
export function check(name, cond, detail = '') {
  if (cond) console.log('OK   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail ? ' -> ' + detail : '')); }
}
export function done() {
  console.log(failed === 0 ? '\nAll checks passed.' : '\n' + failed + ' check(s) failed.');
  process.exit(failed === 0 ? 0 : 1);
}
