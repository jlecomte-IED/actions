# README

Your repository must be configured with `IEDBOT_TOKEN` and `GITHUB_TOKEN` secrets to use these actions.


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
        needs: [ create-deployment-call,deploy,expose-env-var ]
        uses: fulll/actions/.github/workflows/update-deployment-workflow.yml@master
        with:
          stage: ${{ needs.expose-env-var.outputs.stage }}
```

:information_source: On `prod` context it will also add/remove the deploy button on the latest release of your project.

## Automatic "master → dev" pull request 

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
```
