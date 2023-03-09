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

:warning: `stage` value can be `dev`, `preprod` or `production`

```yaml
create-deployment:
  uses: fulll/actions/.github/workflows/create-deployment-workflow.yml@master
  # stage value can be dev, preprod or production
  with:
    stage: dev 
```

### Update deployment status

At the end of the job, add this step to mark the deployment as succeed or failed:

```yaml
update-deployment:
  needs: [create-deployment, deploy]
  uses: fulll/actions/.github/workflows/update-deployment-workflow.yml@master
  if: always()
  # stage value can be dev, preprod or production
  with:
    stage: dev 
    on_failure: ${{ contains(needs.*.result, 'failure') }}
```

:information_source: On `prod` context it will also add/remove the deploy button on the latest release of your project.

### Init production deployment (`release`)

Add these step in `release` workflow to create a deployment in progress for production deployment:

```yaml
  create-deployment-release:
    needs: [ plan-infrastructure ]
    uses: fulll/actions/.github/workflows/create-deployment-release-workflow.yml@master
    secrets:
      PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
```

### Prepare production deployment (`deploy prod`)

Update current release and deployment to `in_progress`

```yaml
name: Deploy Production
on: deployment_status

env:
  TF_VAR_stage: prod

jobs:
  prepare-deployment:
    uses: fulll/actions/.github/workflows/prepare-prod-deployment-workflow.yml@master
    with:
      stage: production
```

## Automatic "master → dev" pull request

:warning: Your repository must be configured with bot token secret to use this action.

Add this Github action in your repository to add a new automatic workflow that will automatically:

1. Create a new "master → dev" pull request when master branch is updated.
2. Enable the automatic merge on the pull request.
3. Approve this PR to unlock repository minimum requirement for merge.

Path: `.github/workflows/automatic-master-dev-pr.yml`

### Workflows inputs:

`auto_merge` _(optional)_: Set value to `false` to disable auto-approve and auto-merge steps. Defaults is `true`

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
    with:
      auto_merge: true
```



## Automatic pull request

:warning: Your repository must be configured with bot token secret to use this action.

Add this Github action in your repository to add a new automatic workflow that will automatically :

1. Create a new pull request.
2. Enable the automatic merge on the pull request.
3. Approve this PR to unlock repository minimum requirement for merge.

This workflow add options to select which branches you want to merge.

### Workflows inputs:

`head_branch` : The updated branch
`base_branch` : The branch to merge
`auto_merge` _(optional)_: Set value to `false` to disable auto-approve and auto-merge steps. Defaults is `true`

The workflow will be triggered on each `head_branch` update and will merge this branch into `base_branch`

```yml
name: automatic master → dev PR

on:
  push:
    branches:
      - master

jobs:
  automatic-pr:
    uses: fulll/actions/.github/workflows/automatic-pr-workflow.yml@master
    secrets:
      botToken: ${{ secrets.BOT_TOKEN }}
    inputs:
      base_branch: dev
      head_branch: master
      auto_merge: true
```
