const Base = require('./base');

const Inspector = require('../repository/inspector');

class Rm extends Base {

  run() {
    try {
      this.repo.index().loadForUpdate();

      this.headOid = this.repo.refs().readHead();
      this.inspector = new Inspector(this.repo);
      this.uncommitted = [];
      this.unstaged = [];
      this.bothChanged = [];

      this.args = [].concat(
        ...this.args.map((path) =>
          this.expandPath(path)
        )
      );

      this.args.forEach((path) =>
        this.planRemoval(path)
      );
      this.exitOnErrors();

      this.args.forEach((path) =>
        this.removeFile(path)
      );
      this.repo.index().writeUpdates();

      this.exit(0);

    } catch(e) {
      this.repo.index().releaseLock();
      //throw e;
      this.stderr.write(`fatal: ${e.message}\n`);
      this.exit(128);
    }
  }

  setOptions(options) {
    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'cached') {
          this.options.cached = true;
   
        } else if(key === 'f' || key === 'force') {
          this.options.force = true;
        
        } else if(key === 'r') {
          this.options.recursive = true;
        }
      });
  }

  expandPath(path) {
    if(this.repo.index().trackedDirectory(path)) {
      if(this.options.recursive) {
        return this.repo.index().childPaths(path);
      }
      throw `not removing '${path}' recursively without -r`;
    }

    if(this.repo.index().trackedFile(path)) {
      return [path];
    }

    throw `pathspec '${path}' did not match any files`;
  }

  planRemoval(path) {
    if(this.options.force) {
      return;
    }

    const stat = this.repo.workspace().statFile(path);
    if(stat !== null && stat.isDirectory()) {
      throw `jit rm: '${path}': Operation not permitted`;
    }

    const item = this.repo.database().loadTreeEntry(
      this.headOid, path
    );
    const entry = this.repo.index().entryForPath(path);

    // TODO: i dont why this can be return null or undefined
    const stagedChange = this.inspector.compareTreeToIndex(item, entry);
    const unstagedChange = stat !== null ?
      this.inspector.compareIndexToWorkspace(entry, stat) :
      null;

    if(stagedChange && unstagedChange !== null) {
      this.bothChanged.push(path);
    } else if(stagedChange) {
      if(!this.options.cached) {
        this.uncommitted.push(path);
      }
    } else if(unstagedChange !== null) {
      if(!this.options.cached) {
        this.unstaged.push(path);
      }
    }
  }

  exitOnErrors() {
    if(
      this.bothChanged.length === 0 &&
      this.uncommitted.length === 0 &&
      this.unstaged.length === 0
    ) {
      return;
    }

    this.printErrors(this.bothChanged, Rm.BOTH_CHANGED);
    this.printErrors(this.uncommitted, Rm.INDEX_CHANGED);
    this.printErrors(this.unstaged, Rm.WORKSPACE_CHANGED);

    this.repo.index().releaseLock();
    this.exit(1);
  }

  printErrors(paths, message) {
    if(paths.length === 0) {
      return;
    }

    const filesHave = paths.length === 1 ? 'file has' : 'files have';
    this.stderr.write(`error: the following ${filesHave} ${message}:\n`);
    paths.forEach((path) =>
      this.stderr.write(`\t${path}\n`)
    );
  }

  removeFile(path) {
    this.repo.index().remove(path);
    if(!this.options.cached) {
      this.repo.workspace().remove(path);
    }
    this.puts(`rm '${path}'`);
  }

}

Rm.BOTH_CHANGED = 'staged content different from both the file and the HEAD';
Rm.INDEX_CHANGED = 'changes staged in the index';
Rm.WORKSPACE_CHANGED = 'local modifications';

module.exports = Rm;
