const crypto = require('crypto');
const fs = require('fs');

const Lockfile = require('./lockfile');
const Entry = require('./index/entry');
const Checksum = require('./index/checksum');

class Index {

  constructor(pathname) {
    this.pathname = pathname;
    this.lockfile = new Lockfile(pathname);
  }

  clear() {
    this.entries = {};
    this.keys = new Set();
    // this an object when each key is an 'a/b' or 'a' and value
    // an set of parent directories/files names
    this.parents = {};
    this.changed = false;
  }

  clearForce() {
    this.clear();
    this.changed = true;
  }

  add(pathname, oid, stat) {
    [1,2,3].forEach((stage) =>
      this.removeEntryWithStage(pathname, stage)
    )
    const entry = new Entry(pathname, oid, stat);
    this.discardConflicts(entry);
    this.storeEntry(entry);
    this.changed = true;
  }

  addFromDb(pathname, item) {
    this.storeEntry(Entry.createFromDb(pathname, item, 0));
    this.changed = true;
  }

  discardConflicts(entry) {
    entry.parentDirectories().forEach((parent) => {
      this.removeEntry(parent);
    });
    
    const set = this.parents[entry.path] || new Set();
    set.forEach((child) => {
      this.removeEntry(child);
    });
  }

  removeEntry(pathname) {
    //console.log('Index#removeEntry', pathname);
    for(const stage of [0,1,2,3]) {
      this.removeEntryWithStage(pathname, stage);
    }
  }

  removeEntryWithStage(pathname, stage) {
    //console.log('Index#removeEntryWithStage', pathname, stage);
    const key = [pathname, stage].toString();
    const entry = this.entries[key];
    if(!entry) {
      return;
    }
    this.keys.delete(key);
    delete this.entries[key];
    entry.parentDirectories().forEach((dirname) => {
      this.parents[dirname].delete(entry.path);
      if(Object.keys(this.parents).length === 0) {
        delete this.parents[dirname];
      }
    });
  }
  
  eachEntry() {
    const setArr = Array.from(this.keys);
    const sortedSetArr = setArr.sort((a, b) =>
      a.localeCompare(b)
    );
    //console.log('sortedSetArr', sortedSetArr);
    const sortedEntries = sortedSetArr.map((key) =>
      this.entries[key]
    );
    return sortedEntries;
  }

  loadForUpdate() {
    // adquiring .git/index.lock
    this.lockfile.holdForUpdate()
    //console.log('.git/index.lock adquired');
    this.load();
  }

  releaseLock() {
    this.lockfile.rollback();
  }

  load() {
    this.clear();
    // open .git/index for reading
    // file is a file descriptor
    const file = this.openIndexFile();
    if(file !== null) {
      const reader = new Checksum(file);
      const count = this.readHeader(reader);
      this.readEntries(reader, count);
      reader.verifyChecksum();
      fs.closeSync(file);
    } else {
      console.log('not index present');
    }
  }

  readHeader(reader) {
    const data = reader.read(Index.HEADER_SIZE);
    //console.log('.git/index raw data', data);
    let offset = 0;

    const signature = Buffer(Index.SIGNATURE_BYTES_SIZE);
    // data.copy will read as many bytes signature bytes can hold
    offset += data.copy(signature, 0, 0);
    //console.log('signature buffer is', signature);
    const signatureString = signature.toString('utf-8');
    //console.log('signatureString', signatureString, 'Index.SIGNATURE', Index.SIGNATURE);
    if(signatureString !== Index.SIGNATURE) {
      throw `Signature: expected ${Index.SIGNATURE} but found ${signatureString}`;
    }

    const version = Buffer(Index.VERSION_BYTES_SIZE);
    // data.copy will start copying at offset as many bytes version can hold 
    offset += data.copy(version, 0, offset);
    //console.log('version buffer is', version);
    const versionInt = version.readUInt32BE();
    if(versionInt !== Index.VERSION) {
      throw `Version: expected ${Index.VERSION} but found ${versionInt}`;
    }

    const count = Buffer(Index.COUNT_BYTES_SIZE);
    offset += data.copy(count, 0, offset);
    const countInt = count.readUInt32BE();
    //console.log('countInt is', countInt);
    return countInt;
  }

