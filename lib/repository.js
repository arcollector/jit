const path = require('path');

const Workspace = require('./workspace');
const Database = require('./database');
const Refs = require('./refs');
const Index = require('./index');
const Status = require('./repository/status');
const Migration = require('./repository/migration');
const PendingCommit = require('./repository/pending.commit');
const HardReset = require('./repository/hard.reset');
const Stack = require('./config/stack');
const Remotes = require('./remotes');

class Repository {

  constructor(gitPath) {
    // gitPath looks like your-path/.git
    this.gitPath = gitPath;
  }

  database() {
    this._database = this._database ||
      new Database(path.join(this.gitPath, 'objects'));
    return this._database;
  }

  index() {
    this._index = this._index ||
      new Index(path.join(this.gitPath, 'index'));
    return this._index;
  }

  refs() {
    this._refs = this._refs || new Refs(this.gitPath);
    return this._refs;
  }

  workspace() {
    this._workspace = this._workspace ||
      // get "your-path" from your-path/.git 
      new Workspace(path.dirname(this.gitPath));
    return this._workspace;
  }

  pendingCommit() {
    return new PendingCommit(this.gitPath);
  }

  workspacePathToAdd(pathToAdd) {
    // pathToAdd is starting a cwd()
    // cwd()/pathToAdd results in the complete path
    return path.join(
      path.dirname(this.gitPath), pathToAdd
    );
  }

  status(commitOid = null) {
    return new Status(this, commitOid);
  }

  migration(treeDiff) {
    return new Migration(this, treeDiff);
  }

  hardReset(oid) {
    return new HardReset(this, oid).execute();
  }

  config() {
    this._config = this._config || new Stack(this.gitPath);
    return this._config;
  }

  remotes() {
    this._remotes = this._remotes || new Remotes(this.config().file('local'));
    return this._remotes;
  }

};

module.exports = Repository;

