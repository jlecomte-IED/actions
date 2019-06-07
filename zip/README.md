# make

## Basic usage

Runs `zip` to package artifacts for example.

```
action "Package" {
  uses = "inextensodigital/actions/zip@master"
  args = "package.zip somedir somefile"
}
```

## Advanced usage

If files are stored in a given path and you want to strip this path in your zip package.

```
action "Package" {
  uses = "inextensodigital/actions/zip@master"
  args = ["-c", "cd somedir && zip package.zip *]"
  run = "sh"
}
```
