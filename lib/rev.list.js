const Revision = require('./revision');

class RevList {

  constructor(repo, revs, options = {}) {
    this.repo = repo;
    this.pending = [];
    this.commits = {};
    this.flags = {};
    this.queue = [];
    this.limited = false;
    this.output = [];
    this.prune = [];
    this.diffs = {};
    this.objects = options.objects || false;
    this.missing = options.missing || false;
    this.walk = options.walk || true;

    revs.forEach((rev) => {
      this.handleRevision(rev);
    });
    if(this.queue.length === 0) {
      this.handleRevision(Revision.HEAD);
    }
  }

  each(cb) {
    if(this.limited) {
      this.limitList();
    }
    if(this.objects) {
      this.markEdgesUninteresting();
    }
    this.traverseCommits(cb);
    this.traversePending(cb);
  }

  limitList() {
    while(this.stillInteresting()) {
      const commit = this.queue.shift();
      this.addParents(commit);
      if(!this.marked(commit.oid, 'uninteresting')) {
        this.output.push(commit);
      }
    }
    this.queue = this.output;
  }

  stillInteresting() {
    if(this.queue.length === 0) {
      return false;
    }

    const oldestOut = this.output.length !== 0 ?
      this.output[this.output.length-1] : null;
    const newestIn = this.queue[0];
    if(oldestOut !== null && oldestOut.date <= newestIn.date) {
      return true;
    }

    const any = this.queue.find((commit) =>
      this.marked(commit.oid, 'uninteresting')
    );
    if(any) {
      return true;
    }

    return false;
  }

  markEdgesUninteresting() {
    this.queue.forEach((commit) => {
      if(this.marked(commit.oid, 'uninteresting')) {
        this.markTreeUninteresting(commit.tree);
      }
      commit.parents.forEach((oid) => {
        if(this.marked(oid, 'uninteresting')) {
          const parent = this.loadCommit(oid);
          this.markTreeUninteresting(parent.tree);
        }
      });
    });
  }

  markTreeUninteresting(treeOid) {
    const entry = this.repo.database().treeEntry(treeOid);
    this.traverseTree(entry, (object) => {
      return this.mark(object.oid, 'uninteresting');
    });
  }

  traverseTree(entry, cb) {
    if(!cb(entry)) {
      return;
    }
    if(!entry.tree()) {
      return;
    }

    const tree = this.repo.database().load(entry.oid);
    Object.entries(tree).forEach(([name, item]) => {
      this.traverseTree(item, (object) => cb(object));
    });
  }

  traverseCommits(cb) {
    while(this.queue.length !== 0) {
      const commit = this.queue.shift();
      if(!this.limited) {
        this.addParents(commit);
      }
      if(this.marked(commit.oid, 'uninteresting')) {
        // next
      } else if(this.marked(commit.oid, 'treesame')) {
        // next
      } else {
        this.pending.push(
          this.repo.database().treeEntry(commit.tree)
        );
        cb(commit);
      }
    }
  }

  traversePending(cb) {
    if(!this.objects) {
      return;
    }
    this.pending.forEach((entry) => {
      this.traverseTree(entry, (object) => {
        if(this.marked(object.oid, 'uninteresting')) {
          return false;
        } else if(!this.mark(object.oid, 'seen')) {
          return false;
        } else {
          cb(object);
          return true;
        }
      });
    });
  }

  addParents(commit) {
    if(!this.walk) {
      return;
    }
    if(!this.mark(commit.oid, 'added')) {
      return;
    }

    let parents = [];

    if(this.marked(commit.oid, 'uninteresting')) {
      parents = commit.parents.map((oid) => {
        return this.loadCommit(oid);
      });
      parents.forEach((parent) => {
        this.markParentsUninteresting(parent);
      });
    } else {
      parents = this.simplifyCommit(commit)
        .map((oid) => this.loadCommit(oid));
    }
    
    parents.forEach((parent) => { 
      this.enqueueCommit(parent);
    });
  }

  loadCommit(oid) {
    if(oid === null) {
      return null;
    }
    this.commits[oid] = this.commits[oid] || 
      this.repo.database().load(oid);
    return this.commits[oid];
  }

