const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Add', function() {

  const commandHelper = new CommandHelper();

  beforeEach(function() {
    commandHelper.beforeEach();
  });

  afterEach(function() {
    commandHelper.afterEach();
  }); 

  function assertIndex(expected) {
    const repo = commandHelper.repo();
    repo.index().load();
    const actual = repo
      .index()
      .eachEntry()
      .map((entry) =>
        [entry.mode(), entry.path]
      )
    ;
    assert.deepEqual(expected, actual);
  }

  it('adds a regular file to the index', function() {
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.jitCmd('add', 'hello.txt');
    assertIndex([[parseInt('0100644', 8), 'hello.txt']]);
  });

  it('adds an executable file to the index', function() {
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.makeExecutable('hello.txt');
    commandHelper.jitCmd('add', 'hello.txt');
    assertIndex([[parseInt('0100755', 8), 'hello.txt']]);
  });

  it('adds multiple files to the index', function() {
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.writeFile('world.txt', 'world');
    commandHelper.jitCmd('add', 'hello.txt', 'world.txt');
    assertIndex([
      [parseInt('0100644', 8), 'hello.txt'],
      [parseInt('0100644', 8), 'world.txt'],
    ]);
  });

  it('incrementally adds files to the index', function() {
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.writeFile('world.txt', 'world');
    commandHelper.jitCmd('add', 'world.txt');
    assertIndex([
      [parseInt('0100644', 8), 'world.txt'],
    ]);

    commandHelper.jitCmd('add', 'hello.txt');
    assertIndex([
      [parseInt('0100644', 8), 'hello.txt'],
      [parseInt('0100644', 8), 'world.txt'],
    ]);

  });

  it('adds a directory to the index', function() {
    commandHelper.writeFile('a-dir/nested.txt', 'content');
    commandHelper.jitCmd('add', 'a-dir');
    assertIndex([
      [parseInt('0100644', 8), 'a-dir/nested.txt'],
    ]);
  });

  it('adds the repository root to the index', function() {
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', '.');
    assertIndex([
      [parseInt('0100644', 8), 'a/b/c/file.txt'],
    ]);
  });

  it('is silent on success', function() {
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.assertStatus(0);
    commandHelper.assertStdout('');
    commandHelper.assertStderr('');
  });

  it('fails for non-existent files', function() {
    commandHelper.jitCmd('add', 'no-such-file');
    commandHelper.assertStderr(`
pathspec(/home/pi/test-repo/no-such-file): did not match any files
    `.trim() + '\n');
    commandHelper.assertStatus(128);
    assertIndex([]);
  });

  it('fails for unreadable files', function() {
    commandHelper.writeFile('secret.txt', '');
    commandHelper.makeUnreadable('secret.txt');
    commandHelper.jitCmd('add', 'secret.txt');
    commandHelper.assertStderr(`
read(/home/pi/test-repo/secret.txt): Permission denied
fatal: adding files failed
    `.trim() + '\n');
    commandHelper.assertStatus(128);
    assertIndex([]);
  });

  it('fails if the index is locked', function() {
    commandHelper.writeFile('file.txt', '');
    commandHelper.writeFile('.git/index.lock', '');
    commandHelper.jitCmd('add', 'file.txt');
    commandHelper.assertStatus(128);
    assertIndex([]);
  });

});
