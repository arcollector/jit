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

    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('f.txt', 'three');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('merge with clonficts', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('status', '--porcelain');
    commandHelper.assertStdout([
      'UU f.txt',
    ].join('\n') + '\n');
    commandHelper.jitCmd('status');
    commandHelper.assertStdout([
      'Unmerged paths',
      '',
      'both modified:   f.txt',
      '',
      'nothing to commit, working tree clean',
    ].join('\n') + '\n');
  });

});
