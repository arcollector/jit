const path = require('path');
const fs = require('fs');

const Lockfile = require('../lockfile');
const Refs = require('../refs');
const Config = require('../config');

class Sequencer {

  constructor(repository) {
    this.repo = repository;
    this.pathname = path.join(this.repo.gitPath, 'sequencer');
    this.abortPath = path.join(this.pathname, 'abort-safety');
    this.headPath = path.join(this.pathname, 'head');
    this.todoPath = path.join(this.pathname, 'todo');
    this.config = new Config(path.join(this.pathname, 'opts'));
    this.todoFile = null;
    this.commands = [];
  }

  start(options) {
    fs.mkdirSync(this.pathname);

    this.config.openForUpdate();
    Object.entries(options).forEach(([key, value]) =>
      this.config.set(['options', key], value)
    );
    this.config.save();

    const headOid = this.repo.refs().readHead();
    this.writeFile(this.headPath, headOid);
    this.writeFile(this.abortPath, headOid);

    this.openTodoFile();
  }

  getOption(name) {
    this.config.open();
    return this.config.get(['options', name]);
  }

  pick(commit) {
    this.commands.push(['pick', commit]);
  }

  revert(commit) {
    this.commands.push(['revert', commit]);
  }

  nextCommand() {
    return this.commands[0];
  }

  dropCommand() {
    this.commands.shift();
    this.writeFile(this.abortPath, this.repo.refs().readHead());
  }

  openTodoFile() {
    // this can throw
    if(!fs.statSync(this.pathname).isDirectory()) {
      return;
    }

    this.todoFile = new Lockfile(this.todoPath);
    this.todoFile.holdForUpdate();
  }

  dump() {
    if(!this.todoFile) {
      return;
    }

    this.commands.forEach(([action, commit]) => {
      const short = this.repo.database().shortOid(commit.oid);
      this.todoFile.write(`${action} ${short} ${commit.titleLine()}`);
    });

    this.todoFile.commit();
  }

  load() {
    this.openTodoFile();
    // this can throw
    if(!fs.statSync(this.todoPath).isFile()) {
      return;
    }

    this.commands = fs
      .readFileSync(this.todoPath, 'utf-8')
      .split('\n')
      .map((line) => {
        const match = /^(\S+) (\S+) (.*)$/.exec(line);
        if(match !== null) {
          const [ action, oid ] = match;
          const oids = this.repo.database().prefixMatch(oid);
          const commit = this.repo.database().load(oids[0]);
          return [action, commit];
        } else {
          return null;
        }
      })
      .filter((command) => command !== null);
  }

  quit() {
    // use rmRf from workspace, to avoid repet code
    this.repo.workspace().rmRf(this.pathname); 
  }

  abort() {
    const headOid = fs.readFileSync(this.headPath, 'utf-8').trim();
    const expected = fs.readFileSync(this.abortPath, 'utf-8').trim();
    const actual = this.repo.refs().readHead();

    this.quit();

    if(actual === expected) {
      throw Sequencer.UNSAFE_MESSAGE;
    }

    this.repo.hardReset(headOid);
    const origHead = this.repo.refs().updateHead(headOid);
    this.repo.refs().updateRef(Refs.ORIG_HEAD, origHead);
  }

  writeFile(path, content) {
    const lockfile = new Lockfile(path);
    lockfile.holdForUpdate();
    lockfile.write(content);
    lockfile.write('\n');
    lockfile.commit();
  }

}

Sequencer.UNSAFE_MESSAGE = 'You seem to have moved HEAD. Not rewinding, check your HEAD!';

module.exports = Sequencer;

