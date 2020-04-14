const Base = require('./base');
const Revision = require('../revision');

module.exports = class Remote extends Base {

  setOptions(minimistRes) {
    this.options.tracked = [];

    Object.entries(minimistRes)
      .forEach(([key, value]) => {
        if(key === 'v' || key === 'verbose') {
          this.options.verbose = true;

        } else if(key === 't') {
          this.options.tracked = [...value];
        }
      });
  }

  run() {
    const arg = this.args.shift();
    if(arg === 'add') {
      this.addRemote();
    } else if(arg === 'remove') {
      this.removeRemote();
    } else {
      this.listRemotes();
    }
  }

  addRemote() {
    try {
      const [ name, url ] = this.args;
      this.repo.remotes().add(name, url, this.options.tracked);
      this.exit(0);
    } catch(e) {
      throw e;
      this.stderr.write(`fatal: ${e.message}`);
      this.exit(128);
    }
  }

  removeRemote() {
    try {
      this.repo.remotes().remove(this.args[0]);
      this.exit(0);
    } catch(e) {
      throw e;
      this.stderr.write(`fatal: ${e.message}`);
      this.exit(128);
    }
  }
 
  listRemotes() {
    this.repo.remotes().listRemotes().forEach((name) => {
      this.listRemote(name);
    });
    this.exit(0);
  }

  listRemote(name) {
    if(!this.options.verbose) {
      this.puts(name);
      return;
    }

    const remote = this.repo.remotes().get(name);

    this.puts(`${name}\t${remote.fetchUrl()} (fetch)`);
    this.puts(`${name}\t${remote.pushUrl()} (push)`);
  }

};

