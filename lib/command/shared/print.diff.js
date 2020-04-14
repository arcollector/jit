const path = require('path');

const {
  diffHunks,
  combinedHunks,
} = require('../../diff');
const Edit = require('../../diff/edit');

const NULL_OID = '0000000000000000000000000000000000000000';
const NULL_PATH = '/dev/null';

class Target {
  
  constructor(path, oid, mode, data) {
    this.path = path;
    this.oid = oid;
    this.mode = mode;
    this.data = data;
  }

  diffPath() {
    return this.mode !== null ? this.path : NULL_PATH;
  }

};

module.exports = {

  NULL_OID,
  NULL_PATH,

  DIFF_FORMATS: {
    context: 'normal',
    meta: 'bold',
    frag: 'cyan',
    old: 'red',
    new: 'green',
  },

  Target,

  definePrintDiffOptions(options) {
    Object.entries(options)
      .forEach(([key, value]) => {
        if(
          key === 'p' ||
          key === 'u' ||
          key === 'patch'
        ) {
          this.options.patch = true;

        } else if(
          key === 's' ||
          key === 'no-patch'
        ) {
          this.options.patch = false;
        }
      });
  },

  diffFmt(name, text) {
    const key = ['color', 'diff', name];
    let style = this.repo.config().get(key);
    if(style) {
      style = style.split(/ +/);
    } else {
      style = this.DIFF_FORMATS[name];
    }
    return this.fmt(style, text);
  },
 
  short(oid) {
    return this.repo.database().shortOid(oid);
  },

  header(string) {
    this.puts(this.diffFmt('meta', string)); 
  },

  printDiff(a, b) {
    /*
    console.log('##### printDiff ###');
    console.log(a);
    console.log('-------------------');
    console.log(b);
    console.log('###################');
    */
    if(a.oid === b.oid && a.mode === b.mode) {
      return;
    }
    a.path = path.join('a', a.path);
    b.path = path.join('b', b.path);
    this.puts(`diff --git ${a.path} ${b.path}`);
    this.printDiffMode(a, b);
    this.printDiffContent(a, b);
  },

  printDiffMode(a, b) {
    if(a.mode === null) {
      this.header(`new file mode ${b.mode}`);
    } else if(b.mode === null) {
      this.header(`deleted file mode ${a.mode}`);
    } else if(a.mode !== b.mode) {
      this.header(`old mode ${a.mode}`);
      this.header(`new mode ${b.mode}`);
    }
  },

  printDiffContent(a, b) {
    if(a.oid === b.oid) {
      return;
    }
    let oidRange = `index ${this.short(a.oid)}..${this.short(b.oid)}`;
    if(a.mode === b.mode) {
      oidRange = `${oidRange} ${a.mode}`;
    }
    this.puts(oidRange);
    this.puts(`--- ${a.diffPath()}`);
    this.puts(`+++ ${b.diffPath()}`);
    const hunks = diffHunks(a.data, b.data);
    hunks.forEach((hunk) => {
      this.printDiffHunk(hunk);
    });
  },

  printDiffHunk(hunk) {
    this.puts(this.diffFmt('frag', hunk.header()));
    hunk.edits.forEach((edit) => {
      this.printDiffEdit(edit);
    });
  },

  printDiffEdit(edit) {
    const text = edit.toString();
    if(edit.type === Edit.SYMBOLS.eql) {
      this.puts(this.diffFmt('context', text));
    } else if(edit.type === Edit.SYMBOLS.ins) {
      this.puts(this.diffFmt('new', text));
    } else if(edit.type === Edit.SYMBOLS.del) {
      this.puts(this.diffFmt('old', text));
    }
  },

  printCombinedDiff(as, b) {
    this.header(`diff --cc ${b.path}`);

    const aOids = as.map((a) => this.short(a.oid));
    const oidRange = `index ${aOids.join(',')}..${this.short(b.oid)}`;
    this.header(oidRange);

    if(as.filter((a) => a.mode === b.mode).length !== as.length) {
      this.header(
        `mode ${as.map(({ mode }) => mode).join(',')}..${b.mode}`
      );
    }

    this.header(`--- a/${b.diffPath}`);
    this.header(`+++ b/${b.diffPath}`);

    const hunks = combinedHunks(
      as.map(({ data }) => data),
      b.data
    );
    hunks.forEach((hunk) => this.printDiffHunk(hunk));
  },

};

