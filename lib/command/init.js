const fs = require('fs');
const path = require('path');

const Base = require('./base');
const Refs = require('../refs');

class Init extends Base {

  run() {
    const pathname = this.args[0] || this.dir;
    
    const rootPath = this.expandedPathname(pathname);
    const gitPath = path.join(rootPath, '.git');

    ['objects', 'refs/heads'].forEach((dir) => {
      try {
        fs.mkdirSync(
          path.join(gitPath, dir),
          { recursive: true }
        );
      } catch(e) {
        if(e.code === 'EACCES') {
          this.stderr.write(`fatal: ${e.message}\n`);
          this.exit(1);
        }
        throw e;
      }
    });

    const refs = new Refs(gitPath);
    const masterRefPath = path.join('refs', 'heads', Init.DEFAULT_BRANCH);
    refs.updateHead(`ref: ${masterRefPath}`);

    this.puts(`Initialized empty Jit respository in ${gitPath}`);
    this.exit(0);
  }

};

Init.DEFAULT_BRANCH = 'master';

module.exports = Init;

