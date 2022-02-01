# GitHub Review Action

Github action for github membership and teams review.

## Usage

### Members review
```yml
 - name: Github Review Action
      uses: fulll/actions/javascript/github-review@master
      with:
        organization: 'fulll' 
        # Review type 
        review: 'members'
        ## repo, read:org 
        token: ${{ secrets.TOKEN }}
        ## If you want the output posted on an issue in the repo running the action. 
        ## postToIssue is optional (if not set, the default value is false)
        postToIssue: true
        ## Custom title of output issue. issueTitle is optional
        issueTitle: 'Insert issue title here'
        # Add labels to issue. Labels must be sperated by commas ","
        labels: 'label1,label2,...'
        #Assign issue to members. Assignee
        assignees: 'memberLogin1,memberLogin1,...'
```

### Indicators ISMS
```yml
 - name: Github Review Action
      uses: fulll/actions/javascript/github-review@master
      with:
        organization: 'Insert organization name' 
        # Review type 
        review: 'indicators'
        ## repo, read:org 
        token: ${{ secrets.TOKEN }}
        ## If you want the output posted on an issue in the repo running the action. 
        ## postToIssue is optional (if not set, the default value is false)
        postToIssue: true
        ## Custom title of output issue. issueTitle is optional
        issueTitle: 'Insert issue title here'
        # Add labels to issue. Labels must be sperated by commas ","
        labels: 'label1,label2,...'
        #Assign issue to members. Assignee
        assignees: 'memberLogin1,memberLogin1,...'
```
Note: action check for previous month indicators.

## Example workflows

### Members Review on push (good for testing)

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

### Members Review on a schedule (cron)

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
        organization: 'fulll'
        token: ${{ secrets.TOKEN }}
        issue: true
```
### Indicators Review on a schedule (cron)

## Local testing

You can test this action locally by using the following command:

```sh
TOKEN=<github_token> ORGANIZATION=<organization name> GITHUB_REPOSITORY=<owner>/<repository> node src/index.js
```
## About Token

To run, the github action need to have access to an admin token.
It's not recommended to setup an App github with admin access.