  mark(oid, flag) {
    this.flags[oid] = this.flags[oid] || new Set();
    const elem = this.flags[oid];
    if(elem.has(flag)) {
      return false;
    }
    elem.add(flag);
    return true;
  }

  marked(oid, flag) {
    this.flags[oid] = this.flags[oid] || new Set();
    const elem = this.flags[oid];
    return elem.has(flag);
  }

  handleRevision(rev) {
    if(this.repo.workspace().statFile(rev) !== null) {
      this.prune.push(rev);
    } else {
      let match = RevList.RANGE.exec(rev);
      if(match !== null) {
        this.setStartPoint(match[1], false);
        this.setStartPoint(match[2], true);
        this.walk = true;
      } else {
        match = RevList.EXCLUDE.exec(rev);
        if(match !== null) {
          this.setStartPoint(match[1], false);
          this.walk = true;
        } else {
          this.setStartPoint(rev, true);
        }
      }
    }
    /* 
    console.log(
      'after RevList#handleRevision',
      rev,
      Object.entries(this.commits).map(([oid, c]) => `${oid} ${c.titleLine()}`),
      this.queue.map((c) => c.oid),
    );
    */
  }

  setStartPoint(rev, interesting) {
    try {
      //console.log('RevList#setStartPoint', rev, interesting);
      if(rev === '') {
        rev = Revision.HEAD;
      }
      const oid = new Revision(this.repo, rev).resolve(Revision.COMMIT);
      const commit = this.loadCommit(oid);
      //console.log('setStartPoint', commit.parents, commit.message.toString());
      this.enqueueCommit(commit);

      if(!interesting) {
        this.limited = true;
        this.mark(oid, 'uninteresting');
        this.markParentsUninteresting(commit);
      }
    } catch(e) {
      if(e.code === 'InvalidObject') {
        if(!this.missing) {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  markParentsUninteresting(commit) {
    let queue = [ ...commit.parents ];
    while(queue.length !== 0) {
      let oid = queue.shift();
      while(oid) {
        if(!this.mark(commit.parent, 'uninteresting')) {
          break;
        }
        const parent = this.commits[oid];
        if(!parent) {
          break;
        }
        oid = parent.parents.length === 0 ?
          parent.parents[0] : null;
        queue = [
          ...queue,
          // [1,2,3] => [2,3]
          parents.slice(1, parents.length),
        ];
        commit = this.commits[commit.parent] || null;
      }
    }
  }

  simplifyCommit(commit) {
    if(this.prune.length === 0) {
      return commit.parents;
    }
    const parents = commit.parents.length === 0 ?
      [ null ] : commit.parents;

    const oid = parents.find((oid) =>  {
      const diff = this.treeDiff(oid, commit.oid);
      // diff is an object
      if(Object.values(diff).length !== 0) {
        return false;
      }
      this.mark(commit.oid, 'treesame');
      return true;
    });

    return oid ? [ oid ] : commit.parents;
  }

  treeDiff(oldOid, newOid) {
    const key = [oldOid, newOid].toString();
    if(!this.diffs[key]) {
      this.diffs[key] = this.repo
        .database()
        .treeDiff(oldOid, newOid, this.prune);
    }
    return this.diffs[key];
  }

  enqueueCommit(commit) {
    // la primera vez va a meter en
    // this.flags[commit.oid] = commit;
    // y va a retorna true, por lo que a este
    // if no se va a entrar, en sucesivas veces
    // va a entrar a este if, porque ya existe
    // this.flags[commit.oid] setteado
    if(!this.mark(commit.oid, 'seen')) {
      return;
    }

    if(this.walk) {
      const index = this.queue.findIndex((c) =>
        c.date < commit.date
      );
      // maintain a reverse order list
      // pone los c.data mas chicos
      // antes que los mas viejos
      // los viejos estan ultimos
      if(index !== -1) {
        const left = this.queue.slice(0, index);
        const right = this.queue.slice(index, this.queue.length);
        this.queue = [
          ...left,
          commit,
          ...right,
        ];
      } else {
        this.queue.push(commit);
      }
    } else {
      this.queue.push(commit);
    }
  }

}

RevList.RANGE = /^(.*)\.\.(.*)$/;
RevList.EXCLUDE = /^\^(.+)$/;

module.exports = RevList;

