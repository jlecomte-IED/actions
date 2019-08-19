# php-cs-fixer

## Basic usage


### Github actions v1 (hcl)

Runs `php-cs-fixer` to lint php files. Running it by default in `dry-run` mode with diff.

```
action "Php cs fixer" {
  uses = "inextensodigital/actions/php-cs-fixer@master"
}
```


### Github actions v2 (yaml)

```yml
on: push
name: test

jobs:
  qa:
    name: QA
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@master

    - name: Php cs fixer
      uses: inextensodigital/actions/php-cs-fixer@master
  ```

## Advanced usage

For example, to effectively fix:


### Github actions v1 (hcl)

```
action "Php cs fixer" {
  uses = "inextensodigital/actions/zip@master"
  run = ["php-cs-fixer", "fix"]
}
```

### Github actions v2 (yaml)


```yml
on: push
name: test

jobs:
  qa:
    name: QA
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@master

    - name: Php cs fixer
      uses: inextensodigital/actions/php-cs-fixer@master
      run: php-cs-fixer fix
```
