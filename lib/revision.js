class Ref {
  constructor(name) {
    this.name = name;
  }
  
  resolve(context) {
    return context.readRef(this.name);
  }
}

class Parent {
  constructor(rev, n) {
    this.rev = rev;
    this.n = n;
  }

  resolve(context) {
    //console.log('Revision:Parent#resolve', {...this});
    return context.commitParent(
      this.rev.resolve(context), this.n
    );
  }
}

class Ancestor {
  constructor(rev, n) {
    this.rev = rev;
    this.n = n;
  }

  resolve(context) {
    //console.log('Revision:Ancestor#resolve', {...this});
    let oid = this.rev.resolve(context);
    //console.log('Revision:Ancestor#resolve', oid);
    for(let i = 0; i < this.n; i++) {
      oid = context.commitParent(oid);
    }
    return oid;
  }
}

class HintedError {
  constructor(message, hint) {
    this.message = message;
    this.hint = hint;
  }
}

class Revision {

  constructor(repo, expression) {
    this.repo = repo;
    this.expr = expression;
    this.query = Revision.parse(this.expr);
    //console.log('revison parse is', this.query);
    this.errors = [];
  }

  resolve(type = null) {
    let oid = this.query !== null ?
      this.query.resolve(this) :
      null;
    //console.log('Revision#resolve', oid, type);
    if(
      type !== null && 
      this.loadTypedObject(oid, type) === null
    ) {
      oid = null;
    }
    if(oid !== null) {
      return oid;
    }
    const err = new Error(`Not a valid object name: '${this.expr}'.`);
    err.code = 'InvalidObject';
    throw err;
  }

  commitParent(oid, n = 1) {
    //console.log('Revision#commitParent', oid, n);
    if(oid === null) {
      return null;
    }
    const commit = this.loadTypedObject(oid, Revision.COMMIT);
    if(commit === null) {
      return null;
    }
    return commit.parents[n-1];
    // beware to reach first commit
    /*return commit.parent === null ?
      commit.oid :
      commit.parents[n-1];*/
  }

  loadTypedObject(oid, type) {
    //console.log('Revision#loadTypedObject', oid, type);
    if(oid === null) {
      return null;
    }
    const object = this.repo.database().load(oid);
    if(object.type === type) {
      return object;
    } else {
      const message = `object ${oid} is a ${object.type}, not a ${type}`;
      this.errors.push(new HintedError(message, []));
      return null;
    }
  }

  readRef(name) {
    const oid = this.repo.refs().readRef(name);
    //console.log('Revision#readRef', name, oid);
    if(oid !== null) {
      return oid;
    }
    const candidates = this.repo.database().prefixMatch(name);
    //console.log('cantidadtes', candidates);
    if(candidates.length === 1) {
      return candidates[0];
    }
    if(candidates.length > 1) {
      this.logAmbiguousSha1(name, candidates);
    }
    return null;
  }

  logAmbiguousSha1(name, candidates) {
    const objects = candidates
      .sort()
      .map((oid) => {
        const object = this.repo.database().load(oid);
        const short = this.repo.database().shortOid(object.oid);
        const info = ` ${short} ${object.type}`;
        if(object.type === 'commit') {
          return `${info} ${object.author.shortDate} - ${object.titleLine()}`;
        } else {
          return info;
        } 
      });
    const message = `short SHA1 ${name} is ambiguous`;
    const hint = [ 'The candidates are:', ...objects ];
    this.erros.push(new HintedError(message, hint));
  }

}

Revision.INVALID_NAME = /^\.|\/\.|\.\.|\/$|\.lock$|@\{|[\x00-\x20*:?\[\\^~\x7f]]/;

Revision.PARENT = /^(.+)\^(\d*)$/;
Revision.ANCESTOR = /^(.+)~(\d+)$/;

Revision.REF_ALIASES = {
  '@': 'HEAD',
};

Revision.COMMIT = 'commit';
Revision.HEAD = '@';

Revision.parse = function(revision) {
  let match = Revision.PARENT.exec(revision);
  if(match !== null) {
    const rev = Revision.parse(match[1]);
    const n = match[2] === "" ? 1 : parseInt(match[2], 10);
    return rev ? new Parent(rev, n) : null;
  } else {
    match = Revision.ANCESTOR.exec(revision);
    if(match !== null) {
      const rev = Revision.parse(match[1]);
      return rev ? new Ancestor(rev, parseInt(match[2], 10)) : null;
    } else {
      if(Revision.validRef(revision)) {
        const name = Revision.REF_ALIASES[revision] || revision;
        return new Ref(name);
      }
    }
  }
  return null;
};

Revision.validRef = function(revision) {
  return Revision.INVALID_NAME.test(revision) ? false : true;
};

module.exports = Revision;

