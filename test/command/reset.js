const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Reset', function() {

  const commandHelper = new CommandHelper();

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('hello.txt', 'hello');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.writeFile('world.txt', 'world');
    commandHelper.jitCmd('add', 'world.txt');
    commandHelper.writeFile('a-dir/nested.txt', 'content');
    commandHelper.jitCmd('add', 'a-dir');
    commandHelper.writeFile('a/b/c/file.txt', 'content');
    commandHelper.jitCmd('add', 'a');
    commandHelper.commit('initial commit');
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  }); 

  it('should preserve changes file workspace if same file is in index', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.writeFile('hello.txt', 'ohaiyo');
    commandHelper.jitCmd('reset', 'hello.txt');
    assert(
      'ohaiyo',
      commandHelper.catFile('hello.txt')
    );
  });

  it('should reset file to previous commit', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.jitCmd('add', 'hello.txt');
    commandHelper.commit('second commit');
    commandHelper.jitCmd('reset', '@^', 'hello.txt');      
    assert(
      'hello',
      commandHelper.catFile('hello.txt')
    );
  });

  it('should clean workspace to match HEAD', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.writeFile('world.txt', 'mundo');
    commandHelper.jitCmd('reset');
    assert(
      'hello',
      commandHelper.catFile('hello.txt')
    );
    assert(
      'world',
      commandHelper.catFile('world.txt')
    );
  });

  it('should clean workspace to match previous commit', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.writeFile('world.txt', 'mundo');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('second commit');
    commandHelper.jitCmd('reset', '@^');
    assert(
      'hello',
      commandHelper.catFile('hello.txt')
    );
    assert(
      'world',
      commandHelper.catFile('world.txt')
    );
  });

  it('should clean workspace to match HEAD, now with --force flag', function() {
    commandHelper.writeFile('hello.txt', 'hola');
    commandHelper.writeFile('world.txt', 'mundo');
    commandHelper.jitCmd('reset', '--hard');
    assert(
      'hello',
      commandHelper.catFile('hello.txt')
    );
    assert(
      'world',
      commandHelper.catFile('world.txt')
    );
  });

});
