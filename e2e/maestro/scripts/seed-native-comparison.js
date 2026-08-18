var baseUrl = E2E_BASE_URL.replace(/\/$/, '');
var headers = {
  authorization: 'Bearer ' + E2E_API_KEY,
  'content-type': 'application/json',
};
var suffix = String(Date.now());

var dataset = request('POST', '/api/datasets', {
  name: 'Maestro Native Comparison ' + suffix,
  description: 'Disposable dataset created by the local-parity Maestro suite.',
});

request('POST', '/api/datasets/' + dataset.id + '/items/batch', {
  items: [
    { input: 'Return a deterministic response for baseline ' + suffix, groundTruth: 'Deterministic E2E response.' },
    { input: 'Return a deterministic response for contender ' + suffix, groundTruth: 'Deterministic E2E response.' },
  ],
});

var baseline = request('POST', '/studio/experiments/' + dataset.id, {
  name: 'Maestro Baseline ' + suffix,
  targetType: 'agent',
  targetId: 'contra-mini-scout',
  scorers: [],
  maxConcurrency: 1,
});
var contender = request('POST', '/studio/experiments/' + dataset.id, {
  name: 'Maestro Contender ' + suffix,
  targetType: 'agent',
  targetId: 'contra-mini-scout',
  scorers: [],
  maxConcurrency: 1,
});

output.datasetId = dataset.id;
output.baselineId = baseline.experimentId;
output.contenderId = contender.experimentId;

function request(method, path, body) {
  var response = http.request(baseUrl + path, {
    method: method,
    headers: headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(method + ' ' + path + ' returned HTTP ' + response.status + ': ' + response.body);
  }
  return json(response.body);
}
