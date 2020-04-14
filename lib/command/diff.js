const Base = require('./base');
const Blob = require('../database/blob');
const Entry = require('../index/entry');

const {
  Target,
  NULL_OID,
  definePrintDiffOptions,
  DIFF_FORMATS,
  diffFmt,
  header,
  short,
  printDiff,
  printCombinedDiff,
  printDiffMode,
  printDiffContent,
  printDiffHunk,
  printDiffEdit,
} = require('./shared/print.diff');

class Diff extends Base {

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

    this.definePrintDiffOptions = definePrintDiffOptions;
    this.DIFF_FORMATS = DIFF_FORMATS;
    this.diffFmt = diffFmt;
    this.header = header;
    this.short = short;
    this.printDiff = printDiff;
    this.printCombinedDiff = printCombinedDiff;
    this.printDiffMode = printDiffMode;
    this.printDiffContent = printDiffContent;
    this.printDiffHunk = printDiffHunk;
    this.printDiffEdit = printDiffEdit; 
  }

  run() {
    this.repo.index().load();
    this.status = this.repo.status();

    this.setupPager();

    if(this.options.cached) {
      this.diffHeadIndex();
    } else {
      this.diffIndexWorkspace();
    }

    this.exit(0);
  }

  setOptions(minimistRes) {
    this.options.patch = true;
    this.definePrintDiffOptions(minimistRes);

    Object.entries(minimistRes)
      .forEach(([key, value]) => {
        if(key === 'cached' || key === 'staged') {
          this.options.cached = true;
        } else if(key === '1' || key === 'base') {
          this.options.stage = 1;
        } else if(key === '2' || key === 'ours') {
          this.options.stage = 2;
        } else if(key === '3' || key === 'theirs') {
          this.options.stage = 3;
        }
      });
  }

  diffHeadIndex() {
    if(!this.options.patch) {
      return;
    }
    Object.entries(this.status.indexChanges)
      .forEach(([path, state]) => {
        if(state === 'added') {
          this.printDiff(
            this.fromNothing(path),
            this.fromIndex(path)
          );
        } else if(state === 'modified') {
          this.printDiff(
            this.fromHead(path),
            this.fromIndex(path)
          );
        } else if(state === 'deleted') {
          this.printDiff(
            this.fromHead(path),
            this.fromNothing(path)
          );
        }
      });
  }

  diffIndexWorkspace() {
    if(!this.options.patch) {
      return;
    }

    const paths = [
      ...Object.keys(this.status.conflicts),
      ...Object.keys(this.status.workspaceChanges),
    ];

    paths.forEach((path) => {
      if(path in this.status.conflicts) {
        this.printConflictDiff(path);
      } else {
        this.printWorkspaceDiff(path);
      }
    });
  }

  printConflictDiff(path) {
    const targets = [0,1,2,3].map((stage) =>
      this.fromIndex(path, stage)
    );
    const [ _0, _1, left, right ] = targets;

    if(this.options.stage) {
      this.puts(`* Unmerged path ${path}`);
      this.printDiff(targets[this.options.stage], this.fromFile(path));

    } else if(left && right) {
      this.printCombinedDiff([left, right], this.fromFile(path));

    } else {
      this.puts(`* Unmerged path ${path}`);
    }
  }

  printWorkspaceDiff(path) {
    const state = this.status.workspaceChanges[path];
    if(state === 'modified') {
      this.printDiff(
        this.fromIndex(path),
        this.fromFile(path)
      );
    } else if(state === 'deleted') {
      this.printDiff(
        this.fromIndex(path),
        this.fromNothing(path)
      );
    }
  }

  fromHead(path) {
    const entry = this.status.headTree[path];
    const blob = this.repo.database().load(entry.oid);
    return new Target(
      path,
      entry.oid,
      entry.mode().toString(8),
      blob.data
    );
  }

  fromIndex(path, stage = 0) {
    const entry = this.repo.index().entryForPath(path, stage);
    if(entry === null) {
      return null;
    }
    const blob = this.repo.database().load(entry.oid);
    return new Target(
      path,
      entry.oid,
      entry.mode().toString(8),
      blob.data
    );
  }

  fromFile(path) {
    const blob = new Blob(
      this.repo.workspace().readFile(path)
    );
    const oid = this.repo.database().hashObject(blob);
    const mode = Entry.modeForStat(
      this.status.stats[path]
    );
    return new Target(
      path,
      oid,
      mode.toString(8),
      blob.data
    );
  }

  fromNothing(path) {
    return new Target(
      path,
      NULL_OID,
      null,
      ''
    );
  }

};

module.exports = Diff;

