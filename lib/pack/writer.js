const crypto = require('crypto');
const zlib = require('zlib');

const DatabaseCommit = require('../database/commit');
const DatabaseEntry = require('../database/entry');
const Pack = require('../pack');
const Numbers = require('./numbers');

module.exports = class Writer {
  constructor(
    output,
    database,
    options = {}
  ) {
    this.output = output;
    this.digest = crypto.createHash('sha1');
    this.database = database;

    this.compression = options.compression ||
      zlib.constants.Z_DEFAULT_COMPRESSION; 
  }

  write(data) {
    this.output.write(data);
    this.digest.update(data);
  }

  writeObjects(revList) {
    this.preparePackList(revList);
    this.writeHeader();
    this.writeEntries();
    this.output.write(this.digest.digest('hex'));
  }
}

class Entry {

  constructor(oid, type) {
    this.oid = oid;
    this.type = type;
  }

  preparePackList(revList) {
    this.packList = [];
    this.revList.forEach((object) =>
      this.addToPackList(object)
    );
  }

  addToPackList(object) {
    if(object instanceof DatabaseCommit) {
      this.packList.push(new Entry(object.oid, COMMIT));
    } else if(object instanceof DatabaseEntry) {
      const type = object.tree() ? TREE : BLOB;
      this.packList.push(new Entry(object.oid, type));
    }
  }

  writeHeader() {
    // signature is a string
    const signature = Buffer.from(Pack.SIGNATURE);
    // store VERSION as 32 uint
    const version = Buffer([0,0,0,Pack.VERSION]);
    const entriesLengthBuf = Buffer(4);
    entriesLengthBuf.writeUInt32BE(this.packList.length);
    const header = Buffer([
      signature,
      version,
      entriesLengthBuf
    ]);
    this.write(header);
  }

  writeEntries() {
    return this.packList.forEach((entry) => {
      this.writeEntry(entry);
    });
  }

  writeEntry(entry) {
    const object = this.database.loadRaw(entry.oid);

    const header = Numbers.VarIntLe.write(object.length);
    header[0] = header | (entry.type << 4);

    // header is an array of number
    // convert to ascii
    this.write(Buffer.from(header));
    this.write(
      zlib.deflateSync(object.data, { level: this.compression })
    );
  }

}

