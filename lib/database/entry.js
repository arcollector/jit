module.exports = class Entry {

  constructor(oid, mode) {
    this.oid = oid;
    // this is because 'database/tree.js' need to call entry.mode()
    // in toString function method
    // whethever is Database::Entry or Tree:Entry instance
    this._mode = mode;
  }

  mode() {
    return this._mode;
  }

  tree() {
    // need to require here, because in './tree' is
    // requiring this same file, so we, require './tree'
    // at runtime
    return this.mode() === require('./tree').TREE_MODE;
  }

};

