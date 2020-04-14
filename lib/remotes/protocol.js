const fs = require('fs');

const NEED_MORE_DATA = 'LMAO!';

module.exports = class Protocol {

  constructor(
    command,
    input,
    output,
    onEach,
    completeTrigger,
    onComplete,
    capabilities = []
  ) {
    this.command = command;
    this.input = input;
    this.input.on('data', this._onData.bind(this));
    // we store here data received from input
    this.buffer = Buffer.alloc(0);
    this.bufferPos = 0;
    this.output = output;

    this.onEach = onEach;
    this.completeTrigger = completeTrigger;
    this.onComplete = onComplete;

    this.capsLocal = [ ...capabilities ];
    this.capsRemote = null;
    this.capsSent;
  }

  _onData(data) {
    console.error('_onData', data);
    // data is Buffer instance
    this.buffer = Buffer.concat([this.buffer, data]);
    // TODO what if _onData is called again while in another
    // stack frame this function is actually running?!!
    while(true) {
      // try to read data, packet is a string
      const packet = this.recvPacket();
      console.error('packed', packet);
      if(packet === NEED_MORE_DATA) {
        return;
      }
      // slice buffer to avoid processing same data again
      this.buffer = this.buffer.slice(this.bufferPos, this.buffer.length);
      // reset seek
      this.bufferPos = 0;
      if(packet === this.completeTrigger) {
        this.onComplete();
        return;
      } else {
        // keep reading
        this.onEach(packet);
      }
    }
  }

  sendPacket(line) {
    if(line === null) {
      this.output.write('0000');
      return;
    }

    line = this.appendCaps(line);
    //console.error('sendPacket', line, Buffer.from(line), Buffer.from(line).length);
    const size = Buffer.from(line).length + 5;
    //console.error(size, size.toString(16).padStart(4, '0'));
    // 15 -> f -> 000f
    this.output.write(size.toString(16).padStart(4, '0'));
    this.output.write(line);
    this.output.write('\n');
  }

  appendCaps(line) {
    if(this.capsSent) {
      return line;
    }
    this.capsSent = true;

    const sep = this.command === 'fetch' ? ' ' : '\0';
    let caps = this.capsLocal;
    if(this.capsRemote) {
      const capsRemoteInCaps = this.capsRemote.filter((cap) => {
        return caps.include(cap);
      });
      const capsCaps = caps.filter((cap) => {
        return capsRemoteInCaps.include(cap);
      });
      caps = [ ...capsCaps ];
    }

    return `${line}${sep}${caps.join(' ')}`;
  }

  recvPacket() {
    const bytes = this.buffer.slice(this.bufferPos, 4);
    console.error('in recvPacket', bytes);
    // need more data
    if(bytes.length !== 4) {
      return NEED_MORE_DATA;
    }
    const head = bytes.toString();
    console.error('revPacket', head);
    // check if head is something that we can handle
    if(!/[0-9a-f]{4}/.test(head)) {
      // advance
      this.bufferPos += 4;
      return head;
    }
    // head is a hex string
    const size = parseInt(head);
    if(size === 0) {
      // advance
      this.bufferPos += 4;
      // no need to read anything
      return null;
    }
    const sizeMinusHeader = size - 4;
    // dont read header (+4) and until size
    let line = this.buffer.slice(this.bufferPos + 4, size);
    console.error('readed', line);
    // need more data
    if(line.length !== sizeMinusHeader) {
      // not advance!
      return NEED_MORE_DATA;
    }
    this.bufferPos += size;
    line = line.toString().replace(/\n$/, '');
    console.error('line before detectCaps', line);
    return this.detectCaps(line);
  }

  detectCaps(line) {
    if(this.capsRemote) {
      return line;
    }

    let sep, n;
    if(this.command === 'upload-pack') {
      sep = ' ';
      n = 3;
    } else {
      sep = '\0';
      n = 2;
    }

    let parts = line.split(sep);
    const first = parts[0];
    const rest = n === 3 ?
      [parts[1], ...parts[2].slice(2, parts.length)]
      :
      parts.slice(1, parts.length);
    parts = [ first, ...rest ];
    console.error('parts is', parts);
    const caps = parts.length === n ? parts.pop() : '';
    this.capsRemote = caps.split(/ +/);
    return parts.join(' ');
  }

  capable(ability) {
    return this.capsRemote && this.capsRemote.includes(ability);
  }

}

