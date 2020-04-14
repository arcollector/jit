const fs = require('fs');
const path = require('path');

const Tree = require('../../database/tree');
const Author = require('../../database/author');
const Commit = require('../../database/commit');

module.exports = {

  CONFLICT_MESSAGE: [
    'hint: Fix them up in the work tree, and then use \'jit add <file>\'',
    'hint: as appropriate to mark resolution and make a commit.',
    'fatal: Exiting because of an unresolved conflict.',
  ].join('\n'),

  MERGE_NOTES: [
    '',
    'It looks like you may be committing a merge.',
    'If this is not correct, please remove the file',
    '\t.git/MERGE_HEAD',
    'and try again',
  ].join('\n'),

  CHERRY_PICK_NOTES: [
    '',
    'It looks like you may be committing a cherry-pick.',
    'If this is not correct, please remove the file',
    '\t.git/CHERRY_PICK_HEAD',
    'and try again',
  ].join('\n'),

  defineWriteCommitOptions(options) {
    this.options.edit = 'auto';

    Object.entries(options)
      .forEach(([key, value]) => {
        if(key === 'e' || key === 'edit') {
          this.options.edit = value;
        } else if(key === 'no-edit') {
          this.options.edit = false;

        } else if(key === 'm' || key === 'message') {
          this.options.message = value;
          if(this.options.edit === 'auto') {
            this.options.edit = false;
          }

        } else if(key === 'F' || key === 'file') {
          this.options.file = value;
          if(this.options.edit === 'auto') {
            this.options.edit = false;
          }
        }
      });
  },

  readMessage() {
    if(this.options.message) {
      return `${this.options.message}\n`;
    } else if(this.options.file) {
      return fs.readFileSync(this.options.file, 'utf-8');
    } else {
      return this.stdin();
    }
  },

  commitMessagePath() {
    return path.join(this.repo.gitPath, 'COMMIT_EDITMSG');
  },

  currentAuthor() {
    const name = this.env.GIT_AUTHOR_NAME ||
      this.repo.config().get(['user', 'name']);
    const email = this.env.GIT_AUTHOR_EMAIL ||
      this.repo.config().get(['user', 'email']);
    return new Author(name, email, new Date());
  },

  writeCommit(parents, message) {
    const tree = this.writeTree();
    const author = this.currentAuthor();
    const commit = new Commit(
      parents,
      tree.oid,
      author,
      author,
      message
    );
    this.repo.database().store(commit);
    this.repo.refs().update();
    this.repo.refs().updateHead(commit.oid);
    return commit;
  },

  writeTree() {
    const entries = this.repo.index().eachEntry();
    //console.log('entries loaded from index are', entries);
    const root = Tree.build(entries);
    root.traverse((tree) =>
      this.repo.database().store(tree)
    );
    return root;
  },

  printCommit(commit) {
    const ref = this.repo.refs().currentRef();
    let info = ref.head() ? 'detached HEAD' : ref.shortName();
    const oid = this.repo.database().shortOid(commit.oid);
    if(commit.parent === null) {
      info = `${info} (root-commit)`;
    }
    info = `${info} ${oid}`;
    this.puts(`[${info}] ${commit.titleLine()}`);
  },

  pendingCommit() {
    this._pendingCommit = this._pendingCommit || this.repo.pendingCommit();
    return this._pendingCommit;
  },

  resumeMerge(type) {
    if(type === 'merge') {
      this.writeMergeCommit();
    } else if(type === 'cherry_pick') {
      this.writeCherryPickCommit();
    } else if(type === 'revert') {
      this.writeRevertCommit();
    }

    this.exit(0);
  },

  writeMergeCommit() {
    // process can end here
    this.handleConflictedIndex();

    const parents = [
      this.repo.refs().readHead(),
      this.pendingCommit().mergeOid(),
    ];a
    const message = this.composeMergeMessage(this.MERGE_NOTES);
    this.writeCommit(parents, message);

    this.pendingCommit().clear('merge');
  },

  writeCherryPickCommit() {
    this.handleConflictedIndex();
   
    const parents = [this.repo.refs().readHead()];
    const message = this.composeMergeMessage(this.CHERRY_PICK_NOTES);

    const pickOid = this.pendingCommit().mergeOid('cherry_pick');
    const commit = this.repo.database().load(pickOid);

    const picked = new Commit(
      parents,
      this.writeTree().oid,
      commit.author,
      this.currentAuthor(),
      message
    );

    this.repo.database().store(picked);
    this.repo.refs().updateHead(picked.oid);
    this.pendingCommit().clear('cherry_pick');
  },

  writeRevertCommit() {
    this.handleConflictedIndex();

    const parents = [this.repo.refs().readHead()];
    const message = this.composeMergeMessage();
    this.writeCommit(parents, message);

    this.pendingCommit().clear('revert');
  },

  composeMergeMessage(notes = null) {
    return this.editFile(
      this.commitMessagePath(),
      (editor) => {
        editor.puts(this.pendingCommit().mergeMessage());
        if(notes !== null) {
          editor.note(notes);
        }
        editor.puts('');
        // avoid circular reference
        editor.note(require('../merge').COMMIT_NOTES);
      }
    );
  },

  handleConflictedIndex() {
    if(!this.repo.index().conflict()) {
      return;
    }

    const message = 'Commiting is not possible because you have unmerged files';
    this.stderr.write(`error: ${message}\n`);
    this.stderr.write(this.CONFLICT_MESSAGE);
    this.exit(128);
  },

};

