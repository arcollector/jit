const path = require('path');

class Entry {

  constructor(pathname, oid, stat) {
    // if pathname is an instanciating a entry object
    // using Entry.parse, so pathname, oid, and stat
    // are not available, we must set entry params
    // reading buffer data, refers to Entry.parse static function
    if(pathname === null) {
      return this;
    }
    this.stat = stat;
    this.ctime = this.statDateTimeToInteger(stat.ctime);
    this.ctime_nsec = this.statDateTimeFractionToInteger(stat.ctime);
    this.mtime = this.statDateTimeToInteger(stat.mtime);
    this.mtime_nsec = this.statDateTimeFractionToInteger(stat.mtime);
    this.dev = parseInt(stat.dev);
    this.ino = parseInt(stat.ino);
    // dont conflict with mode() function
    // because that method can be called publicily
    this._mode = this.mode();
    this.uid = parseInt(stat.uid);
    this.gid = parseInt(stat.gid);
    this.size = parseInt(stat.size);
    this.oid = oid;
    // pathname can be 三味線 where string length 3
    // but byte size length is 9, so we use Buffer
    this.flags = Math.min(Buffer(pathname).length, Entry.MAX_PATH_SIZE);
    this.path = pathname;

    //console.log('entry from constructor is', { ...this });
  }

  statDateTimeToInteger(time) {
    return parseInt(time.valueOf() / 1000, 10);
  }

  statDateTimeFractionToInteger(time) {
    const a = time.valueOf() / 1000;
    const val = parseInt((a - parseInt(a, 10)) * 1000000000, 10);
    return val;
  }

  key() {
    return [this.path, this.stage()].toString();
  }

  stage() {
    return (this.flags >> 12) & 0x3;
  }

  mode() {
    // fuck this shit
    if(this._mode) {
      return this._mode;
    }
    return Entry.modeForStat(this.stat);
  }

  // build a list of descends ie: 'a/b/c/file.txt'
  // -> [ 'a', 'a/b', 'a/b/c', 'a/b/c/file.text' ]
  // but pop the last element
  parentDirectories() {
    const pathArr = this.path.split(path.sep);
    const descends = [];
    for(let i = 0; i < pathArr.length; i++) {
      const descend = [];
      for(let j = 0; j <= i; j++) {
        descend.push(pathArr[j]);
      }
      descends.push(descend.join(path.sep));
    }
    descends.pop();
    return descends;
  }

  toBuffer() {
    const ctimeBuf = Buffer(4);
    ctimeBuf.writeUInt32BE(this.ctime);
    const ctime_nsecBuf = Buffer(4);
    ctime_nsecBuf.writeUInt32BE(this.ctime_nsec);
    const mtimeBuf = Buffer(4);
    mtimeBuf.writeUInt32BE(this.mtime);
    const mtime_nsecBuf = Buffer(4);
    mtime_nsecBuf.writeUInt32BE(this.mtime_nsec);
    const devBuf = Buffer(4);
    devBuf.writeUInt32BE(this.dev);
    const inoBuf = Buffer(4);
    inoBuf.writeUInt32BE(this.ino);
    const modeBuf = Buffer(4);
    modeBuf.writeUInt32BE(this._mode);
    const uidBuf = Buffer(4);
    uidBuf.writeUInt32BE(this.uid);
    const gidBuf = Buffer(4);
    gidBuf.writeUInt32BE(this.gid);
    const sizeBuf = Buffer(4);
    sizeBuf.writeUInt32BE(this.size);
    // save ascii as hex
    const oidBuf = Buffer(this.oid, 'hex');
    const flagsBuf = Buffer(2);
    flagsBuf.writeUInt16BE(this.flags);
    // save pathname string as null terminated string
    const pathBuf = Buffer.concat([
      Buffer(this.path), Buffer('\0')
    ]);
    let buf = Buffer.concat([
      ctimeBuf,
      ctime_nsecBuf,
      mtimeBuf,
      mtime_nsecBuf,
      devBuf,
      inoBuf,
      modeBuf,
      uidBuf,
      gidBuf,
      sizeBuf,
      oidBuf,
      flagsBuf,
      pathBuf
    ]);
    //console.log('buffer', this.path, 'length', buf.length);
    // we need to make buffer content a 8 multiple block
    while((buf.length % Entry.ENTRY_BLOCK) !== 0) {
      // keep adding null bytes until we reach
      // 8 multiple block
      buf = Buffer.concat([buf, Buffer('\0')]);
    }
    //console.log('\tnow buf length is', buf.length);
    //console.log('saving entry', buf)
    return buf;
  }

