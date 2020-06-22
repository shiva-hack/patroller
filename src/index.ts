import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import Table from 'cli-table'
import depcheck from 'depcheck'
import inquirer from 'inquirer'
import {sort} from 'json-keys-sort'
import emoji from 'node-emoji'
import path from 'path'
import {promisify} from 'util'
import shelljs from 'shelljs'
import fs from 'fs'
import licenseChecker from 'license-checker'

const checker = promisify(licenseChecker.init)
const rootPath = path.resolve()

interface MInfo extends licenseChecker.ModuleInfo {
  path?: string
}

class Patroller extends Command {
  static description =
    'A CLI tool for removing unused dependencies, sorting the dependencies, locking the dependencies, and keeping a watch on the licenses.'

  static flags = {
    all: flags.boolean({char: 'a', description: 'performs all the actions'}),
    force: flags.boolean({
      char: 'f',
      description: 'forcefully removes unused dependencies, use with --unused',
    }),
    help: flags.help({char: 'h'}),
    license: flags.boolean({
      description:
        'checks the dependencies for difference in license from the root repository',
    }),
    lock: flags.boolean({
      char: 'l',
      description:
        'locks the dependencies in package.json and removes the wildcard ( ^ )',
    }),
    sort: flags.boolean({
      char: 's',
      description: 'sorts the dependencies in package.json',
    }),
    unused: flags.boolean({
      char: 'u',
      description:
        'removes the unused dependencies from node_modules and the package.json',
    }),
    version: flags.version({char: 'v'}),
    yarn: flags.boolean({description: 'uses yarn instead of npm'}),
  }

