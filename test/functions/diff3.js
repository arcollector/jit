const Diff3 = require('../../lib/merge/diff3');
const Diff = require('../../lib/diff');

const o = [
  'celery',
  'garlic',
  'onions',
  'salmon',
  'tomatoes',
  'wine',
].join('\n');

const a = [
  'celery',
  'salmon',
  'tomatoes',
  'garlic',
  'onions',
  'wine',
].join('\n');

const b = [
  'celery',
  'salmon',
  'garlic',
  'onions',
  'tomatoes',
  'wine',
].join('\n');

const merged = Diff3.merge(
  //Diff.lines(o), Diff.lines(a), Diff.lines(b)
  o, a, b
);

console.log(merged.toString());
