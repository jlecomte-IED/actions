# Auto create a pull request to some destination branch when a pull request gets merged into some source branch

## Usage

Runs a `make target` from the main `Makefile`.

```
action "Create-pull-request master → dev" {
  uses = "fulll/actions/create-pull-request@master"
  secrets = ["GITHUB_TOKEN"]
  env = {
    HEAD="master"
    BASE="dev"
  }
}
```
