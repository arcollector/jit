const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::CherryPick', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 0, 0),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('f.txt', '1');
    commandHelper.writeFile('g.txt', '1');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('A');
    clock.tick(1000);

    commandHelper.writeFile('f.txt', '2');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('B');
    clock.tick(1000);

    commandHelper.jitCmd('branch', 'topic', '@');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('g.txt', '3');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);

    commandHelper.writeFile('h.txt', '4');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('D');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('should cherry pick', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.jitCmd('cherry-pick', 'topic^');
    commandHelper.assertStdout([
      '[master a5f44a4] C',
    ].join('\n') + '\n');
  });

  it('should cherry pick', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.jitCmd('cherry-pick', 'topic^');
    commandHelper.jitCmd('cherry-pick', '--quit');
    commandHelper.assertStdout([
      '[master a5f44a4] C',
    ].join('\n') + '\n');
  });

  it('should cherry pick', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.jitCmd('cherry-pick', 'topic^');
    commandHelper.jitCmd('cherry-pick', '--abort');
    commandHelper.assertStdout([
      '[master a5f44a4] C',
    ].join('\n') + '\n');
  });

});
