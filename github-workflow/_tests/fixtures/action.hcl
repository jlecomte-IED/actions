action "deploy" {
  uses = "inextensodigital/actions/deployment@master"
  needs = [
    "with secrets",
    "with env",
  ]
}

action "with secrets" {
  uses = "inextensodigital/actions/deployment@master"
  needs = [
    "bare",
  ]
  secrets = [
    "SUPER_SECRET",
    "SUPER_PASSWORD",
  ]
}

action "with env" {
  uses = "inextensodigital/actions/deployment@master"
  env = {
    SUPER_ENV = "value"
  }
}

action "bare" {
  uses = "inextensodigital/actions/deployment@master"
}

