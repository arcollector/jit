const assert = require('assert');

const CommandHelper = require('../../test_helpers/command.helper');

describe('Command::Diff', function() {

  const commandHelper = new CommandHelper();

  function assertDiff(output) {
    commandHelper.jitCmd('diff');
    commandHelper.assertStdout(output);
  }

  function assertDiffCached(output) {
    commandHelper.jitCmd('diff', '--cached');
    commandHelper.assertStdout(output);
  }

  beforeEach(function() {
    commandHelper.beforeEach();
    commandHelper.writeFile('1.txt', 'one');
    commandHelper.jitCmd('add', '.');
    commandHelper.commit('commit message');
  });

  afterEach(function() {
    commandHelper.afterEach();
  });

  it('list file\'s changes', function() {
    commandHelper.writeFile('1.txt', 'uan');
    assertDiff(`
diff --git a/1.txt b/1.txt
index 43dd47e..461b562 100644
--- a/1.txt
+++ b/1.txt
@@ -1,1 +1,1 @@
-one
+uan
    `.trim() + '\n');
  });

  it('detect a file mode changed', function() {
    commandHelper.makeExecutable('1.txt');
    assertDiff(`
diff --git a/1.txt b/1.txt
old mode 100644
new mode 100755
    `.trim() + '\n');
  });

  it('detect a file mode changed and also its contents', function() {
    commandHelper.writeFile('1.txt', 'uan');
    commandHelper.makeExecutable('1.txt');
    assertDiff(`
diff --git a/1.txt b/1.txt
old mode 100644
new mode 100755
index 43dd47e..461b562
--- a/1.txt
+++ b/1.txt
@@ -1,1 +1,1 @@
-one
+uan
    `.trim() + '\n');
  });

  it('detect a deleted file', function() {
    commandHelper.delete('1.txt');
    assertDiff(`
diff --git a/1.txt b/1.txt
deleted file mode 100644
index 43dd47e..0000000
--- a/1.txt
+++ /dev/null
@@ -1,1 +0,0 @@
-one
    `.trim() + '\n');
  });

  it('detect changes in a staged file', function() {
    commandHelper.writeFile('1.txt', 'uan');
    commandHelper.jitCmd('add', '1.txt');
    assertDiffCached(`
diff --git a/1.txt b/1.txt
index 43dd47e..461b562 100644
--- a/1.txt
+++ b/1.txt
@@ -1,1 +1,1 @@
-one
+uan
    `.trim() + '\n');
  });

  it('detect a new file that then is staged', function() {
    commandHelper.writeFile('2.txt', 'two');
    commandHelper.jitCmd('add', '2.txt');
    assertDiffCached(`
diff --git a/2.txt b/2.txt
new file mode 100644
index 0000000..64c5e58
--- /dev/null
+++ b/2.txt
@@ -0,0 +1,1 @@
+two
    `.trim() + '\n');
  });

  it('detect a deleted file that was present in the index', function() {
    commandHelper.delete('.git/index');
    assertDiffCached(`
diff --git a/1.txt b/1.txt
deleted file mode 100644
index 43dd47e..0000000
--- a/1.txt
+++ /dev/null
@@ -1,1 +0,0 @@
-one
    `.trim() + '\n');
  });

});
