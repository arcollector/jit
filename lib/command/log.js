const Base = require('./base');
const RevList = require('../rev.list');

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

class Log extends Base {

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
    this.setupPager();

    this.reverseRefs = this.repo.refs().reverseRefs();
    this.currentRef = this.repo.refs().currentRef();

    this.revList = new RevList(this.repo, this.args);
    this.revList.each((commit) => {
      this.showCommit(commit)
    });

    this.exit(0);
  }

  setOptions(options) {
    this.options.patch = false;
    this.definePrintDiffOptions(options);

    this.options.abbrev = 'auto';
    this.options.format = 'medium';
    this.options.decorate = 'auto';

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'abbrev-commit') {
          this.options.abbrev = true;
        } else if(key === 'no-abbrev-commit') {
          this.options.abbrev = false;

        } else if(key === 'oneline') {
          // dont overwrite is was setted
          if(this.options.abbrev === 'auto') {
            this.options.abbrev = true;
          }
          this.options.format = 'oneline';

        } else if(key === 'decorate') {
          this.options.decorate = 'short';
        } else if(key === 'no-decorate') {
          this.options.decorate = 'no';
        
        } else if(key === 'cc') {
          this.options.combined = this.options.patch = true;
        }
      });
  }

  showCommit(commit) {
    if(this.options.format === 'medium') {
      this.showCommitMedium(commit);
    } else if(this.options.format === 'oneline') {
      this.showCommitOneline(commit);
    }

    this.showPatch(commit);
  }

  showCommitMedium(commit) {
    const author = commit.author;
    this.blankLine();
    this.puts(this.fmt(
      'yellow',
      `commit ${this.abbrev(commit)}`
      ) + this.decorate(commit)
    );

    if(commit.merge()) {
      const oids = commit.parents.map((oid) =>
        this.repo.database().shortOid(oid)
      );
      this.puts(`Merge: ${oids.join(' ')}`);
    }

    this.puts(`Author ${author.name} <${author.email}>`);
    this.puts(`Date: ${author.readableTime()}`);
    this.blankLine();

    commit.getMessageAsLines().forEach((line) => {
      this.puts(`\t${line}`);
    });
  }

  showCommitOneline(commit) {
    const id = this.fmt( 
      'yellow',
      this.abbrev(commit)
    ) + this.decorate(commit);
    this.puts(`${id} ${commit.titleLine()}`);
  }

  blankLine() {
    if(this.options.format === 'oneline') {
      return;
    }
    if(this._blankLine) {
      this.puts('');
    }
    this._blankLine = true;
  }

  abbrev(commit) {
    if(this.options.abbrev === true) {
      return this.repo.database().shortOid(commit.oid);
    } else {
      return commit.oid;
    }
  }

  decorate(commit) {
    if(this.options.decorate === 'auto') {
      if(!this.isatty) {
        return '';
      }
    } else if(this.options.decorate === 'no') {
      return '';
    }
   
    const refs = this.reverseRefs[commit.oid];
    if(
      typeof refs === 'undefined' ||
      refs.length === 0
    ) {
      return '';
    }

    const head = refs.filter((ref) => 
      ref.head() && !this.currentRef.head()
    );
    const refsWithoutHead = refs.filter((ref) =>
      !ref.head()
    );
    
    const names = refsWithoutHead.map((ref) =>
      this.decorationName(head[0], ref)
    );

    const text = (
      this.fmt('yellow', ' (') +
      names.join(this.fmt('yellow', ',')) +
      this.fmt('yellow', ')')
    );

    return text;
  }

  decorationName(head, ref) {
    let name;
    if(
      this.options.decorate === 'short' ||
      this.options.decorate === 'auto'
    ) {
      name = ref.shortName();
    } else if(this.options.decorate === 'full') {
      name = ref.path;
    }

    name = this.fmt(this.refColor(ref), name);

    if(head && ref.path === this.currentRef.path) {
      name = this.fmt(
        this.refColor(head),
        `${head.path} -> ${name}`
      );
    }

    return name;
  }

  refColor(ref) {
    if(ref.head()) {
      return ['bold', 'cyan'];
    } else {
      return ['bold', 'green'];
    }
  }

  showPatch(commit) {
    if(!this.options.patch) {
      return;
    }
    if(commit.merge()) {
      this.showMergePatch(commit);
      return;
    }

    const diff = this.revList.treeDiff(
      commit.parent, commit.oid
    );

    const paths = Object.keys(diff).sort();

    this.blankLine();

    paths.forEach((path) => {
      const [ oldItem, newItem ] = diff[path];
      this.printDiff(
        this.fromDiffItem(path, oldItem),
        this.fromDiffItem(path, newItem)
      );
    });
  }

  fromDiffItem(path, item) {
    if(item !== null) {
      const blob = this.repo.database().load(item.oid);
      return new Target(
        path,
        item.oid,
        item.mode().toString(8),
        blob.data
      );
    } else {
      return new Target(
        path,
        NULL_OID,
        null,
        ''
      );
    }
  }

  showMergePatch(commit) {
    if(!this.options.combined) {
      return;
    }

    const diffs = commit.parents.map((oid) =>
      this.revList.treeDiff(oid, commit.oid)
    );

    const paths = Object
      .keys(diffs[0])
      .filter((path) => {
        return diffs
          .slice(1, diffs.length)
          .filter((diff) => {
            return Object.keys(diff).includes(path);
          });
      });

    this.blankLine();

    paths.forEach((path) => {
      const parents = diffs.map((diff) =>
        this.fromDiffItem(path, diff[path][0])
      );
      const child = this.fromDiffItem(path, diffs[0][path][1]);
      this.printCombinedDiff(parents, child);
    });
  }

};

module.exports = Log;

