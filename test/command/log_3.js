const sinon = require('sinon');
const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Log', function() {

  const commandHelper = new CommandHelper();
  let clock;

  beforeEach(function() {
    clock = sinon.useFakeTimers({
        now: new Date(2019, 1, 1, 15, 30),
        shouldAdvanceTime: true,
        advanceTimeDelta: 20
    });

    commandHelper.beforeEach();
    commandHelper.writeFile('lib/rev_list.rb', 'content of rev_list.rb');
    commandHelper.jitCmd('add', 'lib/rev_list.rb');
    commandHelper.commit('commit message lib/rev_list.rb');
    clock.tick(1000);

    commandHelper.writeFile('lib/database/tree_diff.rb', 'content of tree_diff.rb');
    commandHelper.jitCmd('add', 'lib/database/tree_diff.rb');
    commandHelper.commit('commit message lib/database.tree_diff.rb');
    clock.tick(1000);

    commandHelper.writeFile('A.txt', 'A');
    commandHelper.jitCmd('add', 'A.txt');
    commandHelper.commit('commit message A');
    clock.tick(1000);
  });

  afterEach(function() {
    clock.restore();

    commandHelper.afterEach();
  });

  it('git log two branches history', function() {
    commandHelper.jitCmd(
      'log',
      '--oneline',
      '--decorate',
      'lib/rev_list.rb',
      'lib/database/tree_diff.rb'
    );
    commandHelper.assertStdout([
      'c21e4fc commit message lib/database.tree_diff.rb',
      'e25bec0 commit message lib/rev_list.rb',
    ].join('\n') + '\n');
  });

});
