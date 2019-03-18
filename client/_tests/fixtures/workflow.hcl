workflow "on pull request merge, delete the branch" {
  on = "pull_request"
  resolves = [
    "branch cleanup"
  ]
}

