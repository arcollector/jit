const path = require('path');
const fs = require('fs');

class PendingCommit {

  constructor(pathname) {
    this.pathname = pathname; 
    this.messagePath = path.join(pathname, 'MERGE_MSG');
  }

  start(oid, type = 'merge') {
    const pathname = path.join(
      this.pathname, PendingCommit.HEAD_FILES[type]
    );
    fs.writeFileSync(pathname, `${oid}\n`);
  }

  clear(type = 'merge') {
    const headPath = path.join(
      this.pathname,
      PendingCommit.HEAD_FILES[type]
    );
    try {
      fs.unlinkSync(headPath);
      fs.unlinkSync(this.messagePath);
    } catch(e) {
      const name = path.basename(headPath);
      const error = new Error(
        `There is no merge to abort (${name} missing).`
      );
      error.code = 'Error';
      throw error;
    }
  }

  inProgress() {
    return this.mergeType() !== null;
  }

  mergeOid(type = 'merge') {
    const headPath = path.join(
      this.pathname,
      PendingCommit.HEAD_FILES[type]
    );
    try {
      return fs.readFileSync(headPath, 'utf-8').trim();
    } catch(e) {
      const name = path.basename(headPath);
      const error = new Error(
        `There is no merge in progress (${name} missing).`
      );
      error.code = 'Error';
      throw error;
    }
  }

  mergeMessage() {
    return fs.readFileSync(this.messagePath, 'utf-8');
  }

  mergeType() {
    const found = Object
      .entries(PendingCommit.HEAD_FILES)
      .find(([type, name]) => {
        try {
          return fs.statSync(
            path.join(this.pathname, name)
          ).isFile();
        } catch(e) {
          return false;
        }
      });

    if(typeof found !== 'undefined') {
      return found[0];
    } else {
      return null;
    }
  }

}

PendingCommit.HEAD_FILES = {
  merge: 'MERGE_HEAD',
  cherry_pick: 'CHERRY_PICK_HEAD',
  revert: 'REVERT_HEAD',
};

module.exports = PendingCommit;

