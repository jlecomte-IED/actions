# README

## Deployment status

In order to follow deploy status, you must implement these steps in your Github actions:

```
.github
   └── workflow
       └── deploy_dev.yml
       └── deploy_preprod.yml
       └── deploy_prod.yml
       └── release.yml
```

### Init a deployment workflow

Add these steps on your first job in order to create a deployment in progress:

```yaml
expose-env-var:
  name: expose env var
  runs-on: ubuntu-latest
  outputs:
    stage: ${{ env.TF_VAR_stage }}
  steps:
    - run: echo "Exposing env vars"

create-deployment:
  needs: [expose-env-var]
  uses: fulll/actions/.github/workflows/create-deployment-workflow.yml@master
  with:
    stage: ${{ needs.expose-env-var.outputs.stage }}
```

### Update deployment status

At the end of the job, add this step to mark the deployment as succeed or failed:

```yaml
update-deployment:
  needs: [create-deployment-call, deploy, expose-env-var]
  uses: fulll/actions/.github/workflows/update-deployment-workflow.yml@master
  with:
    stage: ${{ needs.expose-env-var.outputs.stage }}
```

:information_source: On `prod` context it will also add/remove the deploy button on the latest release of your project.

### Prepare production deployment (`deploy prod`)

Update current release and deployment to `in_progress`

```yaml
name: Deploy Production
on: deployment_status

env:
  TF_VAR_stage: prod

jobs:
  expose-env-vars:
    name: expose env vars
    runs-on: ubuntu-latest
    outputs:
      stage: ${{ env.TF_VAR_stage }}
    steps:
      - run: |
          echo "Exposing env vars"
          latest_release=$(gh release list --exclude-drafts --exclude-pre-releases -L 1 -R '$GITHUB_REPOSITORY' | cut -f 3)
          echo "LATEST_RELEASE=$latest_release" >> $GITHUB_ENV

  prepare-deployment:
    needs: [expose-env-vars]
    uses: fulll/actions/.github/workflows/prepare-prod-deployment-workflow.yml@master
    with:
      stage: ${{ needs.expose-env-vars.outputs.stage }}
```

## Automatic "master → dev" pull request

:warning: Your repository must be configured with bot token secret to use this action.

Add this Github action in your repository to add a new automatic workflow that will automatically:

1. Create a new "master → dev" pull request when master branch is updated.
2. Enable the automatic merge on the pull request.
3. Approve this PR to unlock repository minimum requirement for merge.

Path: `.github/workflows/automatic-master-dev-pr.yml`

```yaml
name: automatic master → dev PR

on:
  push:
    branches:
      - master

jobs:
  automatic-master-dev-pr:
    uses: fulll/actions/.github/workflows/automatic-master-dev-pr.yml@master
    secrets:
      botToken: ${{ secrets.BOT_TOKEN }}
```
