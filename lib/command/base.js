const path = require('path');

const minimist = require('minimist');

const Repository = require('../repository');
const Color = require('../color');
const Pager = require('../pager');
const Editor = require('../editor');

module.exports = class Base {

  constructor(
    dir,
    env,
    args,
    stdin,
    stdout,
    stderr
  ) {
    this.dir = dir;
    this.env = env;
    this.args = args;
    this.stdin = stdin;
    this.stdout = stdout;
    this.stderr = stderr;
    const rootPath = this.dir;
    const repo = new Repository(path.join(rootPath, '.git'));
    this.repo = repo;
    this.isatty = stdout.isTTY; 
  }

  expandedPathname(pathname) {
    const a = this.dir;
    const b = path.normalize(pathname);
    const b2 = a === b ? '' : b;
    return path.join(this.dir, b2);
  }

  execute() {
    try {
      this.parseOptions();
      this.run();
    } catch(e) {
      // if not exit, it means that something
      // went wrong with my code (syntax errors, etc)
      if(e !== 'exit') {
        console.error(e);
        this.stderr.write(`${e}\n`);
      }
    }

    if(this.pager) {
      this.pager.close();
      // TODO: pager seem not responding
    }
  }

  exit(status = 0) {
    this.status = status;
    // throw exit to stop further processing
    throw 'exit';
  }

  parseOptions() {
    this.options = {};

    //console.log('^^^^^^^^');
    //console.log(this.args);
    const res = minimist(this.args);
    //console.log('\t', res);
    const options = {};
    let args = [];
    Object.entries(res)
      .forEach(([k, v]) => {
        if(k === '_') {
          args = args.concat(
            v.map((v) => v.toString())
          );
        } else {
          options[k] = true;
          // TODO: fix this, need it for commit
          if(
            k === 'message' ||
            k === 'file' ||
            k === 'reuse-message' ||
            k === 'reedit-message' ||
          // TODO: for config
            k === 'add' ||
            k === 'replace' ||
            k === 'replace-all' ||
            k === 'get-all' ||
            k === 'unset' ||
            k === 'unset-all' ||
            k === 'remove-section' ||
          // TODO: for cherry-pick, revert
            k === 'mainline'
          ) {
            options[k] = v.toString();
          // TODO: for remote
          } else if(k === 't') {
            options[k] = v;
          } else if(v !== true) {
            // TODO this fails when 0.0 to '0'
            args.push(v.toString());
          }
        }
      });
    //console.log(args, options);
    //console.log('$$$$$$$$$$');
    this.args = [ ...args ];
    this.setOptions(options);
  }

  setOptions() {
  }

  editFile(path, cb) {
    return Editor.edit(path, this.editorCommand(), (editor) => {
      cb(editor);
      if(!this.isatty) {
        editor.close();
      }
    });
  }

  editorCommand() {
    return this.env['GIT_EDITOR'] ||
      this.repo.config().get(['core', 'editor']) ||
      this.env['VISUAL'] ||
      this.env['EDITOR'];
  }

  setupPager() {
    // TODO: dont work properly
    return;
    if(this.pager) {
      return;
    }
    if(!this.isatty) {
      return;
    }
    this.pager = new Pager(
      this.env,
      this.stdout,
      this.stderr
    );
    this.stdout = {
      write: this.pager.input.bind(this.pager),
    };
  }

  fmt(style, string) {
    return this.stdout.isTTY ?
      Color.format(style, string) :
      string;
  }

  puts(string) {
    try {
      this.stdout.write(`${string}\n`);
    } catch(e) {
      console.log('affawfafawfawf', e);
    }
  }

}

