const path = require('path');

const Blob = require('../database/blob');
const Entry = require('../database/entry');
const Diff3 = require('./diff3');

module.exports = class Resolve {

  constructor(repository, inputs) {
    this.repo = repository;
    this.inputs = inputs;
  }

  onProgress(cb) {
    this.onProgressCallback = cb;
  }

  execute() {
    this.prepareTreeDiffs();

    const migration = this.repo.migration(this.cleanDiff);
    migration.applyChanges();

    this.addConflictsToIndex();
    this.writeUntrackedFiles();
  }

  prepareTreeDiffs() {
    this.untracked = {};
    const baseOid = this.inputs.baseOids[0];
    this.leftDiff = this.repo.database().treeDiff(
      baseOid, this.inputs.leftOid
    );
    this.rightDiff = this.repo.database().treeDiff(
      baseOid, this.inputs.rightOid
    );
    //console.log(this.leftDiff, this.rightDiff);
    this.cleanDiff = {};
    this.conflicts = {};

    Object.entries(this.rightDiff)
      .forEach(([path, [oldItem, newItem]]) => {
        if(newItem) {
          this.fileDirConflict(path, this.leftDiff, this.inputs.leftName);
        }
        this.samePathConflict(path, oldItem, newItem);
      });

    Object.entries(this.leftDiff)
      .forEach(([path, [_, newItem]]) => {
        if(newItem) {
          this.fileDirConflict(path, this.rightDiff, this.inputs.rightName);
        }
      });
  }

  samePathConflict(path, base, right) {
    if(!Object.keys(this.leftDiff).includes(path)) {
      this.cleanDiff[path] = [base, right];
      return;
    }

    const left = this.leftDiff[path][1];
    if(left === null && right === null) {
      return;
    }
    if(
      left !== null && right !== null &&
      left.oid === right.oid &&
      left.mode() === right.mode()
    ) {
      return;
    }

    if(left !== null && right !== null) {
      this.log(`Auto-merging ${path}`)
    }

    const [ oidOk, oid ] = this.mergeBlobs(
      base ? base.oid : null,
      left ? left.oid : null,
      right ? right.oid : null
    );
    const [ modeOk, mode ] = this.mergeModes(
      base ? base.mode() : null,
      left ? left.mode() : null,
      right ? right.mode() : null
    );

    this.cleanDiff[path] = [
      left, new Entry(oid, mode)
    ];
    if(oidOk && modeOk) {
      return;
    }

    this.conflicts[path] = [
      base, left, right
    ];
    this.logConflict(path);
  }

  merge3(base, left, right) {
    if(left === null) {
      return [false, right];
    }
    if(right === null) {
      return [false, left];
    }
    if(left === base || left === right) {
      return [true, right];
    } else if(right === base) {
      return [true, left];
    }
    return null;
  }

  mergeBlobs(baseOid, leftOid, rightOid) {
    const result = this.merge3(baseOid, leftOid, rightOid);
    if(result !== null) {
      return result;
    }

    const oids = [ baseOid, leftOid, rightOid ];
    const blobs = oids.map((oid) => oid ?
      this.repo.database().load(oid).data : new Buffer('')
    );
    //console.log(blobs);
    //console.log(blobs.map((blob) => blob.toString('utf-8')));
    const merge = Diff3.merge(...blobs);

    const data = merge.toString(
      this.inputs.leftName, this.inputs.rightName
    );
    //console.log(data);
    const blob = new Blob(new Buffer(data));
    this.repo.database().store(blob);

    return [merge.clean(), blob.oid];
  }

  mergedData(leftOid, rightOid) {
    const leftBlob = this.repo.database().load(leftOid);
    const rightBlob = this.repo.database().load(rightOid);
    return Buffer.from([
      `<<<<<<< ${this.inputs.leftName}\n`,
      leftBlob.data,
      '\n=======\n',
      rightBlob.data,
      `\n>>>>>>> ${this.inputs.rightName}\n`,
    ].join(''));
  }

  mergeModes(baseMode, leftMode, rightMode) {
    return this.merge3(baseMode, leftMode, rightMode) ||
      [false, leftMode];
  }

  addConflictsToIndex() {
    Object
      .entries(this.conflicts)
      .forEach(([path, items]) => {
        this.repo.index().addConflictSet(path, items);
    });
  }

  fileDirConflict(pathname, diff, name) {
    this.ascend(path.dirname(pathname))
      .forEach((parent) => {
        if(!(parent in diff)) {
          return;
        }
        const [oldItem, newItem] = diff[parent];
        if(!newItem) {
          return;
        }
        if(name === this.inputs.leftName) {
          this.conflicts[parent] = [oldItem, newItem, null];
        } else if(name === this.inputs.rightName) {
          this.conflicts[parent] = [oldItem, null, newItem];
        }

        delete this.cleanDiff[parent];
        const rename = `${parent}~${name}`;
        this.untracked[rename] = newItem;

        if(!this.diff[pathname]) {
          this.log(`Adding ${pathname}`);
        }
        this.logConflict(parent, rename);
      });
  }

  writeUntrackedFiles() {
    Object.entries(this.untracked)
      .forEach(([path, item]) => {
        const blob = this.repo.database().load(item.oid);
        this.repo.workspace().writeFile(path, blob.data);
      });
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

  log(message) {
    this.onProgressCallback(message);
  }

  logConflict(path, rename = null) {
    const [ base, left, right ] = this.conflicts[path];
    if(left && right) {
      this.logLeftRightConflict(path);
    } else if(base && (left || right)) {
      this.logModifyDeleteConflict(path, rename);
    } else {
      this.logFileDirectoryConflict(path, rename);
    }
  }

  logLeftRightConflict(path) {
    const type = this.conflicts[path][0] ? 'content' : 'add/add';
    this.log(`CONFLICT (${type}): Merge conflict in ${path}`);
  }

  logModifyDeleteConflict(path, rename) {
    const [ deleted, modified ] = this.logBranchNames(path);
    rename = rename ? ` at ${rename}` : '';
    this.log(`CONFLICT (modify/delete): ${path} deleted in ${deleted} and modified in ${modified}`);
    this.log(`Version ${modified} of ${path} left in tree at ${rename}`);
  }

  logBranchNames(path) {
    const a = this.inputs.leftName;
    const b = this.inputs.rightName;
    this.conflicts[path][1] ? [ b, a ] : [ a, b];
  }

  logFileDirectoryConflict(path, rename) {
    const type = this.conflicts[path][1] ? 'file/directory' : 'directory/file';
    const [ branch ] = this.logBranchNames(path);
    this.log(`CONFLICT (${type}): There is a directory with name ${path} in ${branch}`);
    this.log(`Adding ${path} as ${rename}`);
  }
};