  readEntries(reader, count) {
    //console.log('we need to read', count, 'files');
    for(let i = 0; i < count; i++) {
      let entry = reader.read(Index.ENTRY_MIN_SIZE);
      /*
      const tmp = [];
      for(let j = 0; j < entry.length; j++) {
        tmp.push(entry[j].toString(16));
      }
      console.log('entry length is', entry.length, 'its content is');
      console.log(tmp.join(' '));
      */
      // beware! dont compare with '\0', compare with 0
      while(entry[entry.length-1] !== 0) {
        //console.log('need to fetch more entry content');
        entry = Buffer.concat([
          entry,
          reader.read(Index.ENTRY_BLOCK)
        ]);
        //console.log('entry length is now', entry.length);
        //console.log('last element entry is', entry[entry.length-1]);
      }
      this.storeEntry(Entry.parse(entry));
    }
    /*
    console.log('------- readEntries --------');
    console.log(this.entries);
    console.log('-------------------------------');
    */
  }

  updateEntryStat(entry, stat) {
    entry.updateStat(stat);
    this.changed = true;
  }

  storeEntry(entry) {
    const key = entry.key();
    //console.log('Index#storeEntry', key);
    this.keys.add(key);
    this.entries[key] = entry;
    entry.parentDirectories().forEach((dirname) => {
      //console.log('storeEntry', entry.parentDirectories()); 
      const set = this.parents[dirname] || new Set();
      this.parents[dirname] = set;
      set.add(entry.path);
    });
    //console.log(entry.path, this.parents);
    //console.log('\tending', Object.keys(this.entries));
  }

  openIndexFile() {
    try {
      // we need a file descriptor
      return fs.openSync(this.pathname, 'r');
    } catch(e) {
      if(e.code !== 'ENOENT') {
        throw e;
      }
      return null;
    }
  }

  writeUpdates() {
    //console.log('writeUpdated', this.changed);
    // check if we really .git/index has been changed
    // to avoid of rewriting the same index file
    if(!this.changed) {
      //console.log('there not need to updated index file');
      // this could throw an exception
      this.lockfile.rollback();
      return;
    }

    // write to .git/index.lock, this.lockfile is an instancie of Lockfile
    // Checksum need a file descriptor
    const writer = new Checksum(this.lockfile.lock); 
    
    const entriesLengthBuf = Buffer(4);
    // remember this.entries is an object, not an array
    entriesLengthBuf.writeUInt32BE(Object.keys(this.entries).length);
    const header = Buffer.concat([
      // Index.SIGNATURE is a string
      Buffer(Index.SIGNATURE),
      // store Index.VERSION as 32 uint
      Buffer([0,0,0,Index.VERSION]),
      entriesLengthBuf,
    ]);
    writer.write(header);

    this
      .eachEntry()
      .forEach((entry) => {
        writer.write(entry.toBuffer());
      })
    ;

    writer.writeChecksum();
    this.lockfile.commit();
 
    this.changed = false;
  }

  trackedDirectory(path) {
    return Object.keys(this.parents).includes(path);
  }

  childPaths(path) {
    return Array.from(this.parents[path]);
  }

  trackedFile(path) {
    for(const stage of [0,1,2,3]) {
      if(typeof this.entries[[path, stage].toString()] !== 'undefined') {
        return true;
      }
    }
    return false;
  }

  tracked(path) {
    return this.trackedFile(path) ||
      typeof this.parents[path] !== 'undefined';
  }

  entryForPath(path, stage = 0) {
    console.log('Index#entryForPath', path, stage, [path, stage].toString(), Object.keys(this.entries));
    return this.entries[[path, stage].toString()] || null;
  }

  remove(pathname) {
    const parents = this.parents[pathname] || new Set();
    parents.forEach((child) => {
      this.removeEntry(child);
    });
    this.removeEntry(pathname);
    this.changed = true;
  }

  addConflictSet(pathname, items) {
    // never can be 0 and 1,2,3 stage at the same time
    // if a file has NOT conflict then stage is zero
    // if a file has conflict then stage cant be here
    this.removeEntryWithStage(pathname, 0);
    items.forEach((item, n) => {
      if(!item) {
        return;
      }
      const entry = Entry.createFromDb(pathname, item, n + 1);
      this.storeEntry(entry);
    });
    this.changed = true;
  }

  conflict() {
    return typeof Object
      .values(this.entries)
      .find((entry) => entry.stage() > 0)
    !== 'undefined';
  }

  conflictPaths() {
    const paths = new Set();
    this.eachEntry().forEach((entry) => {
      if(entry.stage !== 0) {
        paths.add(entry.path)
      }
    });
    return Array.from(paths);
  }

};

Index.HEADER_SIZE = 12;
Index.SIGNATURE = 'DIRC';
Index.SIGNATURE_BYTES_SIZE = Index.SIGNATURE.length;
Index.VERSION = 2;
Index.VERSION_BYTES_SIZE = 4;
Index.COUNT_BYTES_SIZE = 4;

Index.ENTRY_BLOCK = 8;
Index.ENTRY_MIN_SIZE = 64;

module.exports = Index;

