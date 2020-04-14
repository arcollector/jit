module.exports = class HardReset {

  constructor(repo, oid) {
    this.repo = repo;
    this.oid = oid;
  }

  execute() {
    this.status = this.repo.status(this.oid);
    // this.status.changed is an array
    const changed = Array.from(this.status.changed)
      .map((path) => path);
    changed.forEach((path) => {
      this.resetPath(path);
    });
  }

  resetPath(path) {
    this.repo.index().remove(path);
    this.repo.workspace().remove(path);

    const entry = this.status.headTree[path];
    if(!entry) {
      return;
    }

    const blob = this.repo.database().load(entry.oid);
    this.repo.workspace().writeFile(
      path, blob.data, entry.mode(), true
    );

    const stat = this.repo.workspace().statFile(path);
    this.repo.index().add(path, entry.oid, stat);
  }

};

