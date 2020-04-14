const path = require('path');
const fs = require('fs');
const assert = require('assert');

const Repository = require('../lib/repository');
const Command = require('../lib/command');

class MockedStd {
  constructor() {
    this.content = [];
  } 
  write(str) {
    //console.log(str);
    this.content.push(str);
  }
  toString() {
    return this.content.join('');
  }
};

class CommandHelper {

  beforeEach() {
    this.jitCmd('init', this.repoPath());
  }

  afterEach() {
    this.deleteFolderRecursive(this.repoPath());
  }

  listDir(dir = '') {
    return fs.readdirSync(path.join(this.repoPath(), dir));
  }

  deleteFolderRecursive(path) {
    let files = [];
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file,index) => {
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                this.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    } else {
      //console.log('does not exists', path);
    }
  }

  setEnv(key, value) {
    this.env = this.env || {};
    this.env[key] = value;
  }

  setStdin(string) {
    this.stdin = string;
  }

  repoPath() {
    const value = path.resolve('../test-repo');
    return value;
  }

  repo() {
    this.repository = this.repository ||
      new Repository(path.join(this.repoPath(), '.git'))
    ;
    return this.repository;
  }

  mkdir(name) {
    fs.mkdirSync(path.join(this.repoPath(), name), { recursive: true });
  } 

  writeFile(name, contents) {
    const filepath = path.join(this.repoPath(), name);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, contents);
  }

  jitCmd(...argv) {
    this.env = this.env || {};
    this.stdin = this.stdin || '';
    this.stdout = new MockedStd();
    this.stderr = new MockedStd();
    this.cmd = Command.execute(
      this.repoPath(),
      this.env,
      // first entry is always /bin/node ie
      ['', ...argv],
      () => this.stdin,
      this.stdout,
      this.stderr
    );
  }

  commit(message) {
    this.setEnv('GIT_AUTHOR_NAME', 'A. U. Thor');
    this.setEnv('GIT_AUTHOR_EMAIL', 'author@example.com');
    this.setStdin(message);
    this.jitCmd('commit');
  }

  merge(branch, message) {
    this.setStdin(message);
    this.jitCmd('merge', branch);
  }

  readHead() {
    //console.log(fs.readdirSync(this.repoPath() + '/.git'));
    return fs.readFileSync(
      path.join(this.repoPath(), '.git', 'HEAD'),
      'utf-8'
    ).trim(); 
  }

  readRefsHeads(branchName) {
    //console.log(fs.readdirSync(this.repoPath() + '/.git/refs/heads'));
    return fs.readFileSync(
      path.join(this.repoPath(), '.git', 'refs', 'heads', branchName),
      'utf-8'
    ).trim(); 
  }

  makeExecutable(name) {
    fs.chmodSync(
      path.join(this.repoPath(), name),
      0o775
    );
  }

  makeRegulable(name) {
    fs.chmodSync(
      path.join(this.repoPath(), name),
      0o666
    );
  }

  makeUnreadable(name) {
    fs.chmodSync(
      path.join(this.repoPath(), name),
      0o000
    );
  }

  touch(name) {
    const time = new Date();
    fs.utimesSync(
      path.join(this.repoPath(), name),
      time,
      time
    );
  }

  catFile(name) {
    return fs.readFileSync(path.join(this.repoPath(), name), 'utf-8');
  }

  delete(name) {
    fs.unlinkSync(path.join(this.repoPath(), name));
  }

  deleteFolder(name) {
    this.deleteFolderRecursive(path.join(this.repoPath(), name));
  }

  assertStatus(status) {
    assert.deepEqual(status, this.cmd.status);
  }

  assertStdout(message) {
    this.assertOutput(this.stdout, message);
  }

  assertStderr(message) {
    this.assertOutput(this.stderr, message);
  }

  assertOutput(stream, message) {
    const streamContent = stream.toString();
    if(message === '') {
      assert.deepEqual(0, streamContent.length);
    } else {
      // expected, actual
      assert.deepEqual(message, streamContent);
    }
  }

}

module.exports = CommandHelper;

