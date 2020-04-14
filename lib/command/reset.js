const Base = require('./base');
const Revision = require('../revision');
const Refs = require('../refs');

class Reset extends Base {

  run() {
    this.selectCommitOid();

    this.repo.index().loadForUpdate();
    this.resetFiles();
    this.repo.index().writeUpdates();

    if(this.args.length === 0) {
      const headOid = this.repo.refs().updateHead(this.commitOid);
      this.repo.refs().updateRef(Refs.ORIG_HEAD, headOid);
    }
    this.exit(0);
  }

  setOptions(options) {
    this.options.mode = 'mixed';

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'soft') {
          this.options.mode = 'soft';
   
        } else if(key === 'mixed') {
          this.options.mode = 'mixed';
        
        } else if(key === 'hard') {
          this.options.mode = 'hard';
        }
      });
  }

  selectCommitOid() {
    try {
      const revision = this.args[0] || Revision.HEAD;
      this.commitOid = new Revision(this.repo, revision).resolve();
      this.args.shift();
    } catch(e) {
      if(e.code === 'InvalidObject') {
        this.commitOid = this.repo.refs().readHead();
      } else {
        throw e;
      }
    }
  }

  resetFiles() {
    if(this.options.mode === 'soft') {
      return;
    }
    if(this.options.mode === 'hard') {
      this.repo.hardReset(this.commitOid);
      return;
    }

    if(this.args.length === 0) {
      this.repo.index().clearForce();
      this.resetPath(null);
    } else {
      this.args.forEach((path) => {
        this.resetPath(path);
      });
    }
  }

  resetPath(path) {
    console.log('Reset#resetPath', this.commitOid, path);
    const listing = this.repo
      .database()
      .loadTreeList(
        this.commitOid, path
      );

    //console.log('Reset#resetPath', listing);
    if(path) {
      this.repo.index().remove(path);
    }

    Object.entries(listing)
      .forEach(([path, entry]) => {
        this.repo.index().addFromDb(path, entry);
      });
  }

}

module.exports = Reset;
