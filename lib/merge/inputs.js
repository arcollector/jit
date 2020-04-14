const Bases = require('./bases');
const Revision = require('../revision');

module.exports = class Inputs {

  constructor(repository, leftName, rightName) {
    this.repo = repository;
    this.leftName = leftName;
    this.rightName = rightName;
    this.leftOid = this.resolveRev(this.leftName);
    this.rightOid = this.resolveRev(this.rightName);
    const common = new Bases(
      this.repo.database(),
      this.leftOid,
      this.rightOid
    );
    this.baseOids = common.find();
  }

  resolveRev(rev) {
    return new Revision(this.repo, rev)
      .resolve(Revision.COMMIT);
  }

  alreadyMerged() {
    return this.baseOids[0] === this.rightOid;
  }

  fastForward() {
    return this.baseOids[0] === this.leftOid;
  }

};

