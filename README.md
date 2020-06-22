Patroller
=========
[![Version](https://img.shields.io/npm/v/patroller.svg)](https://npmjs.org/package/patroller)
[![Downloads/week](https://img.shields.io/npm/dw/patroller.svg)](https://npmjs.org/package/patroller)
[![License](https://img.shields.io/npm/l/patroller.svg)](https://github.com/shiva-hack/patroller/blob/master/package.json)

A CLI tool for removing unused dependencies, sorting the dependencies, locking the dependencies, and keeping a watch on the licenses.

<!-- toc -->
- [Patroller](#patroller)
- [Usage](#usage)
- [Options](#options)
- [Scripts](#scripts)
- [Husky Hooks](#husky-hooks)
<!-- tocstop -->

# Usage
<!-- usage -->
```sh-session
$ npm install -g patroller

$ patroller OPTION

$ patroller (-v|--version)
patroller/1.0.0 darwin-x64 node-v12.16.3

$ patroller --help [OPTION]
USAGE
  $ patroller OPTION
...
```
<!-- usagestop -->

# Options
<!-- options -->
- `-h | --help` : shows the CLI help
- `-v | --version` : shows the CLI version
- `-s | --sort` : sorts the dependencies in package.json
- `-u | --unused` : removes the unused dependencies from node_modules and the package.json
- `-l | --lock` : locks the dependencies in package.json and removes the wildcard ( ^ )
- `--license` : checks the dependencies for difference in license from the root repository
- `-a | --all` : performs all the actions above (except help and version)
- `--yarn` : uses yarn instead of npm
- `-f | --force` : forcefully removes unused dependencies
<!-- optionsstop -->

# Scripts
<!-- scripts -->
Use it in the `package.json` for the CI CD to keep your dependencies clean.

```json
{
  ...
  "scripts": {
    "patroller": "patroller --all --force"
  }
}
```
<!-- scriptsstop -->

# Husky Hooks
<!-- husky -->
Install husky
```sh-session
$ npm install husky --save-dev
```

Update the `package.json`
```json
{
  "scripts": {
    "patroller": "patroller --all --force"
  },
  "husky": {
    "hooks": {
      "pre-commit" : "npm patroller"
    }
  }
}
```
<!-- huskystop -->