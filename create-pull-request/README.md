# make

## Usage

Runs a `make target` from the main `Makefile`.

```
action "Create-pull-request master → dev" {
  uses = "inextensodigital/actions/create-pull-request@master"
  secrets = ["GITHUB_TOKEN"]
  env = {
    HEAD="master"
    BASE="dev"
  }
}
```
