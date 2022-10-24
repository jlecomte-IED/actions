action "deploy" {
  uses = "fulll/actions/deployment@master"
  needs = [
    "with secrets",
    "with env",
  ]
  runs = "bash ./scripts/test.sh"
}

action "with secrets" {
  uses = "fulll/actions/deployment@master"
  needs = [
    "bare",
  ]
  secrets = [
    "SUPER_SECRET",
    "SUPER_PASSWORD",
  ]
}

action "with env" {
  uses = "fulll/actions/deployment@master"
  env = {
    SUPER_ENV = "value"
  }
}

action "bare" {
  uses = "fulll/actions/deployment@master"
}

