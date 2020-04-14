const Diff = require('./lib/diff');

const a = 'ABCABBA';
const b = 'CBABAC';

const edits = Diff.diff(a, b);
edits.forEach((edit) => console.log(edit.toString()))
