# Anka Actions

A monorepo of GitHub Actions for orchestrating ephemeral, self-hosted runners on
[Anka Build Cloud](https://docs.veertu.com/anka/anka-build-cloud/). Each action lives in
its own subfolder and is referenced by its path.

## Actions in this repository

| Action | Path | Description |
| --- | --- | --- |
| [Anka Actions - Up](up/README.md) | `veertuinc/anka-actions/up@v1` | Spins up a new Anka VM instance and registers a self-hosted runner. |
| [Anka Actions - Down](down/README.md) | `veertuinc/anka-actions/down@v1` | Tears down the Anka VM instance and removes the runner. |

## Usage

Reference each action by its folder path within this repository:

```yaml
jobs:
  action-up:
    runs-on: ubuntu-latest
    steps:
      - uses: veertuinc/anka-actions/up@v1
        id: action-up
        with:
          gh-pat: ${{ secrets.SERVICE_USER_PAT }}
          template-id: '9690461a-02b5-412d-8778-dab4167743db'
          controller-url: 'https://controller.mysite.com'
    outputs:
      action-id: ${{ steps.action-up.outputs.action-id }}

  inside_vm_job:
    needs: action-up
    runs-on: [ self-hosted, "${{ needs.action-up.outputs.action-id }}" ]
    steps:
      - name: Inside VM Job
        run: echo "running on runner inside of VM (${{ needs.action-up.outputs.action-id }})"

  action_down:
    if: always()
    needs: [ action-up, inside_vm_job ]
    runs-on: ubuntu-latest
    steps:
      - uses: veertuinc/anka-actions/down@v1
        with:
          action-id: ${{ needs.action-up.outputs.action-id }}
          gh-pat: ${{ secrets.SERVICE_USER_PAT }}
          controller-url: 'https://controller.mysite.com'
```

See each action's README for the full list of inputs, outputs, and advanced
configuration (certificate auth, root token auth, GitHub Enterprise Server, etc.).

## Repository layout

```
.
├── package.json   # root npm workspaces manifest (common, up, down)
├── up/            # "Anka Actions - Up" action (action.yml + bundled dist/)
├── down/          # "Anka Actions - Down" action (action.yml + bundled dist/)
├── common/        # shared library, consumed by up/ and down/ as a workspace
└── .github/
    ├── dependabot.yml
    └── workflows/
        ├── test.yml             # builds, lints, and tests every package
        ├── check-dist.yml       # verifies committed dist/ matches source
        ├── codeql-analysis.yml  # CodeQL security scanning across the repo
        ├── test-demo.yml        # live up/down integration test (github.com)
        └── test-enterprise.yml  # live up/down integration test (GitHub Enterprise Server)
```

## Development

This repo uses [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces).
`common` is a workspace package, and `up`/`down` depend on it by name
(`"anka-actions-common": "*"`). A single install at the repo root links `common`
into `up`/`down` and hoists shared dependencies, so there is **one** lockfile at
the root rather than one per package.

```bash
# install everything once, from the repo root
npm install

# build/lint/test every package (runs in workspace order: common, then up, then down)
npm run all --workspaces --if-present

# work on a single package
npm run build --workspace common
npm run build --workspace up && npm run package --workspace up
```

### Rebuilding after changing `common`

Because `up` and `down` bundle the **local** `common` source into their
`dist/index.js` (via `ncc`), any change to `common` requires rebuilding both
actions so the bundled output picks it up:

```bash
npm run build --workspace common
npm run build --workspace up   && npm run package --workspace up
npm run build --workspace down && npm run package --workspace down
```

The `dist/` directory of each action is committed and is what actually runs when the
action is referenced via `uses:`. The `check-dist` workflow rebuilds `common`, then
re-packages `up` and `down`, and fails if the committed `dist/` drifts from what the
source produces — so always re-run the commands above and commit the regenerated
`dist/` after changing `common`, `up`, or `down`.

## License

[MIT](up/LICENSE)


## TODO

- [ ] Rewrite with ESM instead of CommonJS