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
    commandHelper.writeFile('f.txt', '1');
    commandHelper.writeFile('g.txt', '1');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('A');
    clock.tick(1000);

    commandHelper.writeFile('f.txt', '2');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('B');
    clock.tick(1000);

    commandHelper.jitCmd('branch', 'topic', '@^');
    commandHelper.jitCmd('checkout', 'topic');
    commandHelper.writeFile('g.txt', '3');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('C');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('merge topic at master', function() {
    commandHelper.jitCmd('checkout', 'master');
    commandHelper.merge('topic', 'M');
    commandHelper.jitCmd('log', '--oneline');
    commandHelper.assertStdout([
      '797efec M',
      '502ffb5 B',
      'e4b7027 C',
      '3062ec1 A',
    ].join('\n') + '\n');
  });

});
