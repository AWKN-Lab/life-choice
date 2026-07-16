# Kline V2 closure differential backup

This directory preserves the three commits that were unique to the local
`codex/kline-v2-closure` worktree before that worktree was removed.

## Provenance

- Repository: `AWKN-Lab/life-choice`
- Original base: `bc2edbae90e67719e728b2b5c7065b5210660f81`
- Integrated head: `6c3be54abb4a9ac880da2bdbcb1db63d924c5ad2`
- Commits:
  - `9835ec2f5723ee0e056c3bb2de244ebf7dc29aea` - Phase 0 baseline freeze
  - `813cc095029f368017a9e15340a1dbbf4f67fcdd` - Phase 1 algorithm and contract closure
  - `6c3be54abb4a9ac880da2bdbcb1db63d924c5ad2` - Phase 2 execution manual

The original branch could not be pushed directly because unrelated historical
knowledge-base blobs exceed GitHub's 100 MB file limit. These patches contain
the complete Kline V2 differential without those historical blobs.

`kline-v2-final-files.zip` is a self-contained snapshot of the affected Kline
source, contracts, tests, execution plans, and baseline evidence at the
integrated head. It can be used even when the original base commit is not
available.

## Restore

Start from a checkout that contains the original base commit, then apply the
patches in filename order:

```bash
git am backups/kline-v2-closure-20260717/patches/*.patch
```

If the target branch has moved, use a three-way application:

```bash
git am -3 backups/kline-v2-closure-20260717/patches/*.patch
```

Before accepting a restored branch, rerun the Kline calculation, decision,
golden-case, and consult-bridge test suites.
