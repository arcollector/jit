const path = require('path');

const Inspector = require('./inspector');

class Migration {

  constructor(repository, treeDiff) {
    this.repo = repository;
    this.diff = treeDiff;
    this.inspector = new Inspector(repository);

    this.errors = [];
    this.conflicts = {
      staleFile: new Set(),
      staleDirectory: new Set(),
      untrackedOverwritten: new Set(),
      untrackedRemoved: new Set(),
    };

    this.changes = {
      create: [],
      update: [],
      delete: [],
    };
    this.mkdirs = new Set();
    this.rmdirs = new Set();
  }

  applyChanges() {
    this.planChanges();
    this.updateWorkspace();
    this.updateIndex();
  }

  planChanges() {
    Object.entries(this.diff).forEach(([pathname, [oldItem, newItem]]) => {
      this.checkForConflict(pathname, oldItem, newItem);
      this.recordChange(pathname, oldItem, newItem);
    });

    this.collectErrors();
  }

  checkForConflict(path, oldItem, newItem) {
    //console.log('checkForConflict', path, oldItem, newItem);
    const entry = this.repo.index().entryForPath(path);
    if(this.indexDiffersFromTrees(entry, oldItem, newItem)) {
      this.conflicts.staleFile.add(path);
      return;
    }

    const stat = this.repo.workspace().statFile(path);
    const type = this.getErrorType(stat, entry, newItem);

    if(stat === null) {
      const parent = this.untrackedParent(path);
      if(parent) {
        this.conflicts[type].add(entry ? path : parent);
      }
    } else if(stat.isFile()) {
      const changed = this.inspector.compareIndexToWorkspace(entry, stat);
      if(changed) {
        this.conflicts[type].add(path);
      }
    } else if(stat.isDirectory()) {
      const trackable = this.inspector.trackableFile(path, stat);
      if(trackable) {
        this.conflicts[type].add(path);
      }
    }
  }

  indexDiffersFromTrees(entry, oldItem, newItem) {
    const val1 = this.inspector.compareTreeToIndex(oldItem, entry);
    const val2 = this.inspector.compareTreeToIndex(newItem, entry);
    return typeof val1 === 'string' &&
      typeof val2 === 'string';
  }

  untrackedParent(pathname) {
    const dirname = path.dirname(pathname);
    //'a/b/c' -> [ 'a/b/c', 'a/b', 'a' ]
    const arr = this.ascend(dirname);
    // return undefined or parent element
    return arr.find((parent) => {
      if(parent === '.') {
        // next
      } else {
        const parentStat = this.repo.workspace().statFile(parent);
        if(!parentStat || !parentStat.isFile()) {
          // next
        } else {
          return this.inspector.trackableFile(parent, parentStat);
        }
      }
    });
  }

  getErrorType(stat, entry, item) {
    //console.log('getErrorType', stat, entry, item);
    if(entry) {
      return 'staleFile';
    } else if(stat && stat.isDirectory()) {
      return 'staleDirectory';
    } else if(item) {
      return 'untrackedOverwritten';
    } else {
      return 'untrackedRemoved';
    }
  }

  collectErrors() {
    Object.entries(this.conflicts)
      .forEach(([type, pathsSet]) => {
        const paths = Array.from(pathsSet);
        if(paths.length === 0) {
          // next
        } else {
          //console.log('paths', paths);
          const lines = paths.map((name) => `\t${name}`);
          const [ header, footer ] = Migration.MESSAGES[type];
          this.errors.push([header, ...lines, footer].join('\n'));
        }
      });

    if(this.errors.length !== 0) {
      const error = new Error('Conflict');
      error.code = 'Conflict';
      throw error;
    }
  }

  recordChange(pathname, oldItem, newItem) {
    const dirname = path.dirname(pathname);
    const arr = this.descend(dirname);
    let action;
    if(oldItem === null) {
      arr.forEach((p) => this.mkdirs.add(p));
      action = 'create';
    } else if(newItem === null) {
      arr.forEach((p) => this.rmdirs.add(p));
      action = 'delete';
    } else {
      action = 'update';
    }
    //console.log('migration#recordChange:');
    //console.log(action, pathname, newItem);
    this.changes[action].push([pathname, newItem]);
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

  updateWorkspace() {
    this.repo.workspace().applyMigration(this);
  }

  blobData(oid) {
    return this.repo.database().load(oid).data;
  }

  updateIndex() {
    this.changes['delete']
      .forEach(([path]) => {
        this.repo.index().remove(path);
      })

    //console.log('updateIndex');
    //console.log(this.changes);

    // BUG: this dont work
    //['create', 'update'].forEach((action) => {

      this.changes['create']
        .forEach(([path, entry]) => {
          const stat = this.repo.workspace().statFile(path);
          this.repo.index().add(path, entry.oid, stat);
        });

      this.changes['update']
        .forEach(([path, entry]) => {
          const stat = this.repo.workspace().statFile(path);
          this.repo.index().add(path, entry.oid, stat);
        });

    //});
  }

};

Migration.MESSAGES = {
  'staleFile': [
    'Your local changes to the following files would be overwritten by checkout:',
    'Please commit your changes or stash them before you switch branches.',
  ],

  'staleDirectory': [
    'Updating the following directories would lose untracked files in them:',
    '\n',
  ],

  'untrackedOverwritten': [
    'The following untracked working tree files would be overwritten by checkout:',
    'Please move or remove the before you switch branches.',
  ],

  'untrackedRemoved': [
    'The following untracked working tree files would be removed by checkout:',
    'Please move or remove the before you switch branches.',
  ],

};

module.exports = Migration;
