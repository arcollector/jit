const Base = require('./base');
const Revision = require('../revision');

class Branch extends Base {

  run() {
    if(this.options.delete) {
      this.deleteBranches();
    } else if(this.args.length === 0) {
      this.listBranches();
    } else {
      this.createBranch();
    }

    this.exit(0);
  }

  setOptions(minimistRes) {
    Object.entries(minimistRes)
      .forEach(([key, value]) => {
        if(key === 'v' || key === 'verbose') {
          this.options.verbose = true;

        } else if(key === 'd' || key === 'delete') {
          this.options.delete = true;
        } else if(key === 'f' || key === 'force') {
          this.options.force = true;

        } else if(key === 'D') {
          this.options.delete = true;
          this.options.force = true;
        }
      });
  }

  listBranches() {
    const current = this.repo.refs().currentRef();
    const branches = this.repo.refs()
      .listBranches()
      .sort((a, b) => a.path.localeCompare(b.path));
    const maxWidth = branches
      .map((b) => b.shortName().length)
      // sort asceding
      .sort()
      // last one is the longest
      .slice(-1)[0];

    //this.setupPager();

    branches.forEach((ref) => {
      let info = this.formatRef(ref, current);
      info = `${info}${this.extendedBranchInfo(ref, maxWidth)}`;
      this.puts(info);
    });
  }

  formatRef(ref, current) {
    if(ref.path === current.path) {
      return `* ${this.fmt('green', ref.shortName())}`;
    } else {
      return `  ${ref.shortName()}`;
    }
  }

  extendedBranchInfo(ref, maxWidth) {
    if(!this.options.verbose) {
      return '';
    }
    const commit = this.repo.database().load(ref.readOid());
    const short = this.repo.database().shortOid(commit.oid);
    const space = Array(maxWidth - ref.shortName().length)
      .fill(0)
      .map(() => ' ')
      .join('');

    return `${space} ${short} ${commit.titleLine()}`;
  }

  createBranch() {
    let revision;
    try {
      const branchName = this.args[0];
      const startPoint = this.args[1];
      let startOid;

      if(startPoint) {
        revision = new Revision(this.repo, startPoint);
        startOid = revision.resolve(Revision.COMMIT);
      } else {
        startOid = this.repo.refs().readHead();
      }
      console.log(startPoint, 'branch startoid', startOid);

      this.repo
        .refs()
        .createBranch(branchName, startOid);

    } catch(e) {
      if(e.code === 'InvalidBranch') {
        this.stderr.write(`fatal: ${e.message}\n`);
        this.exit(128);

      } else if(e.code === 'InvalidObject') {
        // this may undefined
        revision.errors.forEach((err) => {
          this.stderr.write(`error: ${err.message}\n`);
          err.hint.forEach((line) => {
            this.stderr.write(`hint: ${line}\n`);
          });
        });
        this.stderr.write(`fatal: ${e.message}\n`);
        this.exit(128);

      } else {
        // throw again, to be able to catched by
        // outher throw catch block located at
        // base.js (execute function)
        console.log(e);
        throw e;
      }
    }
  }

  deleteBranches() {
    console.log(this.args);
    this.args.forEach((branchName) =>
      this.deleteBranch(branchName)
    );
  }

  deleteBranch(branchName) {
    if(!this.options.force) {
      return;
    }

    try {
      const oid = this.repo.refs().deleteBranch(branchName);
      const short = this.repo.database().shortOid(oid);

      this.puts(`Deleted branch ${branchName} (was ${short})`);
    } catch(e) {
      if(e.code === 'InvalidBranch') {
        this.stderr.write(`error: ${e.message}\n`);
        this.exit(1);
      }
      throw e;
    }
  }

};

module.exports = Branch;

