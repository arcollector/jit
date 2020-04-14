module.exports = {

  VarIntLE: {
    write: function(value) {
      let bytes = [];
      let mask = 0xf;
      let shift = 4;

      while(value > mask) {
        bytes.push(0x80 | value & mask);
        value = value >> shift;
        mask = 0x7f;
        shift = 7; 
      }

      bytes.push(value);
      return bytes;
    },

    read: function(input) {
      const first = input.read();
      let value = first & 0xf;
      let shift = 4;
      while(byte > 0x80) {
        byte = input.read();
        value = value | ((byte & 0x7f) << shift);
        shift += 7;
      }

      return [first, value];
    }
  },

};

