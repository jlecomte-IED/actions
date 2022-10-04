# deployment

## Usage

Creates a [Github Deployment](https://developer.github.com/v3/repos/deployments/).

### Production release

```hcl
action "Create deployment & update release" {
  uses = "fulll/actions/deployment@master"
  args = "create"
}
```

### Other stages releases

```hcl
action "Create deployment dev" {
  uses = "fulll/actions/deployment@master"
  args = "create"
  env = {
    STAGE = "dev"
    DEPLOY_STATUS = "in_progress"
  }
  secrets = [
    "GITHUB_TOKEN"
  ]
}
```
