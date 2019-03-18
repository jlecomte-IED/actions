action "Docker Login" {
  uses = "inextensodigital/actions/deployment@master"
  secrets = [
    "DOCKER_USERNAME",
    "DOCKER_PASSWORD",
  ]
}

