# php-cs-fixer

## Basic usage

Runs `php-cs-fixer` to lint php files. Running it by default in `dry-run` mode with diff.

```
action "Package" {
  uses = "inextensodigital/actions/php-cs-fixer@master"
}
```

## Advanced usage

For example, to effectively fix:

```
action "Package" {
  uses = "inextensodigital/actions/zip@master"
  run = ["php-cs-fixer", "fix"]
}
```
