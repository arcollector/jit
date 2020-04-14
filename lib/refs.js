const fs = require('fs');
const path = require('path');

const Lockfile = require('./lockfile');

SYMREF = /^ref: (.+)$/;

class SymRef {
  constructor(refs, path) {
    this.refs = refs;
    this.path = path;
  }
  readOid() {
    return this.refs.readRef(this.path);
  }
  head() {
    return this.path === Refs.HEAD;
  }
  shortName() {
    return this.refs.shortName(this.path);
  }
}

class Ref {
  constructor(oid) {
    this.oid = oid;
  }
  readOid() {
    return this.oid;
  }
}

class Refs {

  constructor(pathname) {
    this.pathname = pathname;
    this.refsPath = path.join(this.pathname, Refs.REFS_DIR);
    this.headsPath = path.join(this.pathname, Refs.HEADS_DIR);
    this.remotesPath = path.join(this.pathname, Refs.REMOTES_DIR);
  }

  update() {
    fs.mkdirSync(
      path.join(this.refsPath, 'heads'),
      { recursive: true }
    );
  }

  updateHead(oid) {
    //console.log('updateHead', oid);
    return this.updateSymref(
      path.join(this.pathname, Refs.HEAD), oid
    );
  }

  setHead(revision, oid) {
    //console.log('Refs::setHead', revision, oid);
    const head = path.join(this.pathname, Refs.HEAD);
    const pathname = path.join(this.headsPath, revision);
    if(
      fs.existsSync(pathname) &&
      fs.statSync(pathname).isFile()
    ) {
      const relative = path.relative(this.pathname, pathname);
      this.updateRefFile(head, `ref: ${relative}`);
    } else {
      this.updateRefFile(head, oid);
    }
  }

  readHead() {
    //console.log('readHead', this.pathname, Refs.HEAD);
    return this.readSymref(
      path.join(this.pathname, Refs.HEAD)
    );
  }

  createBranch(branchName, startOid) {
    const pathname = path.join(this.headsPath, branchName);

    if(Refs.INVALID_NAME.test(branchName)) {
      const err = new Error(`${branchName} is not a valid branch name.`);
      err.code = Refs.INVALID_BRANCH;
      throw err;
    }

    if(fs.existsSync(pathname)) {
      const err = new Error(`A branch named ${branchName} already exists.`);
      err.code = Refs.INVALID_BRANCH;
      throw err;
    }

    fs.mkdirSync(
      path.dirname(pathname),
      { recursive: true }
    );

    this.updateRefFile(pathname, startOid);
  }

  updateRefFile(pathname, oid) {
    //console.log('updateRefFile', pathname, oid);
    const lockfile = new Lockfile(pathname);
    try {
      lockfile.holdForUpdate();
      this.writeLockfile(lockfile, oid);

    } catch(e) {
      if(e.code === 'MissingParent') {
        fs.mkdirSync(
          path.dirname(pathname),
          { recursive: true }
        );
        lockfile.rollback();
        this.updateRefFile(pathname, oid);
      } else {
        throw e;
      }
    }
  }

  writeLockfile(lockfile, oid) {
    lockfile.write(Buffer(oid));
    lockfile.write('\n');
    lockfile.commit();
  }

  readRef(name) {
    const path = this.pathForName(name);
    return path !== null ? this.readSymref(path) : null;
  }

  currentRef(source = Refs.HEAD) {
    const ref = this.readOidOrSymref(path.join(this.pathname, source));
    if(ref instanceof SymRef) {
      return this.currentRef(ref.path);
    } else if(ref instanceof Ref || ref === null) {
      return new SymRef(this, source);  
    }
  }

  pathForName(name) {
    const prefixes = [
      this.pathname,
      this.refsPath,
      this.headsPath,
      this.remotesPath,
    ];

    const prefix = prefixes.find((prefix) => {
      return fs.existsSync(path.join(prefix, name));
    });

    return prefix ? path.join(prefix, name) : null;
  }

