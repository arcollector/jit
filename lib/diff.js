const Myers = require('./diff/myers');
const Hunk = require('./diff/hunk');
const Combined = require('./diff/combined');

class Line {

  constructor(number, text) {
    this.number = number;
    this.text = text;
  }

};

class Diff {};

Diff.lines = function(document) {
  function splitStringIntoLines(string) {
    const lines = string
      .split('\n')
      .map((text, i) =>
        new Line(i + 1, text)
      );
    if(string[string.length-1] === '\n') {
      lines.pop();
    }
    return lines;
  }

  if(typeof document === 'string') {
    if(document.length !== 0) {
      return splitStringIntoLines(document);
    }
  } else if(document instanceof Buffer) {
    if(document.length !== 0) {
      return splitStringIntoLines(document.toString());
    }
  } else if(Array.isArray(document)) {
    return document
      .map((text, i) =>
        new Line(i + 1, text)
      );
  } else {
    return document;
  }
  return [];
};

Diff.diff = function(a, b) {
  return Myers.diff(Diff.lines(a), Diff.lines(b));
};

Diff.diffHunks = function(a, b) {
  return Hunk.filter(Diff.diff(a, b));
};

Diff.combined = function(as, b) {
  const diffs = as.map((a) => this.diff(a, b));
  return new Combined(diffs).toArray();
};

Diff.combinedHunks = function(as, b) {
  return Hunk.filter(this.combined(as, b));
};

module.exports = Diff;

