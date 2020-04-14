const CommonAncestors = require('./common.ancestors');

module.exports = class Bases {

  constructor(database, one, two) {
    this.database = database;
    this.common = new CommonAncestors(
      database, one, [two]
    );
  }

  find() {
    this.commits = this.common.find();
    if(this.commits.size <= 1) {
      return this.commits;
    }

    this.redundant = new Set();
    this.commits.forEach((commit) => {
      this.filterCommit(commit);
    });

    const redundantArr = Array.from(this.redundant);
    // this.commits - redundantArr
    return this.commits.filter((commit) => {
      return redundantArr.indexOf(commit) === -1;
    });
  }

  filterCommit(commit) {
    if(this.redundant.has(commit)) {
      return;
    }

    let others = this.commits.filter((item) => {
      return item !== commit && !this.redundant.has(item);
    });
    const common = new CommonAncestors(
      this.database, commit, others
    );

    common.find();
    
    if(common.marked(commit, 'parent2')) {
      this.redundant.add(commit);
    }

    others = others.filter((oid) => {
      return common.marked(oid, 'parent1');
    });
    this.redundant = new Set([
      ...Array.from(this.redundant),
      ...others,
    ]);
  }

};

