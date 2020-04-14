const path = require('path');
const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const Index = require('../lib/index');

describe('Index', function() {
  const tmpPath = path.resolve('../tmp')
  const indexPath = `${tmpPath}/index`;
  const index = new Index(indexPath);

  beforeEach(function() {
    // need to setup some variables for testing purposes
    index.clear();
  });

  const stat = fs.statSync(__filename);
  const oid = crypto
    .createHash('sha1')
    .update(Math.random()
    .toString())
    .digest('hex')
  ;

  it('adds a single file', function() {
    index.add('alice.txt', oid, stat);
    assert.deepEqual(
      ['alice.txt'],
      index.eachEntry().map(({ path }) => path)
    );
  });

  it('replaces a file with a directory', function() {
    index.add('alice.txt', oid, stat);
    index.add('bob.txt', oid, stat);
    
    index.add('alice.txt/nested.txt', oid, stat);

    assert.deepEqual(
      ['alice.txt/nested.txt', 'bob.txt'],
      index.eachEntry().map(({ path }) => path)
    );
  });

  it('replaces a directory with a file', function() {
    index.add('alice.txt', oid, stat);
    index.add('nested/bob.txt', oid, stat);

    index.add('nested', oid, stat);

    assert.deepEqual(
      ['alice.txt', 'nested'],
      index.eachEntry().map(({ path }) => path)
    );
  });

  it('recursively replaces a directory with a file', function() {
    index.add('alice.txt', oid, stat);
    index.add('nested/bob.txt', oid, stat);
    index.add('nested/inner/claire.txt', oid, stat);

    index.add('nested', oid, stat);

    assert.deepEqual(
      ['alice.txt', 'nested'],
      index.eachEntry().map(({ path }) => path)
    );
  });
});

