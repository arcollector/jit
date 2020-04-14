module.exports = class CommonAncestors {

  constructor(database, one, twos) {
    this.database = database;
    this.flags = {};
    this.queue = [];
    this.results = [];

    this.queue = this.insertByDate(
      this.queue,
      this.database.load(one)
    );
    this.flags[one] = new Set();
    this.flags[one].add('parent1');

    twos.forEach((two) => {
      this.queue = this.insertByDate(
        this.queue,
        this.database.load(two)
      );
      this.flags[two] = new Set();
      this.flags[two].add('parent2');
    });
  }

  insertByDate(list, commit) {
    const index = list.findIndex((c) => {
      return c.date < commit.date;
    });
    if(index !== -1) {
      const left = list.slice(0, index);
      const right = list.slice(index, list.length);
      list = [
        ...left,
        commit,
        ...right,
      ];
    } else {
      list.push(commit);
    }
    return list;
  }

  find() {
    while(!this.allStale()) {
      this.processQueue();
    }
    return this.results
      .map((commit) => commit.oid)
      .filter((oid) => {
        return !this.marked(oid, 'stale');
      });
  }

  allStale() {
    const all = this.queue.filter((commit) => {
      return this.marked(commit.oid, 'stale');
    });
    return all.length === this.queue.length;
  }

  marked(oid, flag) {
    const item = this.flags[oid];
    if(!item) {
      return false;
    }
    return item.has(flag);
  }

  processQueue() {
    const commit = this.queue.shift();
    const flags = this.flags[commit.oid];
    //console.log('processQueue', commit.oid, commit.titleLine());
    if(flags.has('parent1') && flags.has('parent2')) {
      flags.add('result');
      this.results = this.insertByDate(this.results, commit);
      this.addParents(
        commit,
        new Set([
          ...Array.from(flags),
          'stale',
        ])
      );
    } else {
      this.addParents(commit, flags);
    }
  }

  addParents(commit, flags) {
    commit.parents.forEach((parent) => {
      if(this.flags[parent]) {
        const superset = this.flags[parent];
        let hasAll = true;
        flags.forEach((flag) => {
          if(!superset.has(flag)) {
            hasAll = false;
          }
        });
        if(hasAll) {
          return;
        }
      } else {
        this.flags[parent] = new Set();
      }
      this.flags[parent] = new Set([
        ...Array.from(this.flags[parent]),
        ...Array.from(flags),
      ]);
      this.queue = this.insertByDate(
        this.queue,
        this.database.load(parent)
      );
    });
  }

};

