const Edit = require('./edit');

class Hunk {

  constructor(aStart, bStart, edits) {
    this.aStart = aStart;
    this.bStart = bStart;
    this.edits = edits;
  }

  header() {
    // this.edits is an array of /lib/diff/Combined objects
    // [ { edits, type, aLines, bLine }, ..., ]
    // aLines is an array of /lib/diff/Combined.Row objects, so aLinesArr is like
    // [ [ { number, text }, ..., null ], ...]
    const aLinesArr = this.edits.map(({ aLines }) => aLines);
    // need to be like
    // [ { number, text, }, ..., null ]
    const colLength = aLinesArr.length;
    const rowLength = aLinesArr[0] ? aLinesArr[0].length : 0;
    const aLinesTranspose = Array(rowLength).fill(0).map(() => []);
    for(let col = 0; col < colLength; col++) {
      for(let row = 0; row < rowLength; row++) {
        aLinesTranspose[row][col] = aLinesArr[col][row];
      }
    }
    const offsets = aLinesTranspose.map((lines, i) => 
      this.format('-', lines, this.aStart[i])
    );

    offsets.push(
      this.format(
        '+',
        this.edits.map(({ bLine }) => bLine),
        this.bStart
      )
    );

    const sep = Array(offsets.length)
      .fill('@')
      .join('');

    return [sep, ...offsets, sep].join(' ');
  }

  format(sign, lines, start) {
    lines = lines.filter((line) => line !== null);
    start = lines[0] ?
      lines[0].number :
        start ?
          start : 0;
    return `${sign}${start},${lines.length}`;
  }

};

Hunk.HUNK_CONTEXT = 3;

Hunk.filter = function(edits) {
  const hunks = [];
  let offset = 0;
  while(true) {
    while(
      edits[offset] &&
      edits[offset].type === Edit.SYMBOLS.eql
    ) {
      offset += 1;
    }
    if(offset >= edits.length) {
      return hunks;
    }
    offset -= Hunk.HUNK_CONTEXT + 1;
    this.aStart = offset < 0 ?
      [] :
      edits[offset].aLine.number.map(({ number }) => number);
    this.bStart = offset < 0 ?
      null :
      edits[offset].bLine.number;
    hunks.push(
      new Hunk(this.aStart, this.bStart, [])
    );
    offset = Hunk.buildHunk(
      hunks[hunks.length-1], edits, offset
    );
  }
};

Hunk.buildHunk = function(hunk, edits, offset) {
  let counter = -1;
  while(counter !== 0) {
    if(offset >= 0 && counter > 0) {
      hunk.edits.push(edits[offset]);
    }
    offset += 1;
    if(offset >= edits.length) {
      break;
    }
    const edit = edits[offset + Hunk.HUNK_CONTEXT];
    if(edit) {
      if(
        edit.type === Edit.SYMBOLS.ins ||
        edit.type === Edit.SYMBOLS.del
      ) {
        counter = 2 * Hunk.HUNK_CONTEXT + 1;
      } else {
        counter -= 1;
      }
    } else {
      counter -= 1;
    }
  }
  return offset;
};

module.exports = Hunk;