  readRefFile(path) {
    try {
      const oid = fs.readFileSync(path, 'utf-8').trim();
      //console.log('readRefFile', oid);
      return oid;
    } catch(e) {
      if(e.code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }

  readOidOrSymref(path) {
    //console.log('readOidOrSymref', path);
    try {
      const data = fs.readFileSync(path, 'utf-8').trim();
      const match = SYMREF.exec(data);
      if(match) {
        return new SymRef(this, match[1]);
      } else {
        return new Ref(data);
      }
    } catch(e) {
      if(e.code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }

  readSymref(pathname) {
    //console.log('readSymref', pathname);
    const ref = this.readOidOrSymref(pathname);
    //console.log(ref);
    if(ref instanceof SymRef) {
      return this.readSymref(path.join(this.pathname, ref.path));
    } else if(ref instanceof Ref) {
      return ref.oid;
    } else { // ref is null
      return ref;
    }
  }

  updateSymref(pathname, oid) {
    //console.log('updateSymref', pathname, 'con datos', oid);
    const lockfile = new Lockfile(pathname);
    try {
      lockfile.holdForUpdate();
    } catch(e) {
      lockfile.rollback();
      throw e;
    }

    const ref = this.readOidOrSymref(pathname);
    if(!(ref instanceof SymRef)) {
      this.writeLockfile(lockfile, oid);
      return ref ? ref.oid : null;
    }

    // dont forget to release you IDIOT!
    lockfile.rollback();
    return this.updateSymref(
      path.join(this.pathname, ref.path), oid
    );
  }

  updateRef(name, oid) {
    this.updateRefFile(
      path.join(this.pathname, name), oid
    );
  }

  listBranches() {
    const branches = this.listRefs(this.headsPath);
    //console.log('Refs#listBranches', branches);
    return branches;
  }

  listRefs(dirname) {
    //console.log('Refs#listRefs', dirname);
    try {
      const names = fs
        .readdirSync(dirname)
        .filter((dir) => dir !== '.' && dir !== '..');
    
      const res = names
        .map((name) => path.join(dirname, name))
        .map((pathname) => {
          if(fs.statSync(pathname).isDirectory()) {
            return this.listRefs(pathname);
          } else {
            const relative = path.relative(this.pathname, pathname);
            return new SymRef(this, relative);
          }
        });
      const flatten = [].concat(...res);
      //console.log('inner listRefs', res);
      return flatten;
    } catch(e) {
      if(e.code === 'ENOENT') {
        return [];
      }
      throw e;
    }
  }

  shortName(pathname) {
    pathname = path.join(this.pathname, pathname);
    
    const prefix = [
      this.remotesPath,
      this.headsPath,
      this.pathname,
    ].find((dir) => {
      return this
        .ascend(path.dirname(pathname))
        .find((parent) => parent === dir);
    });

    const relative = path.relative(prefix, pathname);
    //console.log('Refs#shortName', prefix, pathname, relative);
    return relative;
  }

  descend(pathname) {
    const pathArr = pathname.split(path.sep);
    const descends = [];
    for(let i = 0; i < pathArr.length; i++) {
      const descend = [];
      for(let j = 0; j <= i; j++) {
        descend.push(pathArr[j]);
      }
      descends.push(descend.join(path.sep));
    }
    return descends;
  }

  ascend(pathname) {
    const descends = this.descend(pathname);
    return descends.reverse();
  }

  deleteBranch(branchName) {
    const pathname = path.join(this.headsPath, branchName);
    //console.log('Refs#deleteBranch', branchName);
    //console.log(fs.readdirSync(path.dirname(this.headsPath)));

    const lockfile = new Lockfile(pathname);
    try {
      lockfile.holdForUpdate();

      const oid = this.readSymref(pathname);
      if(oid !== null) {
        const err = new Error(`branch '${branchName}' not found`);
        err.code = 'InvalidBranch';
        throw err;
      }

      fs.unlinkSync(pathname);

      //console.log(fs.readdirSync(path.dirname(pathname)));

      return oid;

    } finally {
      lockfile.rollback();
    }
  }

  reverseRefs() {
    const table = {};
    //console.log('reverseRefs', this.listAllRefs());
    this.listAllRefs().forEach((ref) => {
      const oid = ref.readOid();
      if(oid !== null) {
        table[oid] = table[oid] || [];
        table[oid].push(ref);
      } 
    });
    //console.log(table);
    return table;
  }

  listAllRefs() {
    return [
      new SymRef(this, Refs.HEAD),
      ...this.listRefs(this.refsPath),
    ];
  }

};

Refs.INVALID_NAME = /^\.|\/\.|\.\.|\/$|\.lock$|@\{|[\x00-\x20*:?\[\\^~\x7f]]/;
Refs.INVALID_BRANCH = 'InvalidBranch';

Refs.REFS_DIR = 'refs';
Refs.HEADS_DIR = path.join(Refs.REFS_DIR, 'heads');
Refs.REMOTES_DIR = path.join(Refs.REFS_DIR, 'remotes');

Refs.HEAD = 'HEAD';
Refs.ORIG_HEAD = 'ORIG_HEAD';

module.exports = Refs;

