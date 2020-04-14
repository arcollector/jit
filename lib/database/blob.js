class Blob {

  constructor(data) {
    this.data = data;
    this.type = 'blob';
  }

  toBuffer() {
    return this.data;
  }

};

Blob.parse = function(data) {
  // data is already a Buffer type object
  return new Blob(
    data.slice(0, data.length)
  );
};

module.exports = Blob;

