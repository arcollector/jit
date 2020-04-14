const Base = require('./base');
const RevList = require('../rev.list');
const Refs = require('../refs');
const Commit = require('../database/commit');
const Secuencer = require('../repository/sequencer');
const {
  readMessage,
  commitMessagePath,
  currentAuthor,
  writeCommit,
  writeTree,
  printCommit,
  pendingCommit,
  resumeMerge,
  writeMergeCommit,
  writeCherryPickCommit,
  writeRevertCommit,
  handleConflictedIndex,
  CONFLICT_MESSAGE,
  MERGE_NOTES,
  CHERRY_PICK_NOTES,
} = require('./shared/write.commit');
const {
  CONFLICT_NOTES,
  defineOptions,
  run,
  sequencer,
  selectParent,
  resolveMerge,
  failOnConflict,
  finishCommit,
  handleContinue,
  resumeSequencer,
  handleAbort,
  handleQuit,
} = require('./shared/sequencing');
const { COMMIT_NOTES } = require('./commit');

module.exports = class Revert extends Base {

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
    this.printCommit = printCommit;
    this.pendingCommit = pendingCommit;
    this.resumeMerge = resumeMerge;
    this.writeMergeCommit = writeMergeCommit;
    this.writeCherryPickCommit = writeCherryPickCommit;
    this.writeRevertCommit = writeRevertCommit;
    this.handleConflictedIndex = handleConflictedIndex;
    this.CONFLICT_MESSAGE = CONFLICT_MESSAGE;
    this.MERGE_NOTES = MERGE_NOTES;
    this.CHERRY_PICK_NOTES = CHERRY_PICK_NOTES;

    this.CONFLICT_NOTES = CONFLICT_NOTES;
    this.defineOptions = defineOptions;
    this.run = run;
    this.sequencer = sequencer;
    this.selectParent = selectParent;
    this.resolveMerge = resolveMerge;
    this.failOnConflict = failOnConflict;
    this.finishCommit = finishCommit;
    this.handleContinue = handleContinue;
    this.resumeSequencer = resumeSequencer;
    this.handleAbort = handleAbort;
    this.handleQuit = handleQuit;
  }

  setOptions(options) {
    this.defineOptions(options);
  }

  storeCommitSequence() {
    const revList = new RevList(
      this.repo,
      this.args.reverse(),
      { walk: false }
    );
    const commits = [];
    revList.each((commit) => commits.push(commit));
    commits.forEach((commit) => {
      this.sequencer().revert(commit);
    });
  }

  revert(commit) {
    const inputs = this.revertMergeInputs(commit);
    let message = this.revertCommitMessage(commit);

    this.resolveMerge(inputs);
    if(this.repo.index().conflict()) {
      this.failOnConflict(inputs, commit.message);
    }

    const author = this.currentAuthor();
    message = this.editRevertMessage(message);
    const picked = new Commit(
      [inputs.leftOid],
      this.writeTree().oid,
      author,
      author,
      message
    );

    this.finishCommit(picked);
  }

  revertMergeInputs(commit) {
    const short = this.repo.database().shortOid(commit.oid);

    const leftName = Refs.HEAD;
    const leftOid = this.repo.refs().readHead();

    const rightName = `parent of ${short}...${commit.titleLine().trim()}`;
    const rightOid = this.selectParent(commit);

    // something like merge/inputs.js class
    return {
      leftName,
      rightName,
      leftOid,
      rightOid,
      baseOids: [commit.oid]
    };
  }

  revertCommitMessage(commit) {
    return [
      `Revert ${commit.titleLine().trim()}`,
      '',
      `This reverts commit ${commit.oid}`,
    ].join('\n');
  }

  editRevertMessage(message) {
    return this.editFile(
      this.commitMessagePath(),
      (editor) => {
        editor.puts(message);
        editor.puts('');
        editor.note(COMMIT_NOTES);
      }
    );
  }
 
  mergeType() {
    return 'revert';
  }

};

