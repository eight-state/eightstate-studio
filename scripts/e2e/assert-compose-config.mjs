const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

const source = Buffer.concat(chunks).toString('utf8');
const config = JSON.parse(source);
const services = config.services || {};
const networks = config.networks || {};

assert(networks.e2e?.internal === true, 'e2e network must remain internal');
assert(networks['edge-host']?.internal !== true, 'edge-host network must provide a non-internal gateway');

for (const [name, service] of Object.entries(services)) {
  const attached = Object.keys(service.networks || {}).sort();
  if (name === 'edge') {
    assert(attached.join(',') === 'e2e,edge-host', 'edge must join only e2e and edge-host');
    const published = service.ports || [];
    assert(published.length === 1, 'edge must publish exactly one loopback port');
    assert(published[0]?.host_ip === '127.0.0.1', 'edge port must remain loopback-only');
    assert(published[0]?.target === 8080, 'edge must publish nginx port 8080');
    continue;
  }

  assert(attached.join(',') === 'e2e', `${name} must remain attached only to the internal e2e network`);
  assert(!service.ports?.length, `${name} must not publish host ports`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`invalid E2E Compose network topology: ${message}`);
}
