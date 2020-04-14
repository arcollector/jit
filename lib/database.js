const crypto = require('crypto');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');

const Entry = require('./database/entry');
const Blob = require('./database/blob');
const Tree = require('./database/tree');
const TreeDiff = require('./database/tree.diff');
const Commit = require('./database/commit');

class Raw {
  constructor(type, size, data) {
    this.type = type;
    this.size = size;
    this.data = data;
  }
}

class Database {

  constructor(pathname) {
    this.pathname = pathname;
    this.objects = {};
  }

  load(oid) {
    this.objects[oid] = this.objects[oid] || this.readObject(oid);
    return this.objects[oid];
  }

  loadRaw(oid) {
    const [ type, size, data, i ] = this.readObjectHeader(oid);
    return new Raw(type, size, data.slice(i, data.length));
  }

  loadTreeEntry(oid, pathname) {
    const commit = this.load(oid);
    //console.log('Database#loadTreeEntry', commit);
    const root = new Entry(commit.tree, Tree.TREE_MODE);

    if(!pathname) {
      return root;
    }

    return path
      .normalize(pathname)
      .split(path.sep)
      .reduce((entry, name) => {
        return entry ? 
          this.load(entry.oid).entries[name] :
          null;
      }, root);
  }

  loadTreeList(oid, pathname = null) {
    if(oid === null) {
      return {};
    }

    const entry = this.loadTreeEntry(oid, pathname);
    const list = {};

    this.buildList(list, entry, pathname || '');
    return list;
  }

  buildList(list, entry, prefix) {
    if(!entry) {
      return;
    }
    if(!entry.tree()) {
      list[prefix] = entry;
      return;
    }

    this.load(entry.oid)
      .eachEntry()
      .forEach(([name, item]) => {
        this.buildList(list, item, path.join(prefix, name));
      });
  }

  readObjectHeader(oid, readBytes = null) {
    const objectPath = this.objectPath(oid);
    const objectFile = fs.readFileSync(objectPath);
    const data = zlib.inflateSync(objectFile);

    // reads, ie: tree\SPACE37\NULL
    //            74 72 65 65 20 33 37 00
    // and delegate the rest of the processing
    let temp = [];
    let i = 0;
    while(i < data.length) {
      const c = data[i++];
      if(c === 0x20) { // a space
        break;
      }
      temp.push(String.fromCharCode(c));
    }
    const type = temp.join('');

    temp = [];
    while(i < data.length) {
      const c = data[i++];
      if(c === 0x00) { // null byte
        break;
      }
      temp.push(String.fromCharCode(c));
    }
    const size = parseInt(temp.join(''), 10);

    return [ type, size, data, i ];
  }

  readObject(oid) {
    const [ type, size, data, i ] = this.readObjectHeader(oid);     
 
    // deletegate
    const object = Database.TYPES[type].parse(
      data.slice(i, data.length)
    );
    //console.log('Database#readObject', type, object);
    object.oid = oid;

    return object;
  }

  store(object) {
    //console.log('Database#storing', object.type);
    const content = this.serializeObject(object);
    object.oid = this.hashContent(content);
    this.writeObject(object.oid, content);
  }

  hashObject(object) {
    return this.hashContent(
      this.serializeObject(object)
    );
  }

  serializeObject(object) {
    const data = object.toBuffer();
    const part1 = new Buffer(
      `${object.type} ${data.length}`
    );
    const part2 = new Buffer([0x00]);
    const content = Buffer.concat([
      part1,
      part2,
      data
    ]);
    return content;
  }

  hashContent(content) {
    return crypto
      .createHash('sha1')
      .update(content)
      .digest('hex');
  }

  objectPath(oid) {
    const objectPath = path.join(
      this.pathname,
      oid.substring(0, 2),
      oid.substring(2, oid.length)
    );
    return objectPath;
  }

  writeObject(oid, content) {
    const objectPath = this.objectPath(oid);
    if(fs.existsSync(objectPath)) {
      return;
    }
    const dirname = path.dirname(objectPath);
    const tempPath = path.join(
      dirname,
      this.generateTempName()
    );

    const compressed = zlib.deflateSync(content);

    try {
      fs.writeFileSync(tempPath, compressed);
    } catch(e) {
      fs.mkdirSync(dirname);
      fs.writeFileSync(tempPath, compressed);
    }

    fs.renameSync(tempPath, objectPath);
  }

  generateTempName() {
    return `tmp_obj_${Math.random()}`;
  }

  shortOid(oid) {
    return oid.substring(0, 7);
  }

  prefixMatch(name) {
    try {
      const dirname = path.dirname(this.objectPath(name));
      const oids = fs.readdirSync(dirname).map((filename) =>
        `${path.basename(dirname)}${filename}`
      );
      const oidsFiltered = oids.filter((oid) => {
        const cmp = oid.indexOf(name) === 0;
        return cmp;
      });
      return oidsFiltered;
    } catch(e) {
      if(e.code === 'ENOENT') {
        return [];
      }
      throw e;
    }
  }

  treeDiff(a, b, prune = []) {
    const diff = new TreeDiff(this, prune);
    diff.compareOids(a, b);
    //console.log('Database#treeDiff changes', diff.changes);
    return diff.changes;
  }

  treeEntry(oid) {
    return new Entry(oid, Tree.TREE_MODE);
  }

}

Database.TYPES = {
  blob: Blob,
  tree: Tree,
  commit: Commit,
};

module.exports = Database;

