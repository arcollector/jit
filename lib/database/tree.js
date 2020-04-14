const path = require('path');

const Entry = require('./entry');

class Tree {

  constructor(entries = {}) {
    this.entries = entries;
    this.type = 'tree';
  }

  addEntry(parents, entry) {
    // parents will looks like:
    // [ 'a', 'a/b', 'a/b/c' ]
    if(parents.length === 0) {
      this.entries[path.basename(entry.path)] = entry;
    } else {
      // we want the first one parent, but keep in mind
      // that a parent could looks like 'a/b/c', so
      // we need only then the basename!
      // also parents array we will be mutated!
      const parent = path.basename(parents.shift());
      const tree = this.entries[parent] || new Tree();
      this.entries[parent] = tree;
      tree.addEntry(parents, entry);
    }
  }

  eachEntry() {
    return Object.entries(this.entries);
  }

  traverse(cb) {
    //console.log(Object.values(this.entries).map(({ oid }) => oid));
    // inner trees must be saved first
    // because oid property will be setted when we
    // call Database.store instance method, after that
    // oid property will be available, so we need to
    // save inner most tree so the parent tree can access oid
    for(const name in this.entries) {
      const entry = this.entries[name];
      if(entry instanceof Tree) {
        entry.traverse(cb);
      }
    }
    cb(this);
  }

  mode() {
    return Tree.TREE_MODE;
  }

  toBuffer() {
    return Buffer.concat(
      Object.entries(this.entries).map(([name, entry]) => {
        // if entry is instance of Tree, will be call Tree.mode() instance method
        // otherwise it will call index/entry.js mode() instance method
        // beware that that me need to store mode as octal string
        const modeBuf = Buffer(`0${entry.mode().toString(8)}`);
        const sp = Buffer(' ');
        // name is file name or the dir name if entry instance of Tree
        const nameBuf = Buffer(name);
        const zero = Buffer('\0');
        // from string as 'ce013625030ba8dba906f756967f9e9ca394464a' (length 40) ->
        // <Buffer ce 01 36 25 03 0b a8 db a9 06 f7 56 96 7f 9e 9c a3 94 46 4a> (length 20)
        const oidBuf = Buffer(entry.oid, 'hex');
        return Buffer.concat([modeBuf, sp, nameBuf, zero, oidBuf]);
      })
    );
  }

};

Tree.build = function(entries) {
  // entries is an array of index/entries objects
  // they already sorted
  const root = new Tree();
  entries.forEach ((entry) => {
    root.addEntry(entry.parentDirectories(), entry);
  });
  return root;
};

Tree.parse = function(data) {
  const entries = {};
  let temp = [];
  let i = 0;
  while(i < data.length) {
    let mode;
    // reads the file mode, that is store in octal form
    // ie: 30 31 30 30 36 34 34 20
    //     0100644\SPACE -> 33188
    while(i < data.length) {
      const c = data[i++];
      if(c === 0x20) { // space
        mode = parseInt(temp.join(''), 8);
        temp = [];
        break;
      } else {
        temp.push(String.fromCharCode(c));
      }
    }
    let name;
    // reads the file name, ie:
    // 70 65 70 65 2e 74 78 74 00 -> pepe.txt\NULL
    while(i < data.length) {
      const c = data[i++];
      if(c === 0x00) { // null byte
        name = temp.join('');
        temp = [];
        break;
      } else {
        temp.push(String.fromCharCode(c));
      }
    }
    // reads the oid, always 20 bytes, ie:
    // e6 9d e2 9b b2 d1 d6 43 4b 8b 29 ae 77 5a d8  c2 e4 8c 53 91
    // 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'
    let oid = data.slice(i, (i+=20)).toString('hex');
    entries[name] = new Entry(oid, mode);
  }
  return new Tree(entries);
};

// same as parseInt('040000', 8);
// 16384 in decimal
Tree.TREE_MODE = 0o40000;

module.exports = Tree;

