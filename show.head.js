const path = require('path');

const Repo = require('./lib/repository');

const repo = new Repo(`${process.cwd()}/.git`);
const headOid = repo.refs().readHead();
const commit = repo.database().load(headOid);
//console.log(commit);

function showTree(repo, oid, prefix = '') {
  const tree = repo.database().load(oid);
  console.log('------------');
  console.log(tree, tree.eachEntry());
  tree.eachEntry().forEach(([name, entry]) => {
    const pathname = path.join(prefix, name);
    if(entry.tree()) {
      showTree(repo, entry.oid, pathname);
    } else {
      const mode = entry.mode().toString(8);
      console.log(`${mode} ${entry.oid} ${pathname}`);
    }
  });
}

showTree(repo, commit.tree);
//repo.database().load('e29ab76b55be83765d6b5b9ea5466c24b8e0be21');

