const Base = require('./base');

class Status extends Base {

  run() {
    this.repo
      .index()
      .loadForUpdate();

    this.status = this.repo.status();

    this.repo
      .index()
      .writeUpdates();

    this.printResults();
    
    this.exit(0);
  }

  setOptions(minimistRes) {
    this.options.format = 'long';
    Object.entries(minimistRes)
      .forEach(([key, val]) => {
        if(key === 'porcelain') {
          this.options.format = 'porcelain';
        }  
    });
  }

  printResults() {
    if(this.options.format === 'porcelain') {
      this.printPorcelainFormat();
    } else { // long
      this.printLongFormat();
    }
  }

  printPorcelainFormat() {
    Array.from(this.status.changed)
      .sort((a,b) =>
        a.localeCompare(b)
      )
      .forEach((path) => {
        const status = this.statusFor(path);
        this.puts(`${status} ${path}`)
      });

    Array.from(this.status.untrackedFiles)
      .sort((a,b) =>
        a.localeCompare(b)
      )
      .forEach((path) =>
        this.puts(`?? ${path}`)
      );
  }

  statusFor(path) {
    if(path in this.status.conflicts) {
      // stageCodes in array of numbers
      const stageCodes = this.status.conflicts[path];
      return Status.CONFLICT_SHORT_STATUS[stageCodes.toString()];

    } else {
      const indexStatus = this.status.indexChanges[path];
      const left = indexStatus ? Status.SHORT_STATUS[indexStatus] : ' ';

      const workspaceStatus = this.status.workspaceChanges[path];
      const right = workspaceStatus ? Status.SHORT_STATUS[workspaceStatus] : ' ';  

      const status = `${left}${right}`;
      return status;
    }
  }

  printLongFormat() {
    this.printBranchStatus();
    this.printPendingCommitStatus();

    this.printChanges(
      'Changes to be committed',
      // hash map -> [ [path, type], ... ]
      Object.entries(this.status.indexChanges),
      'green'
    );
    this.printChanges(
      'Unmerged paths',
      // hash map -> [ [path, [stage1, stage2, ...]], ... ]
      Object.entries(this.status.conflicts),
      'red',
      'conflict'
    );
    this.printChanges(
      'Changes not staged for commit',
      // hash map -> [ [path, type], ... ]
      Object.entries(this.status.workspaceChanges),
      'red'
    );
    this.printChanges(
      'Untracked files',
      // set map -> [ [path], ... ]
      Array
        .from(this.status.untrackedFiles)
        .map((path) => [path]),
      'red'
    );
    this.printCommitStatus();
  }

  printPendingCommitStatus() {
    const mergeType = this.repo.pendingCommit().mergeType();
    if(mergeType === 'merge') {
      if(Object.values(this.status.conflicts).length === 0) {
        this.puts('All conflicts fixed but you are still merging.');
        this.hint('use \'jit commit\' to conclude merge');
      } else {
        this.puts('You have unmerged paths.');
        this.hint('fix conflicts and run \'jit commit\'');
        this.hint('use \'jit merge --abort\' to abort the merge');
      }
      this.puts('');
    } else if(mergeType === 'cherry_pick') {
      this.printPendingType('cherry-pick');
    } else if(mergeType === 'revert') {
      this.printPendingType('revert');
    }
  }

  printPendingType(op) {
    const oid = this.repo.database().shortOid(
      this.repo.pendingCommit().mergeOid()
    );
    this.puts(`You are currently ${op}ing commit ${oid}`);
    if(Object.values(this.status.conflicts).length === 0) {
      this.hint(`all conflicts fixed: run 'jit ${op} --continue'`);
    } else {
      this.hint(`fix conflicts and run 'jit ${op} --continue'`);
    }
    this.hint(`use 'jit ${op} --abort' to cancel the ${op} operation`);
    this.puts('');
  }

  hint(message) {
    this.puts(`\t(${message})`);
  }

  printChanges(message, entries, style, labelSet = 'normal') {
    if(entries.length === 0) {
      return;
    }

    const labels = Status.UI_LABELS[labelSet];
    const width = Status.UI_WIDTHS[labelSet];

    this.puts(message);
    this.puts('');
   
    console.log(entries);
    console.log( 

    entries
      .map(([path]) => path)
      .sort((a, b) => a.localeCompare(b))
      .map((path) =>
        [
          path, 
          entries.find(([cur]) => cur === path)
        ]
      )
    );
 
    entries
      .map(([path]) => path)
      .sort((a, b) => a.localeCompare(b))
      .map((path) =>
        [
          path,
          entries.find(([cur]) => cur === path)[1]
        ]
      )
      .forEach(([path, type]) => {
        console.log(path, type)
        // type can be a string or array of numbers
        const status = type ?
          labels[type.toString()].padEnd(width, ' ') :
          '';
        console.log(status);
        const text = `${status}${path}`;
        const formattedText = this.fmt(style, text);
        this.puts(`\t${formattedText}`);
      });

    this.puts('');
  }

  printCommitStatus() {
    // if there are index changes present, nothing is printed
    if(Object.values(this.status.indexChanges).length !== 0) {
      return;
    }
    
    if(Object.values(this.status.workspaceChanges).length !== 0) {
      this.puts('no changes added to commit');

    } else if(this.status.untrackedFiles.size !== 0) {
      this.puts('nothing added to commit but untracked files present');
    } else {
      this.puts('nothing to commit, working tree clean');
    }
  }

};

Status.SHORT_STATUS = {
  ['deleted']: 'D',
  ['modified']: 'M',
  ['added']: 'A',
};

Status.LONG_STATUS = {
  ['deleted']: 'deleted:',
  ['modified']: 'modified:',
  ['added']: 'new file:',
};

Status.LABEL_WIDTH = 12;

Status.CONFLICT_LABEL_WIDTH = 17;

Status.CONFLICT_LONG_STATUS = {
  '1,2,3': 'both modified:',
  '1,2': 'deleted by them:',
  '1,3': 'deleted by us:',
  '2,3': 'both added:',
  '2': 'added by us:',
  '3': 'added by them:',
};

Status.UI_LABELS = {
  normal: Status.LONG_STATUS,
  conflict: Status.CONFLICT_LONG_STATUS,
};

Status.UI_WIDTHS = {
  normal: Status.LABEL_WIDTH,
  conflict: Status.CONFLICT_LABEL_WIDTH,
};

Status.CONFLICT_SHORT_STATUS = {
  '1,2,3': 'UU',
  '1,2': 'UD',
  '1,3': 'DU',
  '2,3': 'AA',
  '2': 'AU',
  '3': 'UA',
};

module.exports = Status;

