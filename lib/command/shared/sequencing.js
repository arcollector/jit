const Secuencer = require('../../repository/sequencer');
const Resolve = require('../../merge/resolve');

module.exports = {

  CONFLICT_NOTES: [
    'after resolving the conflicts, mark the corrected paths',
    'with \'jit add <paths>\' or \'jit rm <paths>\'',
    'and commit the result with \'jit commit\'',
  ].join('\n'),

  defineOptions(options) {
    this.options.mode = 'run';

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'continue') {
          this.options.mode = 'continue';
       
        } else if(key === 'abort') {
          this.options.mode = 'abort';
        
        } else if(key === 'quit') {
          this.options.mode = 'quit';
       
        } else if(key === 'mainline') {
          this.options.mainline = value;
        }
      });
  },

  run() {
    if(this.options.mode === 'continue') {
      // the process will end here
      this.handleContinue();
    }
    if(this.options.mode === 'abort') {
      this.handleAbort();
    }
    if(this.options.mode === 'quit') {
      this.handleQuit();
    }

    try {
      this.sequencer().start(this.options);
      this.storeCommitSequence();
      this.resumeSequencer();

      this.exit(0);
    } catch(e) {
      if(e.code === 'Conflict') {
        this.failOnConflict();
      } else {
        throw e;
      }
    }
  },

  sequencer() {
    this._sequencer = this._sequencer || new Secuencer(this.repo);
    return this._sequencer;
  },

  resolveMerge(inputs) {
    this.repo.index().loadForUpdate();
    const merge = new Resolve(this.repo, inputs);
    merge.onProgress((info) => this.puts(info));
    merge.execute();
    this.repo.index().writeUpdates();
  },

  failOnConflict(inputs, message) {
    this.sequencer().dump();

    this.pendingCommit().start(inputs.rightOid, this.mergeType());

    this.editFile(
      this.pendingCommit().messagePath,
      (editor) => {
        editor.puts(message);
        editor.puts('');
        editor.puts('Conflicts:');
        this.repo.index().conflictPaths().forEach((name) => {
          editor.note(`\t${name}`);
        });
        editor.close();
      }
    );

    this.stderr.write(`error: could not apply ${inputs.rightName}\n`);
    this.CONFLICT_NOTES.split('\n').forEach((line) => {
      this.stderr.write(`hint: ${line}\n`);
    });
    this.exit(1);
  },

  finishCommit(commit) {
    this.repo.database().store(commit);
    this.repo.refs().updateHead(commit.oid);
    this.printCommit(commit);
  },

  handleContinue() {
    try {
      this.repo.index().load();

      if(this.pendingCommit().inProgress()) {
        // process will end here
        const mergeType = this.pendingCommit().mergeType();
        if(mergeType === 'cherry_pick') {
          this.writeCherryPickCommit();
        } else if(mergeType === 'revert') {
          this.writeRevertCommit();    
        }
      }

      this.sequencer().load();
      this.sequencer().dropCommand();
      this.resumeSequencer();

      this.exit(0);

    } catch(e) {
      if(e.code === 'Error') {
        this.stderr.write(`fatal: ${e.message}\n`);
        this.exit(128);
      } else {
        throw e;
      }
    }
  },

  resumeSequencer() {
    while(true) {
      const command = this.sequencer().nextCommand();
      if(!command) {
        break;
      }
      const [ action, commit ] = command;
      if(action === 'pick') {
        this.pick(commit);
      } else if(action === 'revert') {
        this.revert(commit);
      }
      this.sequencer().dropCommand();
    }

    this.sequencer().quit();
  },

  handleAbort() {
    if(this.pendingCommit().inProgress()) {
      this.pendingCommit().clear(this.mergeType());
    }
    this.repo.index().loadForUpdate();

    try {
      this.sequencer().abort();
    } catch(e) {
      this.stderr.write(`warning: ${e.message}`);
    }

    this.repo.index().writeUpdates();
    this.exit(0);
  },

  handleQuit() {
    if(this.pendingCommit().inProgress()) {
      this.pendingCommit().clear(this.mergeType());
    }
    this.sequencer().quit();
    this.exit(0);
  },

  selectParent(commit) {
    const mainline = this.sequencer().getOption('mainline');
    if(commit.merge()) {
      if(mainline) {
        return commit.parents[mainline - 1];
      } else {
        this.stderr.write('\n');
        this.stderr.write(`error: commit ${commit.oid} is a merge but no -m option was given\n`);
        this.exit(1);
      }
    } else {
      if(!mainline) {
        return commit.parent;
      } else {
        this.stderr.write('\n');
        this.stderr.write(`error: mainline was specified but commit ${commit.oid} is not a merge\n`);
        this.exit(1);
      }
    }
  }

};

