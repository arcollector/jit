const Base = require('./base');

const Revision = require('../revision');

class Checkout extends Base {

  run() {
    let revision, migration;
    try {
      this.target = this.args[0];

      this.currentRef = this.repo.refs().currentRef();
      this.currentOid = this.currentRef.readOid();

      revision = new Revision(
        this.repo, this.target
      );
      this.targetOid = revision.resolve(
        Revision.COMMIT
      );

      this.repo.index().loadForUpdate();

      const treeDiff = this.repo.database().treeDiff(
        this.currentOid, this.targetOid
      );
      migration = this.repo.migration(treeDiff);
      migration.applyChanges();

      this.repo.index().writeUpdates();
      this.repo.refs().setHead(
        this.target, this.targetOid
      );
      this.newRef = this.repo.refs().currentRef();

      this.printPreviousHead();
      this.printDetachmentNotice();
      this.printNewHead();

      this.exit(0);
    } catch(e) {
      if(e.code === 'InvalidObject') {
        this.handleInvalidObject(revision, e);
      } else if(e.code === 'Conflict') {
        this.handleMigrationConflict(migration);
      } else {
        throw e;
      }
    }
  }

  printPreviousHead() {
    if(
      this.currentRef.head() &&
      this.currentOid !== this.targetOid
    ) {
      this.printHeadPosition(
        'Previous HEAD position was', this.currentOid
      );
    }
  }

  printHeadPosition(message, oid) {
    const commit = this.repo.database().load(oid);
    const short = this.repo.database().shortOid(commit.oid);
    this.stderr.write(`${message} ${short} ${commit.titleLine()}\n`);
  }

  printDetachmentNotice() {
    if(
      this.currentRef.head() ||
      !this.newRef.head()
    ) {
      return;
    }

    this.stderr.write(`Note: checking out ${target}\n`);
    this.stderr.write('\n');
    this.stderr.write(Checkout.DETACHED_HEAD_MESSAGE);
    this.stderr.write('\n');
  }

  printNewHead() {
    if(this.newRef.head()) {
      this.printHeadPosition(
        'HEAD is now at', this.targetOid
      );
    } else if(this.newRef === this.currentRef) {
      this.stderr.write(
        `Already on ${target}\n`
      );
    } else {
      this.stderr.write(
        `Switched to branch ${this.target}\n`
      );
    }
  }

  handleInvalidObject(revision, e) {
    revision.errors.forEach((err) => {
      this.stderr.write(`error: ${err.message}\n`);
      err.hint.forEach((line) => {
        this.stderr.write(`hint: ${line}\n`);
      });
    });
    this.stderr.write(`fatal: ${e.message}\n`);
    this.exit(1);
  }

  handleMigrationConflict(migration) {
    this.repo.index().releaseLock();

    migration.errors.forEach((message) => {
      this.stderr.write(`error: ${message}\n`);
    });
    this.stderr.write('Aborting\n');
    this.exit(1);
  }

};

Checkout.DETACHED_HEAD_MESSAGE = `
You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by performing another checkout.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using the branch command. Example:

  jit branch <new-branch-name>

`.trim();

module.exports = Checkout;

