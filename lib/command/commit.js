const fs = require('fs');
const path = require('path');

const Base = require('./base');
const Revision = require('../revision');
const DatabaseCommit = require('../database/commit');
const {
  defineWriteCommitOptions,
  readMessage,
  commitMessagePath,
  currentAuthor,
  writeCommit,
  writeTree,
  printCommit,
  pendingCommit,
  resumeMerge,
  writeMergeCommit,
  handleConflictedIndex,
  CONFLICT_MESSAGE,
} = require('./shared/write.commit');

class Commit extends Base {

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

    this.defineWriteCommitOptions = defineWriteCommitOptions;
    this.readMessage = readMessage;
    this.commitMessagePath = commitMessagePath;
    this.currentAuthor = currentAuthor;
    this.writeCommit = writeCommit;
    this.writeTree = writeTree;
    this.printCommit = printCommit;
    this.pendingCommit = pendingCommit;
    this.resumeMerge = resumeMerge;
    this.writeMergeCommit = writeMergeCommit;
    this.handleConflictedIndex = handleConflictedIndex;
    this.CONFLICT_MESSAGE = CONFLICT_MESSAGE;
  }

  setOptions(options) {
    this.defineWriteCommitOptions(options);

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'C' || key === 'reuse-message') {
          this.options.reuse = value;
          this.options.edit = false;
        
        } else if(key === 'c' || key === 'reedit-message') {
          this.options.reuse = value;
          this.options.edit = true;
       
        } else if(key === 'amend') {
          this.options.amend = true;
        }
      });
  }

  run() {
    this.repo.index().load();

    if(this.options.amend) {
      // process it will exit here
      this.handleAmend();
    }
    const mergeType = this.pendingCommit().mergeType();
    if(mergeType !== null) {
      // process it will exit here
      this.resumeMerge(mergeType);
    }
    
    const parent = this.repo.refs().readHead();
    const message = this.composeMessage(
      this.readMessage() || this.reusedMessage()
    );
    const commit = this.writeCommit(
      parent !== null ? [parent] : null,
      message
    );

    this.printCommit(commit);
 
    this.exit(0);
  }

  composeMessage(message) {
    return this.editFile(
      this.commitMessagePath(),
      (editor) => {
        editor.puts(message || '');
        editor.puts('');
        editor.note(Commit.COMMIT_NOTES);

        if(!this.options.edit) {
          editor.close();
        }
      }
    );
  }

  reusedMessage() {
    if(!this.options.reuse) {
      return null;
    }

    const revision = new Revision(this.repo, this.options.reuse);
    const commit = this.repo.database().load(revision.resolve());

    return commit.message;
  }

  handleAmend() {
    const old = this.repo.database().load(
      this.repo.refs().readHead()
    );
    const tree = this.writeTree();
    const message = this.composeMessage(old.message);
    const committer = this.currentAuthor();

    const newOne = new DatabaseCommit(
      old.parents,
      tree.oid,
      old.author,
      committer,
      message
    );
    this.repo.database().store(newOne);
    this.repo.refs().updateHead(newOne.oid);

    this.printCommit(newOne);
    this.exit(0);
  }

}

Commit.COMMIT_NOTES = [
  'Please enter the commit message for your changes. Lines starting',
  'with \'#\' will be ignored, and an empty message aborts the commit',
].join('\n');

module.exports = Commit;

