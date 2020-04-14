const Author = require('./author');

class Commit {

  constructor(parents, tree, author, committer, message) {
    this.parents = parents || [];
    this.parent = this.parents[0] || null;
    this.tree = tree;
    this.author = author;
    this.committer = committer;
    this.message = message;
    this.type = 'commit';
    const data = [];
    //console.log('saving commit, author is', author.toString());
    data.push(
      // tree variable is an oid string!
      Buffer(`tree ${tree}\n`)
    );
    this.parents.forEach((parent) => {
      data.push(
        Buffer(`parent ${parent}\n`)
      );
    });
    data.push(
      // it will call author.toString() internally
      Buffer(`author ${author}\n`)
    );
    data.push(
      Buffer(`committer ${committer}\n`)
    );
    data.push(
      Buffer('\n')
    );
    data.push(
      Buffer(message)
    );
    this.data = Buffer.concat(data);
  }

  toBuffer() {
    return this.data;
  }

  date() {
    return this.committer.time;
  }

  titleLine() {
    return this.getMessageAsLines()[0];
  }

  getMessageAsLines() {
    return this.message.toString().split('\n');
  }

  merge() {
    return this.parents.length > 1;
  }

};

Commit.parse = function(data) {
  const headers = {};
  let line = [];
  let i = 0;
  while(i < data.length) {
    const c = data[i++];
    if(c === 0x0a) { // \n (a line has completed)
      const curLine = line.join('');
      if(curLine.length === 0) {
        break;
      } else {
        const [ key, ...restArr ] = curLine.split(' ');
        if(!headers[key]) {
          headers[key] = [];
        }
        headers[key].push(restArr.join(' '));
        line = [];
      }
    } else {
      line.push(String.fromCharCode(c));
    }
  }
  //console.log('Commit.parse headers', headers);
  return new Commit(
    // parent is not present in first commit history
    headers['parent'] || [],
    headers['tree'][0],
    Author.parse(headers['author'][0]),
    Author.parse(headers['committer'][0]),
    data.slice(i, data.length)
  );
};

module.exports = Commit;

