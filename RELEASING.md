# Releasing

Users select an action by its folder and a tag. The same tag covers every action in this repository.

Full release tags, as in the README examples:

- `veertuinc/anka-actions/up@v2.0.0`
- `veertuinc/anka-actions/down@v2.0.0`

Major tags follow the latest stable release in that major version:

- `veertuinc/anka-actions/up@v2`
- `veertuinc/anka-actions/down@v2`

## Publish a release

1. Choose the commit that users should run. Development is on `edge`.
2. Create a GitHub Release for that commit.
3. Set the tag to `vMAJOR.MINOR.PATCH`. Example: `v2.3.1`.
4. Publish the release as a full release.

A prerelease does not move the major tag. Leave the pre-release box clear for a stable release.

Publishing a release also starts `.github/workflows/test-release.yml`. That workflow runs the published `up` and `down` actions.

## Major version tag

You do not move the major tag by hand. It moves automatically.

When a stable release is published, `.github/workflows/update-major-tag.yml` moves the major tag to the release commit. The workflow uses the default `GITHUB_TOKEN` with `contents: write`.

The major tag is the first numeric part of the release tag, with the `v` prefix kept:

| Release tag | Major tag that moves |
| --- | --- |
| `v2.3.1` | `v2` |
| `v2.0.0` | `v2` |
| `v10.1.0` | `v10` |

The workflow force-updates that tag. The full tag, such as `v2.3.1`, stays on the release commit.

The workflow does not run for a prerelease. The release tag must be `vMAJOR.MINOR.PATCH`. A tag such as `v2.3.1-rc.1` does not move the major tag.

`v2` and `v2.0.0` are lightweight tags. The workflow keeps the major tag lightweight.
