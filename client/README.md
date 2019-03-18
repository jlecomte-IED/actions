# GITHUB WORKFLOW

Manage Github Action workflows and actions by cli. Allows you to script edition.

### Available commands:

- [x] github-workflow initialize
- [x] github-workflow lint
- [x] github-workflow workflow ls [ID][--on="pull_request"]
- [x] github-workflow workflow create ID ON [--resolve=<action>]
- [x] github-workflow workflow add ID --resolve=<action>
- [x] github-workflow workflow rename SOURCE TARGET
- [ ] github-workflow workflow rm NAME
- [ ] github-workflow workflow merge ID [--on=]

- [x] github-workflow action ls [ID]
- [x] github-workflow action create ID USE [--env=<env_name>=<env_value> --secret=<secret_name>]
- [x] github-workflow action rename SOURCE TARGET
- [x] github-workflow action rm ID

### Developing the github workflow

### Getting it
You'll need a copy of go v1.11 or higher. Get binary directly from releases

- Simple build, with latest versions of all dependencies:
`go get inextensodigital/actions`

- Repoducible build, using god mod to get pinned dependencies: 
```shell
go get inextensodigital/actions
cd $GOPATH/src/inextensodigital/actions/client
go mod download
go build
```

### Example for creating a new action on "pull_request" for many repositories

```shell
#!/usr/bin/env bash

action_name="Auto create master → dev PRs"
action_image="inextensodigital/actions/create-pull-request@master"
unified_workflow_name="On pull request"

for project in 'project1.api' 'project2.api' 'project3.api'
do
    git clone "git@github.com:yourorganisation/$project.git" "/tmp/$project"
    cd "/tmp/$project"

    set -e
    set -o pipefail
    github-workflow initialize || echo "Already initialized ✓"
    github-workflow action ls "$action_name" &> /dev/null || github-workflow action create "$action_name" "$action_image" --secret=GITHUB_TOKEN --env BASE=dev --env HEAD=master
    workflow_name=$(github-workflow workflow ls --on="pull_request" | head -n 1) && \
        ( \
            github-workflow workflow add "$workflow_name" --resolve "$action_name" && \
            github-workflow workflow rename "$workflow_name" "$unified_workflow_name" \
        ) \
    || \
        (
            github-workflow workflow ls "$unified_workflow_name" --on="pull_request" &> /dev/null || \
            github-workflow workflow create "$unified_workflow_name" "pull_request" --resolve="$action_name" \
        ) && \
    github-workflow lint

    git checkout -b chore-auto-create-master-dev-prs
    git add .

    if ! git diff-index --quiet HEAD --; then
        git commit -m "chore: $action_name" -m "Thanks to Github Actions"
        git push origin chore-auto-create-master-dev-prs
        hub pull-request -b yourorganisation:master -l enhancement -r reviewer_nickname -m "$action_name"
    fi

    cd /tmp && rm -rf "/tmp/$project"
done
```



### Example of stdin usage 
```shell
cat .github/stdin.workflow|./github-workflow action ls
```

