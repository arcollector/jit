const path = require('path');

const Inspector = require('./inspector');

module.exports = class Status {

  constructor(repository, commitOid = null) {
    this.repo = repository;
    this.inspector = new Inspector(repository);

    this.stats = {};
    this.changed = new Set();
    this.indexChanges = {};
    this.conflicts = {};
    this.workspaceChanges = {};
    this.untrackedFiles = new Set();
    this.commitOid = commitOid || this.repo.refs().readHead();
    this.headTree = this.repo.database().loadTreeList(this.commitOid);
 
    // scan files in current workspace, and internally
    // it will detect untracked files, and also will fill
    // up the this.stats object
    this.scanWorkspace();
    //console.log('untracked files are', this.untrackedFiles);

    this.loadHeadTree();
    //console.log('head tree files are', this.headTree);

    // look for changed files
    this.checkIndexEntries();
    //console.log('index changes files are', this.indexChanges);

    this.collectDeletedHeadFiles();
  }

  scanWorkspace(prefix = null) {
    // this will return an object like
    // { 'path': statObject }
    const content = this.repo
      .workspace()
      .listDir(prefix);

    Object.entries(content)
      .forEach(([pathname, stat]) => {
        //console.log('scanWorkspace', pathname);
        //console.log('isTracked?', this.repo.index().tracked(pathname));
        if(this.repo.index().tracked(pathname)) {
          if(stat.isFile()) {
            this.stats[pathname] = stat;
          }
          // keep scanning if directory
          if(stat.isDirectory()) {
            //console.log('\tis a directory!');
            this.scanWorkspace(pathname);
          }
        } else if(this.trackableFile(pathname, stat)) {
          let fileOrDirectoryUntracked = pathname;
          if(stat.isDirectory()) {
            fileOrDirectoryUntracked = `${fileOrDirectoryUntracked}${path.sep}`;
          }
          //console.log('\tadding', fileOrDirectoryUntracked);
          this.untrackedFiles.add(fileOrDirectoryUntracked);
        }
      });
  }

  loadHeadTree() {
    const headOid = this.repo.refs().readHead();
    if(headOid === null) {
      return;
    }
    const commit = this.repo.database().load(headOid);
    this.readTree(commit.tree);
  }

  readTree(treeOid, prefix = '') {
    const tree = this.repo.database().load(treeOid);
    tree.eachEntry().forEach(([name, entry]) => {
      const pathname = path.join(prefix, name);
      //console.log(prefix, name, 'pathname:', pathname);
      if(entry.tree()) {
        this.readTree(entry.oid, pathname);
      } else {
        this.headTree[pathname] = entry;
      }
    });
  }

  trackableFile(path, stat) {
    //console.log('trackableFile', path);
    if(!stat) {
      //console.log('\tnot stat');
      return false;
    }

    // not tracked means a file that is not
    // present in the .git/index file
    if(
      stat.isFile() &&
      !this.repo.index().tracked(path)
    ) {
      //console.log('\tis file and is not tracked');
      return true;
    }

    if(!stat.isDirectory()) {
      //console.log('\tis a directory');
      return false;
    }

    let items = Object.entries(this.repo.workspace().listDir(path));
    let files = items.filter(([_, itemStat]) => itemStat.isFile());
    let dirs = items.filter(([_, itemStat]) => itemStat.isDirectory());
    for(const list of [files, dirs]) {
      for(const file of list) {
        const [itemPath, itemStat] = file;
        if(this.trackableFile(itemPath, itemStat)) {
          return true;
        }
      }
    }
    return false;
  }

  checkIndexEntries() {
    this.repo
      .index()
      .eachEntry()
      .forEach((entry) => {
        if(entry.stage() === 0) {
          this.checkIndexAgainstWorkspace(entry);
          this.checkIndexAgainstHeadTree(entry);
        } else {
          this.changed.add(entry.path);
          this.conflicts[entry.path] = this.conflicts[entry.path] || [];
          this.conflicts[entry.path].push(entry.stage()); 
        }
      });
  }

  checkIndexAgainstWorkspace(entry) {
    const stat = this.stats[entry.path];
    const status = this.inspector.compareIndexToWorkspace(entry, stat);
    if(status) {
      console.log('checkIndexAgainstWorkspace', entry.path, status);
      this.recordChange(entry.path, this.workspaceChanges, status);
    } else {
      this.repo.index().updateEntryStat(entry, stat);
    }
  }

  checkIndexAgainstHeadTree(entry) {
    const item = this.headTree[entry.path];
    const status = this.inspector.compareTreeToIndex(item, entry);
    if(status) {
      //console.log('checkIndexAgainstHeadTree', entry.path, status);
      this.recordChange(entry.path, this.indexChanges, status);
    }
  }

  collectDeletedHeadFiles() {
    Object.entries(this.headTree).forEach(([path]) => {
      if(!this.repo.index().trackedFile(path)) {
        this.recordChange(path, this.indexChanges, 'deleted');
      } 
    });
  }

  recordChange(path, set, type) {
    this.changed.add(path);
    set[path] = type;
  }
 
};