  async getUnusedDependencies(): Promise<depcheck.Results> {
    return new Promise((resolve, reject) => {
      const options = {}
      try {
        depcheck(rootPath, options, (unused) => {
          resolve({...unused})
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  async checkDependencies() {
    let uninstallDeps = []
    let uninstallDevDeps = []
    const {flags} = this.parse(Patroller)
    const isYarn = flags.yarn || false
    const unused = await this.getUnusedDependencies()
    const {dependencies, devDependencies} = unused
    const issues = [...dependencies, ...devDependencies]

    if (issues.length === 0) {
      this.log(chalk.green(`${emoji.get(':thumbsup:')} no unused dependencies`))
      return
    }

    uninstallDeps = dependencies || []
    uninstallDevDeps = devDependencies || []

    if (!flags.force) {
      this.log(
        chalk.yellow(
          `${emoji.get(':warning:')}  ${issues.length} unused dependencies`
        )
      )

      const questions = []
      if (dependencies.length > 0) {
        questions.push({
          name: 'uninstallDeps',
          message: 'select the unused dependencies you want to remove',
          type: 'checkbox',
          choices: dependencies,
        })
      }

      if (devDependencies.length > 0) {
        questions.push({
          name: 'uninstallDevDeps',
          message: 'select the unused devDependencies you want to remove',
          type: 'checkbox',
          choices: devDependencies,
        })
      }

      const responses: any = await inquirer.prompt(questions)
      uninstallDeps = responses.uninstallDeps || []
      uninstallDevDeps = responses.uninstallDevDeps || []
    }

    if (uninstallDeps.length > 0) {
      shelljs.exec(
        isYarn
          ? `yarn remove ${uninstallDeps.join(' ')}`
          : `npm uninstall --save ${uninstallDeps.join(' ')}`,
        {silent: true}
      )

      this.log(
        chalk.green(
          `${emoji.get(':thumbsup:')} uninstalled unused dependencies`
        )
      )
    }

    if (uninstallDevDeps.length > 0) {
      shelljs.exec(
        isYarn
          ? `yarn remove ${uninstallDevDeps.join(' ')}`
          : `npm uninstall --save-dev ${uninstallDevDeps.join(' ')}`,
        {silent: true}
      )
      this.log(
        chalk.green(
          `${emoji.get(':thumbsup:')} uninstalled unused devDependencies`
        )
      )
    }
  }

  async lockDependencies() {
    const {flags} = this.parse(Patroller)
    const isYarn = flags.yarn || false
    const packageJSON = require(path.join(rootPath, 'package.json'))
    if (packageJSON.dependencies) {
      for (const pkg in packageJSON.dependencies) {
        if (packageJSON.dependencies[pkg]) {
          packageJSON.dependencies[pkg] = packageJSON.dependencies[pkg].replace(
            '^',
            ''
          )
        }
      }
    }

    if (packageJSON.devDependencies) {
      for (const pkg in packageJSON.devDependencies) {
        if (packageJSON.devDependencies[pkg]) {
          packageJSON.devDependencies[pkg] = packageJSON.devDependencies[
            pkg
          ].replace('^', '')
        }
      }
    }

    fs.writeFileSync(
      path.join(rootPath, 'package.json'),
      JSON.stringify(packageJSON, null, 2) + '\n'
    )

    shelljs.exec(isYarn ? 'yarn install' : 'npm install', {silent: true})

    this.log(
      chalk.green(`${emoji.get(':thumbsup:')} locked the dependency versions`)
    )
  }

  async sortPackageJSON() {
    const jsonData = require(path.join(rootPath, 'package.json'))
    const packageJSON = {
      ...jsonData,
      dependencies: jsonData.dependencies
        ? sort(jsonData.dependencies, true)
        : undefined,
      devDependencies: jsonData.devDependencies
        ? sort(jsonData.devDependencies, true)
        : undefined,
    }

    fs.writeFileSync(
      path.join(rootPath, 'package.json'),
      JSON.stringify(packageJSON, null, 2) + '\n'
    )
    this.log(chalk.green(`${emoji.get(':thumbsup:')} package.json sorted`))
  }

  async checkLicenses() {
    let packages: licenseChecker.ModuleInfos
    let rootPackage: MInfo
    try {
      packages = await checker({start: rootPath})
    } catch (error) {
      this.error(
        chalk.red(
          `${emoji.get(
            ':disappointed:'
          )} cannot find package information in this folder`
        )
      )
    }

    if (!packages) return
    const table = new Table({head: ['Package', 'Licenses']})

    for (const pkg in packages) {
      if (pkg) {
        const p = packages[pkg] as MInfo
        if (p.path === rootPath) {
          rootPackage = p
        }
      }
    }

    const diff: MInfo[] = []
    Object.keys(packages).forEach((key) => {
      if (packages[key] === rootPackage) return
      const matches = packages[key].licenses === rootPackage.licenses
      const license = matches ? chalk.dim : chalk.yellow
      table.push([key, license(packages[key].licenses)])
      if (!matches) diff.push(packages[key] as MInfo)
    })

    if (diff.length > 0) {
      this.log(
        chalk.yellow(
          `${emoji.get(':warning:')}  there are some license conflicts`
        )
      )
      this.log(table.toString())
      return
    }

    this.log(chalk.green(`${emoji.get(':thumbsup:')} no license conflicts`))
  }

  async run() {
    const {flags} = this.parse(Patroller)

    try {
      require(path.join(rootPath, 'package.json'))
    } catch (error) {
      this.error(
        chalk.red(
          `${emoji.get(
            ':disappointed:'
          )} cannot find package.json in this folder`
        )
      )
    }

    // 1) sort the package.json
    if (flags.sort || flags.all) {
      await this.sortPackageJSON()
    }

    // 2) lock the package versions and remove wildcards
    if (flags.lock || flags.all) {
      await this.lockDependencies()
    }

    // 3) check the dependencies for unused using depcheck
    if (flags.unused || flags.all) {
      await this.checkDependencies()
    }

    if (flags.license || flags.all) {
      await this.checkLicenses()
    }
  }
}

export = Patroller
