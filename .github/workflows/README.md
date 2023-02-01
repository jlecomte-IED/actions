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

    create-deployment-call:
        needs: [expose-env-var]
        uses: fulll/actions/.github/workflows/create-deployment-workflow.yml@master
        with: 
         stage: ${{ needs.expose-env-var.outputs.stage }}
```

### Update deployment status

#### Success

At the end of the job, add this step to mark the deployment as succeed:

```yaml 
  update-deployment-call:
    needs: [ create-deployment-call,deploy,expose-env-var ]
    uses: fulll/actions/.github/workflows/update-deployment-workflow.yml@master
    with:
      stage: ${{ needs.expose-env-var.outputs.stage }}
```

:information_source: On `prod` context it will also add the deploy button on the latest release of your project.

#### Failure

In some cases, your workflow can failed, you can use this step to update your deployment status:

```yaml 
  update-deployment-failure-call:
    needs: [ create-deployment-call,deploy,expose-env-var ]
    uses: fulll/actions/.github/workflows/update-deployment-failure-workflow.yml@master
    with:
      stage: ${{ needs.expose-env-var.outputs.stage }}
```

:information_source: On `prod` context it will also remove the deploy button on the latest release of your project.

## Automatic "master → dev" pull request 

Add theses 3 Github actions in your repository to add a new automatic workflow that will automatically:  
1. Create a new "master → dev" PR when master branch is updated.
2. Approve this PR to unlock repository minimum requirement for merge.
3. Merge the PR. 

Path: `.github/workflows/auto-create-master-dev-pr.yml`
```yaml
name: automatic create master → dev PR

on:
  push:
    branches:
      - master

jobs:
  auto-create-master-dev-pr:
    uses: fulll/actions/.github/workflows/auto-create-master-dev-pr.yml@master
```

Path: `.github/workflows/auto-review-master-dev-pr.yml`
```yaml
name: automatic review master → dev PR

on:
  push:
    branches:
      - master

jobs:
  auto-approve-master-dev-pr:
    uses: fulll/actions/.github/workflows/auto-review-master-dev-pr.yml@master
```

Path: `.github/workflows/auto-merge-master-dev-pr.yml`
```yaml
name: automatic merge pull request

on:
  pull_request_review:
    types:
      - submitted
  check_suite:
    types:
      - completed
  status: {}

jobs:
  auto-merge-master-dev-pr:
    uses: fulll/actions/.github/workflows/auto-merge-master-dev-pr.yml@master
```