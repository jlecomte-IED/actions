# make

## Usage

Runs `zip` to package artifacts for example.

```
action "Package" {
  uses = "inextensodigital/actions/zip@master"
  args = "package.zip somedir somefile"
}
```
