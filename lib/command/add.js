const path = require('path');

const Base = require('./base');
const Repository = require('../repository');
const Blob = require('../database/blob');

class Add extends Base {

  run() {
    try {
      // check if we can use .git/index
      this.repo.index().loadForUpdate();
      // get all files especified in the argvs list
      this.expandedPaths().forEach((path) => {
        // for each file stored it in the index
        this.addToIndex(path);
      });
      this.repo.index().writeUpdates();
      this.exit(0);

    } catch(e) {
      if(e.code === 'LockDenied') {
        this.handleLockedIndex(e.message);
      } else if(e.code === 'MissingFile') {
        this.handleMissingFile(e.message);
      } else if(e.code === 'NoPermission') {
        this.handleUnreadableFile(e.message);
      } else {
        // throw again, to be able to catched by
        // outher throw catch block located at
        // base.js (execute function)
        throw e;
      }
    }
  }

  expandedPaths() {
    const paths = [];
    for(let i = 0; i < this.args.length; i++) {
      const pathFromArgv = this.args[i];
      const pathToAdd = this.repo.workspacePathToAdd(pathFromArgv);
      const listFiles = this.repo.workspace().listFiles(pathToAdd);
      //console.log('add listFiles', listFiles);
      paths.push(listFiles);
    }
    const flattenPaths = [].concat(...paths);
    return flattenPaths;
  }

  addToIndex(file) {
    const data = this.repo.workspace().readFile(file);
    const stat = this.repo.workspace().statFile(file);
    const blob = new Blob(data);
    this.repo.database().store(blob);
    this.repo.index().add(file, blob.oid, stat);
  }

  handleLockedIndex(e) {
    this.stderr.write(`${e}\n`);
    this.stderr.write(Add.LOCKED_INDEX_MESSAGE);
    this.exit(128);
  }

  handleMissingFile(e) {
    this.stderr.write(`${e}\n`);
    this.repo.index().releaseLock();
    this.exit(128);
  }

  handleUnreadableFile(e) {
    this.stderr.write(`${e}\n`);
    this.stderr.write('fatal: adding files failed\n');
    this.repo.index().releaseLock();
    this.exit(128)
  }

};

Add.LOCKED_INDEX_MESSAGE = `
Another git process seems to be running in this repository, e.g.
an editor opened by 'git commit'. Please make sure all processes
are terminated then try again. If it still fails, a git process
may have crashed in this repository earlier:
remove the file manually to continue.
`;

module.exports = Add;

