# GitHub Review Action

Github action for github membership and teams review.

## Usage

```yml
 - name: Github Review Action
      uses: fulll/actions/javascript/github-review@master
      with:
        organization: 'fulll'  
        ## repo, read:org 
        token: ${{ secrets.TOKEN }}
        ## If you want the output posted on an issue in the repo running the action. 
        ## postToIssue is optional (if not set, the default value is false)
        postToIssue: true
        ## Custom title of output issue. issueTitle is optional
        issueTitle: "Insert issue title here"
```

## Example workflows

### Review on push (good for testing)

```yml
on: push

jobs:

  github_review:
    runs-on: ubuntu-latest
    name: Github Review

    - name: Github Review Action
      uses: fulll/actions/javascript/github-review@master
      with:
        organization: 'fulll'
        token: ${{ secrets.TOKEN }}
        postToIssue: true
        issueTitle: 'Teams review'
```

### Review on a schedule (cron)

```yml
on:
  schedule:   
    # Once a week on Saturday 00:00
    - cron:  '0 0 * * 6'

jobs:

  github_review:
    runs-on: ubuntu-latest
    name: Github Review

    - name: Github Review Action
      uses: fulll/actions/javascript/github-review@master
      with:
        enterprise: 'fulll'
        token: ${{ secrets.TOKEN }}
        issue: true
```

## Local testing

You can test this action locally by using the following command:

```sh
TOKEN=<github_token> ORGANIZATION=<organization name> GITHUB_REPOSITORY=<owner>/<repository> node src/index.js
```
