class Record {

  constructor(type, data) {
    this.type = type;
    this.data = data;
  }

  toString() {
    return this.data;
  }

}

module.exports = {

  HEADER_SIZE: 12,
  HEADER_FORMAT: 'a4N2',
  SIGNATURE: 'PACK',
  VERSION: 2,

  COMMIT: 1,
  TREE: 2,
  BLOB: 3,

  TYPE_CODES: {
    commit: 1,
    tree: 2,
    blob: 3,
  },

  Record,

};
