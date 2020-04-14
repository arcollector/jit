const Diff = require('../diff');
const Edit = require('../diff/edit');

class Clean {

  constructor(lines) {
    this.lines = lines;
  }

  toString() {
    return this.lines.join('\n') + '\n';
    return this.lines.join('');
  }

}

class Conflict {

  constructor(oLines, aLines, bLines) {
    this.oLines = oLines;
    this.aLines = aLines;
    this.bLines = bLines;
  }

  toString(aName = null, bName = null) {
    let text = '';
    text = this.separator(text, '<', aName);
    this.aLines.forEach((line) =>
      text += `${line}\n`
    );
    text = this.separator(text, '=');
    this.bLines.forEach((line) =>
      text += `${line}\n`
    );
    text = this.separator(text, '>', bName);
    return text;
  }

  separator(text, char, name = null) {
    text += `${char}${char}${char}${char}${char}${char}${char}`;
    if(name !== null) {
      text += ` ${name}`;
    }
    text += '\n';
    return text;
  }

}

class Result {

  constructor(chunks) {
    this.chunks = chunks;
  }

  clean() {
    return typeof this.chunks.find((chunk) =>
      chunk instanceof Conflict
    ) === 'undefined';
  }

  toString(aName = null, bName = null) {
    return this.chunks
      .map((chunk) =>
        chunk.toString(aName, bName)
      )
      .join('');
  }

}

class Diff3 {

  constructor(o, a, b) {
    function splitStringIntoLines(string) {
      const lines = string.toString().split('\n');
      if(string[string.length-1] === '\n') {
        lines.pop();
      }
      return lines;
    }
    // arguments can be string or buffer or array of string
    this.o = !Array.isArray(o) ?
      splitStringIntoLines(o) : o;
    this.a = !Array.isArray(a) ?
      splitStringIntoLines(a) : a;
    this.b = !Array.isArray(b) ?
      splitStringIntoLines(b) : b;
  }

  merge() {
    this.setup();
    this.generateChunks();
    //console.log('chunks are', this.chunks);
    return new Result(this.chunks);
  }
 
  setup() {
    this.chunks = [];
    this.lineO = this.lineA = this.lineB = 0;
    this.matchA = this.matchSet(this.a);
    this.matchB = this.matchSet(this.b);
  }

  matchSet(file) {
    const matches = {};
    Diff.diff(this.o, file).forEach((edit) => {
      if(edit.type !== Edit.SYMBOLS.eql) {
        // next
      } else {
        matches[edit.aLine.number] = edit.bLine.number;
      }
    });
    return matches; 
  }

  generateChunks() {
    while(true) {
      const i = this.findNextMismatch();
      if(i === 1) {
        const [ o, a, b ] = this.findNextMatch();
        if(a && b) {
          this.emitChunk(o, a, b);
        } else {
          this.emitFinalChunk();
          return;
        }
      } else if(i) {
        this.emitChunk(
          this.lineO + i,
          this.lineA + i,
          this.lineB + i
        );
      } else {
        this.emitFinalChunk();
        return;
      }
    }
  }

  findNextMismatch() {
    let i = 1;
    while(
      this.inBounds(i) &&
      this.match(this.matchA, this.lineA, i) &&
      this.match(this.matchB, this.lineB, i)
    ) {
      i += 1;
    }
    return this.inBounds(i) ? i : null;
  }

  inBounds(i) {
    return (
      this.lineO + i <= this.o.length ||
      this.lineA + i <= this.a.length ||
      this.lineB + i <= this.b.length
    );
  }

  match(matches, offset, i) {
    return matches[this.lineO + i] === offset + i;
  }

  findNextMatch() {
    let o = this.lineO + 1;
    while(
      o < this.o.length &&
      (!(o in this.matchA) || !(o in this.matchB))
    ) {
      o += 1;
    }
    return [o, this.matchA[o], this.matchB[o]];
  }

  emitChunk(o, a, b) {
    /*console.log('emitChunk');
    console.log(this.o, this.lineO, o);
    console.log(this.a, this.lineA, a);
    console.log(this.b, this.lineB, b);*/
    this.writeChunk(
      this.o.slice(this.lineO, o - 1),
      this.a.slice(this.lineA, a - 1),
      this.b.slice(this.lineB, b - 1)
    );
    this.lineO = o - 1;
    this.lineA = a - 1;
    this.lineB = b - 1;
  }

  emitFinalChunk() {
    this.writeChunk(
      this.o.slice(this.lineO, this.lineO.length),
      this.a.slice(this.lineA, this.lineA.length),
      this.b.slice(this.lineB, this.lineB.length)
    );
  }

  // arguments are array
  writeChunk(o, a, b) {
    const oCmp = o.toString();
    const aCmp = a.toString();
    const bCmp = b.toString();
    //console.log('wirteChunk called with', o, a, b);
    if(aCmp === oCmp || aCmp === bCmp) {
      this.chunks.push(new Clean(b));
    } else if(bCmp === oCmp) {
      this.chunks.push(new Clean(a));
    } else {
      this.chunks.push(new Conflict(o, a, b));
    }
    //console.log('writeChunk ocurred');
    //console.log(this.chunks[this.chunks.length-1]);
  }
 
}

Diff3.merge = function(o, a, b) {
  return new Diff3(o, a, b).merge();
}

module.exports = Diff3;

