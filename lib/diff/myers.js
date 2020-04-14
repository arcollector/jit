const Edit = require('./edit');

class Myers {

  // a and b must be instances of Diff.Line class
  constructor(a, b) {
    this.DEBUG = false;
    this.DEBUG && console.log('Myers constructor', a, b);
    this.a = a;
    this.b = b;
  }

  diff() {
    const diff = [];
    this.backtrack((prevX, prevY, x, y) => {
      const aLine = this.a[prevX];
      const bLine = this.b[prevY];
      this.DEBUG && console.log('backTrack cb')
      this.DEBUG && console.log('\t', prevX, prevY, x, y, aLine, bLine);
      if(x === prevX) {
        diff.push(new Edit(Edit.SYMBOLS.ins, null, bLine));
      } else if(y === prevY) {
        diff.push(new Edit(Edit.SYMBOLS.del, aLine, null));
      } else {
        diff.push(new Edit(Edit.SYMBOLS.eql, aLine, bLine));
      } 
    });
    return diff.reverse();
  }

  shortestEdit() {
    const n = this.a.length;
    const m = this.b.length;
    const max = n + m;
    const vLength = 2 * max + 1;
    this.DEBUG && console.log('vLength is', vLength);
    const v = Array(vLength);
    v[1] = 0;
    const trace = [];
    const indexAt = (k) => k < 0 ? vLength + k : k;
    for(let d = 0; d <= max; d++) {
      trace.push([...v]);
      for(let k = -d; k <= d; k+=2) {
        this.DEBUG && console.log('k is', k);
        let x, y;
        // v[k-1] means insertion
        // v[k+1] means deletion
        // prefer deletion over insertion
        if(k == -d || (k !== d && v[indexAt(k - 1)] < v[indexAt(k + 1)])) {
          x = v[indexAt(k + 1)];
        } else {
          x = v[indexAt(k - 1)] + 1;
        }
        y = x - k;
        while(
          x < n && 
          y < m &&
          this.a[x].text === this.b[y].text
        ) {
          x++;
          y++;
        }
        this.DEBUG && console.log(`\t(${x},${y}) = ${x}`);
        this.DEBUG && console.log('setting v[k] at', k, indexAt(k));
        v[indexAt(k)] = x;
        if(x >= n && y >= m) {
          this.DEBUG && console.log('encontrado punto! en ronda d=', d);
          return trace;
        }
      }
      this.DEBUG && console.log('terminada ronda d=', d);
    }
    return [];
  }

  backtrack(cb) {
    let x = this.a.length;
    let y = this.b.length;
    this.shortestEdit()
      .map((v, i) => [v, i])
      .reverse()
      .forEach(([v, d]) => {
        const vLength = v.length;
        const indexAt = (k) => k < 0 ? vLength + k : k;
        const k = x - y;
        let prevK;
        this.DEBUG && console.log('d is', d);
        this.DEBUG && console.log('k is', k);
        if(k === -d || (k !== d && v[indexAt(k - 1)] < v[indexAt(k + 1)])) {
          prevK = k + 1;
        } else {
          prevK = k - 1;
        }
        this.DEBUG && console.log('prevK is', prevK, indexAt(prevK));
        const prevX = v[indexAt(prevK)];
        const prevY = prevX - prevK;
        this.DEBUG && console.log('(prevX, prevY) is', prevX, prevY);
        while(x > prevX && y > prevY) {
          cb(x - 1, y - 1, x, y);
          x--;
          y--; 
        }
        if(d > 0) {
          cb(prevX, prevY, x, y);
        }
        x = prevX;
        y = prevY;
      })
    ;
  }

};

Myers.diff = function(a, b) {
  return new Myers(a, b).diff();
};

module.exports = Myers;