  statMatch(stat) {
    return (this.size == 0 || this.size == stat.size) &&
      this.mode() == Entry.modeForStat(stat);
  }

  timesMatch(stat) {
    /*
    console.log(
      this.ctime, this.statDateTimeToInteger(stat.ctime),
      this.ctime_nsec, this.statDateTimeFractionToInteger(stat.ctime),
      this.mtime, this.statDateTimeToInteger(stat.mtime),
      this.mtime_nsec, this.statDateTimeFractionToInteger(stat.mtime)
    );
    */
    const res = this.ctime === this.statDateTimeToInteger(stat.ctime) &&
      this.ctime_nsec === this.statDateTimeFractionToInteger(stat.ctime) &&
      this.mtime === this.statDateTimeToInteger(stat.mtime) &&
      this.mtime_nsec === this.statDateTimeFractionToInteger(stat.mtime)
    ;
    //console.log('timesMatch', res);
    return res;
  }

  updateStat(stat) {
    this.ctime = this.statDateTimeToInteger(stat.ctime);
    this.ctime_nsec = 0;
    this.mtime = this.statDateTimeToInteger(stat.mtime);
    this.mtime_nsec = 0;
    this.dev = stat.dev;
    this.ino = stat.ino;
    this._mode = Entry.modeForStat(stat);
    this.uid = stat.uid;
    this.gid = stat.gid;
    this.size = stat.size;
  }

};

// index file's modes are stored as octal values
Entry.REGULAR_MODE = parseInt('0100644', 8);
Entry.EXECUTABLE_MODE = parseInt('0100755', 8);
Entry.MAX_PATH_SIZE = 0xfff;
Entry.ENTRY_BLOCK = 8;

Entry.parse = function(data) {
  const entry = new Entry(null);
  let offset = 0;

  entry.ctime = data.readUInt32BE(offset);
  offset += 4;

  entry.ctime_nsec = data.readUInt32BE(offset);
  offset += 4;

  entry.mtime = data.readUInt32BE(offset);
  offset += 4;

  entry.mtime_nsec = data.readUInt32BE(offset);
  offset += 4;

  entry.dev = data.readUInt32BE(offset);
  offset += 4;

  entry.ino = data.readUInt32BE(offset);
  offset += 4;

  entry._mode = data.readUInt32BE(offset);
  offset += 4;

  entry.uid = data.readUInt32BE(offset);
  offset += 4;

  entry.gid = data.readUInt32BE(offset);
  offset += 4;

  entry.size = data.readUInt32BE(offset);
  offset += 4;

  const oidBuf = Buffer(20);
  // data.copy use oidBuf.length to know how many bytes need to copy
  offset += data.copy(oidBuf, 0, offset);
  //console.log('oidBuf is', oidBuf);
  // interpret oidBuf as hex string values
  entry.oid = oidBuf.toString('hex');
  
  entry.flags = data.readUInt16BE(offset);
  offset += 2;
 
  let c = data.readUInt8(offset);
  offset += 1;
  const path = [];
  // warning, compare against 0 not '\0'
  while(c !== 0 && offset !== data.length) {
    path.push(c);
    c = data.readUInt8(offset);
    offset += 1;
  }
  // relax, path will not contain the null byte
  entry.path = Buffer(path).toString();
  
  //console.log('entry from index block has been loaded', { ...entry });
  return entry;
};

Entry.modeForStat = function(stat) {
  if((
    // keep only with last 3 group of 3 bits
    (parseInt(stat.mode) & 511)
    // and check for the executable bit
    // in the 3 group of 3 bits
    & 73
    ) === 73
  ) {
    // it is an executable
    return Entry.EXECUTABLE_MODE;
  } else {
    return Entry.REGULAR_MODE;
  }
};

Entry.createFromDb = function(pathname, item, n) {
  const flags = (n << 12) |
    Math.min(
      Buffer.from(pathname).length,
      Entry.MAX_PATH_SIZE
    );
  const entry = new Entry(null);
  entry.stat = 0;
  entry.ctime = 0;
  entry.ctime_nsec = 0;
  entry.mtime = 0;
  entry.mtime_nsec = 0;
  entry.dev = 0;
  entry.ino = 0;
  entry._mode = item.mode();
  entry.uid = 0;
  entry.gid = 0;
  entry.size = 0;
  entry.oid = item.oid;
  entry.flags = flags;
  entry.path = pathname;
  return entry;
};

module.exports = Entry;

