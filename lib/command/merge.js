
const Base = require('./base');
const Revision = require('../revision');
const Inputs = require('../merge/inputs');
const Resolve = require('../merge/resolve');
const Refs = require('../refs');
const {
  readMessage,
  commitMessagePath,
  currentAuthor,
  writeCommit,
  writeTree,
  pendingCommit,
  resumeMerge,
  writeMergeCommit,
  handleConflictedIndex,
  CONFLICT_MESSAGE,
  MERGE_NOTES,
} = require('./shared/write.commit');

class Merge extends Base {

  constructor(
    dir,
    env,
    args,
    stdin,
    stdout,
    stderr
  ) {
    super(
      dir,
      env,
      args,
      stdin,
      stdout,
      stderr
    );

    this.readMessage = readMessage;
    this.commitMessagePath = commitMessagePath;
    this.currentAuthor = currentAuthor;
    this.writeCommit = writeCommit;
    this.writeTree = writeTree;
    this.pendingCommit = pendingCommit;
    this.resumeMerge = resumeMerge;
    this.writeMergeCommit = writeMergeCommit;
    this.handleConflictedIndex = handleConflictedIndex;
    this.CONFLICT_MESSAGE = CONFLICT_MESSAGE;
    this.MERGE_NOTES = MERGE_NOTES;
  }

  setOptions(options) {
    this.options.mode = 'run';

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'abort') {
          this.options.mode = 'abort';

        } else if(key === 'continue') {
          this.options.mode = 'continue';
        }
      });
  }

  run() {
    if(this.options.mode === 'abort') {
      // process will end here
      this.handleAbort();
    }
    if(this.options.mode === 'continue') {
      // process will end here
      this.handleContinue();
    }
    if(this.pendingCommit().inProgress()) {
      // process will end here
      this.handleInProgressMerge();
    }

    this.inputs = new Inputs(
      this.repo, Revision.HEAD, this.args[0]
    );
    this.repo.refs().updateRef(
      Refs.ORIG_HEAD, this.inputs.leftOid
    );

    if(this.inputs.alreadyMerged()) {
      this.handleMergedAncestor();
    }
    if(this.inputs.fastForward()) {
      this.handleFastForward();
    }
    this.pendingCommit().start(
      this.inputs.rightOid
    );

    this.resolveMerge();
    this.commitMerge();
    this.exit(0);
  }

  resolveMerge() {
    this.repo.index().loadForUpdate();

    const merge = new Resolve(this.repo, this.inputs);
    merge.onProgress((info) => this.puts(info));
    merge.execute();
    this.repo.index().writeUpdates();
    if(this.repo.index().conflict()) {
      this.failOnConflict();
    }
  }

  failOnConflict() {
    this.editFile(
      this.pendingCommit().messagePath,
      (editor) => {
        editor.puts(this.readMessage() || this.defaultCommitMessage);
        editor.puts('');
        editor.note('Conflicts:');
        this.repo.index().conflictPaths().forEach((name) =>
          editor.note(`\t${name}`)
        );
        editor.close();
      }
    );
    this.puts('Automatic merge failed; fix conflicts and then commit the result.');
    this.exit(1);
  }

  defaultCommitMessage() {
    return `Merge commit '${this.inputs.rightName}'`;
  }

  commitMerge() {
    const parents = [
      this.inputs.leftOid,
      this.inputs.rightOid,
    ];
    const message = this.composeMessage();

    this.writeCommit(parents, message);

    this.pendingCommit().clear();
  }

  composeMessage() {
    return this.editFile(
      this.pendingCommit().messagePath,
      (editor) => {
        editor.puts(this.readMessage() || this.defaultCommitMessage());
        editor.puts('');
        editor.note(Merge.COMMIT_NOTES);

        if(!this.options.edit) {
          editor.close();
        }
      }
    );
  }

  handleMergedAncestor() {
    this.puts('Already up to date.');
    this.exit(0);
  }

  handleFastForward() {
    const a = this.repo.database().shortOid(
      this.inputs.leftOid
    );
    const b = this.repo.database().shortOid(
      this.inputs.rightOid
    );

    this.puts(`Updating ${a}..${b}`);
    this.puts(`Fast-forward`);

    this.repo.index().loadForUpdate();

    const treeDiff = this.repo.database().treeDiff(
      this.inputs.leftOid, this.inputs.rightOid
    );
    this.repo.migration(treeDiff).applyChanges();

    this.repo.index().writeUpdates();
    this.repo.refs().updateHead(this.inputs.rightOid);

    this.exit(0);
  }

  handleContinue() {
    try {
      this.repo.index().load();
      this.resumeMerge('merge');
    } catch(e) {
      if(e.code === 'Error') {
        this.stderr.write(`fatal: ${e.message}\n`);
        this.exit(128);
      }
      throw e;
    }
  }

  handleInProgressMerge() {
    const message = 'Merging is not possible because you have unmerged file';
    this.stderr.write(`error: ${message}\n`);
    this.stderr.write(`${this.CONFLICT_MESSAGE}\n`);
    this.exit(128);
  }

  handleAbort() {
    try {
      this.repo.pendingCommit().clear();

      this.repo.index().loadForUpdate();
      this.repo.hardReset(this.repo.refs().readHead());
      this.repo.index().writeUpdates();

      this.exit(0);
    } catch(e) {
      if(e.code === 'Error') {
        this.stderr.write(`fatal: ${e.message}\n`);
        this.exit(128);
      } else {
        throw e;
      }
    } 
  }

};

Merge.COMMIT_NOTES = [
  'Please enter a commit message to explain why this merge is necessary',
  'especially if it merges an updated upstream into a topic branch.',
  '',
  'Lines starting with \'#\' will be ignored, and an empty message aborts',
  'the commit.',
].join('\n');

module.exports = Merge;

