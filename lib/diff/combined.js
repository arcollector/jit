const { SYMBOLS } = require('./edit');

class Row {
  constructor(edits) {
    this.edits = edits;
    // need for Diff/hunk.js
    this.type = this.getType();
    this.aLines = this.getALines();
    this.bLine = this.getBline();
  }

  getType() {
    const types = this.edits
      .filter((edit) => edit !== null)
      .map(({ type }) => type);
    return types.includes(SYMBOLS.ins) ? SYMBOLS.ins : types[0];
  }

  getALines() {
    return this.edits.map((edit) =>
      edit ? edit.aLine : null
    );
  }

  getBline() {
    return this.edits[0] ? this.edits[0].bLine : null;
  }

  toString() {
    const symbols = this.edits.map((edit) =>
      SYMBOLS[edit.type] || ' '
    );

    const del = this.edits.find((edit) =>
      edit.type === SYMBOLS.del
    );
    const line = del ? del.aLine : edits[0].bLine;

    return symbols.join('') + line.text;
  }
}

module.exports = class Combined {

  constructor(diffs) {
    // diff is an array of Diff.diff objects
    this.diffs = diffs;
  }

  each(cb) {
    this.offsets = this.diffs.map(() => 0);

    while(true) {
      this.diffs.each((diff, i) => {
        this.consumeDeletions(diff, i, cb);
      });

      if(this.complete()) {
        return;
      }

      const edits = this
        .offsetDiffs()
        .map(([offset, diff]) => diff[offset]);

      this.offsets = this.offsets.map((offset) =>
        offset + 1
      );

      cb(new Row(edits));
    }
  }

  consumeDeletions(diff, i, cb) {
    while(
      this.offsets[i] < diff.length &&
      diff[this.offsets[i]].type === SYMBOLS.del
    ) {
      const edits = Array(this.diffs.length);
      edits[i] = diff[this.offsets[i]];
      this.offsets[i] += 1;

      cb(new Row(edits));
    }
  }

  offsetDiffs() {
    return this.offsets.map((offset, i) =>
      [offset, this.diffs[i]]
    );
  }

  complete() {
    const offsetDiffs = this.offsetDiff();
    return offsetDiffs
      .filter(([offset, diff]) =>
        offset === diff.length
      )
      .length === offsetDiffs.length;
  }

  toArray() {
    const arr = [];
    this.each((row) => arr.push(row));
    return arr;
  }
};

