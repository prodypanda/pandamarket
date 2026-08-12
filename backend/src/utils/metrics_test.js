const { performance } = require('perf_hooks');

const httpDurationHistograms = [];

function findOrCreateHistogramLinear(labels) {
  const key = JSON.stringify(labels);
  let h = httpDurationHistograms.find((m) => JSON.stringify(m.labels) === key);
  if (!h) {
    h = {
      labels,
      buckets: [],
      sum: 0,
      count: 0,
    };
    httpDurationHistograms.push(h);
  }
  return h;
}

const httpDurationHistogramsMap = new Map();

function findOrCreateHistogramMap(labels) {
  const key = JSON.stringify(labels);
  let h = httpDurationHistogramsMap.get(key);
  if (!h) {
    h = {
      labels,
      buckets: [],
      sum: 0,
      count: 0,
    };
    httpDurationHistogramsMap.set(key, h);
  }
  return h;
}

const numKeys = 500;
const iterations = 10000;
const labelsArr = [];

for (let i = 0; i < numKeys; i++) {
  labelsArr.push({ method: 'GET', route: '/api/v1/users/' + i, status: '200' });
}

let start = performance.now();
for (let i = 0; i < iterations; i++) {
  findOrCreateHistogramLinear(labelsArr[i % numKeys]);
}
console.log('Linear search time:', performance.now() - start, 'ms');

start = performance.now();
for (let i = 0; i < iterations; i++) {
  findOrCreateHistogramMap(labelsArr[i % numKeys]);
}
console.log('Map lookup time:', performance.now() - start, 'ms');
