const moment = require('moment');

class Author {

  constructor(name, email, time) {
    this.name = name;
    this.email = email;
    this.time = time;
    //this.time = new Date('2019-11-24T22:42:59.755Z');
  }

  toString() {
    // need timestamp as strftime("%s %z")
    const timestamp = moment(this.time).format(Author.TIME_FORMAT);
    return `${this.name} <${this.email}> ${timestamp}`;
  }

  readableTime() {
    // need ie: Wed Dec 25 17:54:00 2019 -0300
    return moment(this.time).format('ddd MMM DD HH:mm:ss YYYY ZZ');
  }

};

Author.parse = function(string) {
  const [ name, email, time ] = string
    .split(/<|>/)
    .map((value) => value.trim());
  // need to transform time (1574646618 -0300) to
  // a date object
  const timeDated = moment(time, Author.TIME_FORMAT);
  return new Author(name, email, timeDated);
};

Author.TIME_FORMAT = 'X ZZ'; // mimics %s %z as in strftime()

module.exports = Author;

