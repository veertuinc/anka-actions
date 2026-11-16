# Releasing

Users select an action by its folder and a tag. The same tag covers every action in this repository.

Full release tags, as in the README examples:

- `veertuinc/anka-actions/up@v2.0.0`
- `veertuinc/anka-actions/down@v2.0.0`

Major tags follow the latest stable release in that major version:

- `veertuinc/anka-actions/up@v2`
- `veertuinc/anka-actions/down@v2`

## Version

The release tag is `vMAJOR.MINOR.PATCH`. The package version is that number with no `v` prefix.

These files carry that package version:

- `package.json`
- `up/package.json`
- `down/package.json`
- `common/package.json`
- `package-lock.json` (the root version and the `common`, `up`, and `down` entries)

Set them together:

```bash
python3 scripts/set-release-version.py X.Y.Z
```

Example: tag `v2.0.1` uses `python3 scripts/set-release-version.py 2.0.1`.

On 2026-11-09 the latest full release is `v2.0.0`. The package version on that release is `2.0.0`.

A security release adds one to the patch number. Keep the major and the minor. `v2.0.0` is followed by `v2.0.1`.

A version-only edit does not change action source. Commit the files the script writes. `Check dist/ / check-dist` still has to pass.

## Publish a release

1. Start from the `edge` commit that users should run.
2. Set the package version to the release number. Commit that change on `edge`.
3. Wait until `build-test / build` and `Check dist/ / check-dist` are green on that commit.
4. Create a GitHub Release for that commit.
5. Set the tag to `vMAJOR.MINOR.PATCH`. Example: `v2.0.1`.
6. Publish it as a full release. Leave the pre-release box clear.

`test-demo` and `test-enterprise` run on pull requests. They do not run again on the `edge` push. They must be green on the pull request that merged.

Publishing a release starts `.github/workflows/update-major-tag.yml` and `.github/workflows/test-release.yml`.

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

## Automation

Default branch: `edge`.

There is no Jenkins job for this repository. Build, test, and release run in GitHub Actions. Do not trigger Jenkins. Do not invent a job name.

### Next security tag

Read the latest full GitHub Release. Ignore a prerelease and a draft.

```bash
gh release view --repo veertuinc/anka-actions --json tagName,isPrerelease,isDraft
```

Add one to the patch number. On 2026-11-09 the latest tag is `v2.0.0`, so the next security tag is `v2.0.1` and the package version is `2.0.1`.

### Before the tag

1. The security fix is on `edge`.
2. From the repo root, run `python3 scripts/set-release-version.py X.Y.Z`. Commit the files it changes. One commit is enough. If `edge` rejects the push, open a pull request into `edge`, wait for the checks below, and merge it. Tag the merge commit.
3. On that commit, these checks must be green:
   - `build-test / build`
   - `Check dist/ / check-dist`
4. `CodeQL / Analyze` also runs on the push to `edge`. If that run is red, stop.
5. `test-demo` and `test-enterprise` are pull-request checks. Confirm they passed on the pull request that merged the fix. Do not wait for them on the `edge` commit.
6. If a required check fails, stop. Do not publish.

### Publish

1. Create a full GitHub Release on that commit. Tag `vX.Y.Z`. Leave the pre-release box clear. Use the commit SHA as the target, not the branch name `edge`, so a later push cannot move the release.
2. Release notes list each security fix (GHSA or CVE, and the package). Do not add a CHANGELOG file.
3. Command shape:

```bash
gh release create vX.Y.Z --target <commit-sha> --title vX.Y.Z --notes "<security fixes>"
```

4. Wait for workflow `Update major version tag` (`.github/workflows/update-major-tag.yml`), job `Move major version tag`. Confirm lightweight tag `vMAJOR` points at `<commit-sha>`. If the workflow did not run, stop. Do not move the tag.
5. Workflow `test-release` starts on the same publish. It checks out tag `vX.Y.Z` and runs `up` and `down` from that commit. It does not pin `@v2.0.0`.
6. `test-release` uses repo secrets `VEERTU_GITHUB_SERVICE_USER_PAT`, `CONTROLLER_URL`, `CONTROLLER_VEERTU_COM_CERT`, and `CONTROLLER_VEERTU_COM_KEY`. Those secrets are set. Do not print them. The inside-VM job uses the self-hosted runner that `up` registers.
7. If `test-release` fails, report the run URL. Do not publish a second release to retry it. Do not delete the tag.

Do not create a `release/vX.Y.Z` branch. The old branch `release/v2.0.0` is not the release path.
