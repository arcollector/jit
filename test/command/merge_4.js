const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Merge', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('f.txt', 'one');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('A');
    clock.tick(1000);

    commandHelper.writeFile('f.txt', 'two');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('B');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('should fail to merge because there are conflicts', function() {
    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('f.txt', 'three');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.assertStdout([
      'Auto-merging f.txt',
      'CONFLICT (content): Merge conflict in f.txt',
      'Automatic merge failed; fix conflicts and then commit the result.',
      '',
    ].join('\n'));
    commandHelper.jitCmd('merge', '--continue');
    commandHelper.assertStderr([
      'error: Commiting is not possible because you have unmerged files',
      'hint: Fix them up in the work tree, and then use \'jit add <file>\'',
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
    ].join('\n'));
    commandHelper.jitCmd('merge', '--abort');
    assert(
      'two',
      commandHelper.catFile('f.txt')
    );
  });

  it('should fail to merge because there are conflicts', function() {
    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.delete('f.txt');
    commandHelper.mkdir('f.txt');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('status');
    commandHelper.assertStdout([
      'Auto-merging f.txt',
      'CONFLICT (content): Merge conflict in f.txt'
    ].join('\n') + '\n');
  });

});
