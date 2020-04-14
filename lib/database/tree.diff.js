const path = require('path');

const Commit = require('./commit');
const Tree = require('./tree');

module.exports = class TreeDiff {

  constructor(database, prune = []) {
    // need it for reading .git/objects
    this.database = database;
    this.changes = {};

    this.buildRoutingTable(prune);
  }

  buildRoutingTable(prune) {
    this.routes = {};
    prune.forEach((pathname) => {
      let table = this.routes;
      const filenames = this.eachFilename(pathname);
      // '/a/b/c/d.txt' => ['a']['b']['c']['d.txt']
      filenames.forEach((name) => {
        if(!table[name]) {
          table[name] = {};
        }
        table = table[name];
      });
    });
    //console.log('TreeDiff#buildRoutingTable', this.routes);
  }

  eachFilename(pathname) {
    if(pathname === '') {
      return [];
    }
    const paths = pathname.split(path.sep);
    if(paths.length === 0) {
      return [];
    }
    if(paths[0] === '/') {
      paths.shift();
    }
    return paths;
  }

  routesForPrefix(prefix) {
    const filenames = this.eachFilename(prefix);
    // this.routes = ['a']['b']['c']['d.txt']
    // prefix = '/a/b'
    // filenames = ['a', 'b']
    if(filenames.length === 0) {
      return this.routes;
    }
    const routes = filenames.reduce((table, name) => {
      return table[name] || {};
    }, this.routes);
    // routes = ['c']['d.txt']
    return routes;
  }

  compareOids(a, b, prefix = '') {
    //console.log('compareOids');
    //console.log(a, b, prefix);
    if(a === b) {
      return;
    }
    //console.log('^^^^^^^^^^^');
    const aEntries = a ? this.oidToTree(a).entries : {};
    const bEntries = b ? this.oidToTree(b).entries : {};
    //console.log(aEntries ? Object.keys(aEntries) : []);
    //console.log('-----------');
    //console.log(bEntries ? Object.keys(bEntries) : []);
    //console.log('###########');
    this.detectDeletions(aEntries, bEntries, prefix);
    this.detectAdditions(aEntries, bEntries, prefix);
  }

  oidToTree(oid) {
    const object = this.database.load(oid);
    //console.log('oidToTree', oid, object);
    if(object instanceof Commit) {
      return this.database.load(object.tree);
    } else if(object instanceof Tree) {
      return object;
    }
  }

  detectDeletions(a, b, prefix) {
    const routes = this.routesForPrefix(prefix);
    //console.log('TreeDiff#detectDeletions', prefix, routes);
    Object.entries(a).forEach(([name, entry]) => {
      //console.log('\t', name);
      // si routes esta vacia entramos
      // si name aparece en routes entramos
      if(
        Object.values(routes).length === 0 ||
        (name in routes)
      ) {
        //console.log('\t', name, 'si me interesa');
        const pathname = path.join(prefix, name);
        const other = b[name] || null;
        if(
          other &&
          entry.mode() === other.mode() &&
          entry.oid === other.oid
        ) {
          // next
        } else {
          const [ treeA, treeB ] = [ entry, other ].map((e) =>
            e && e.tree() ? e.oid : null
          );
          this.compareOids(treeA, treeB, pathname);
          const blobs = [ entry, other ].map((e) =>
            e && e.tree() ? null : e
          );
          if(blobs.length !== 0) {
            this.changes[pathname] = blobs;
          }
        }
      } else {
        //console.log('\t', name, 'no me interesa'); 
        // next
      }
    });
  }

  detectAdditions(a, b, prefix) {
    const routes = this.routesForPrefix(prefix);
    //console.log('Treediff#detectAdditions', prefix, routes);
    Object.entries(b).forEach(([name, entry]) => {
      //console.log('\t', name);
      if(
        Object.values(routes).length === 0 ||
        (name in routes)
      ) {
        //console.log('\t', name, 'si me interesa');
        const pathname = path.join(prefix, name);
        const other = a[name] || null;
        if(other) {
          // next
        } else {
          if(entry.tree()) {
            this.compareOids(null, entry.oid, pathname);
          } else {
            this.changes[pathname] = [ null, entry ];
          }
        }
      } else {
        //console.log('\t', name, 'no me interesa'); 
        // next
      }
    });
  }

};

