var baseUrl = E2E_BASE_URL.replace(/\/$/, '');
var readinessResponse = http.get(baseUrl + '/readiness');
if (!readinessResponse.ok) {
  throw new Error('/readiness returned HTTP ' + readinessResponse.status + ': ' + readinessResponse.body);
}

var readiness = json(readinessResponse.body);
if (readiness.status !== 'ready') throw new Error('runtime status is ' + readiness.status);
if (readiness.storage !== 'postgres') throw new Error('expected postgres, got ' + readiness.storage);
if (readiness.observability !== 'clickhouse') {
  throw new Error('expected clickhouse, got ' + readiness.observability);
}

Object.keys(readiness.checks || {}).forEach(function (name) {
  if (readiness.checks[name] !== true) throw new Error('readiness check failed: ' + name);
});

var authenticated = http.get(baseUrl + '/api/agents', {
  headers: { authorization: 'Bearer ' + E2E_API_KEY },
});
if (!authenticated.ok) {
  throw new Error('authenticated /api/agents returned HTTP ' + authenticated.status + ': ' + authenticated.body);
}

var routesResponse = http.get(baseUrl + '/routes-manifest.json');
if (!routesResponse.ok) {
  throw new Error('/routes-manifest.json returned HTTP ' + routesResponse.status + ': ' + routesResponse.body);
}
var routeRoots = json(routesResponse.body);
if (routeRoots.indexOf('agent-builder') !== -1) {
  throw new Error('downstream routes manifest still exposes agent-builder');
}
