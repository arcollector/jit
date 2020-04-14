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

class CherryPick extends Base {

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
    // TODO: i think that this is wrong
    // and revList must have a method reverseEach()
    revList.each((commit) => commits.push(commit));
    commits.reverse().forEach((commit) => {
      this.sequencer().pick(commit);
    });
  }

  pick(commit) {
    const inputs = this.pickMergeInputs(commit);

    this.resolveMerge(inputs);
    if(this.repo.index().conflict()) {
      this.failOnConflict(inputs, commit.message);
    }

    const picked = new Commit(
      [inputs.leftOid],
      this.writeTree().oid,
      commit.author,
      this.currentAuthor(),
      commit.message
    );

    this.finishCommit(picked);
  }

  pickMergeInputs(commit) {
    const short = this.repo.database().shortOid(commit.oid);
    const parent = this.selectParent(commit);

    const leftName = Refs.HEAD;
    const leftOid = this.repo.refs().readHead();

    const rightName = `${short}...${commit.titleLine().trim()}`;
    const rightOid = commit.oid;

    // something like merge/inputs.js class
    return {
      leftName,
      rightName,
      leftOid,
      rightOid,
      baseOids: [parent]
    };
  }
 
  mergeType() {
    return 'cherry_pick';
  }

};

module.exports = CherryPick;

