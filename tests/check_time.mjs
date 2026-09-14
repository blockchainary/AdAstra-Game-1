const t = 1789392336135;
console.log('lastTickAt Date:', new Date(t).toISOString());
console.log('Now Date:', new Date().toISOString());
console.log('Diff in hours:', (Date.now() - t) / 3600000);
