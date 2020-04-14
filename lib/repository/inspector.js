const Blob = require('../database/blob');

module.exports = class Inspector {

  constructor(repository) {
    this.repo = repository;
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

  compareIndexToWorkspace(entry, stat) {
    if(!entry) {
      return 'untracked';
    }
    if(!stat) {
      return 'deleted';
    }
    if(!entry.statMatch(stat)) {
      return 'modified';
    }
    if(entry.timesMatch(stat)) {
      return null;
    }
    
    const data = this.repo.workspace().readFile(entry.path);
    const blob = new Blob(data);
    const oid = this.repo.database().hashObject(blob);

    if(entry.oid !== oid) {
      return 'modified';
    }
  }

  compareTreeToIndex(item, entry) {
    if(!item && !entry) {
      return null;
    }
    if(!item) {
      return 'added';
    }
    if(!entry) {
      return 'deleted';
    }

    if(
      entry.mode() !== item.mode() ||
      entry.oid !== item.oid
    ) {
      return 'modified';
    }
  }
}


