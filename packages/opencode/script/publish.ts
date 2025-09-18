#!/usr/bin/env bun
const dir = new URL("..", import.meta.url).pathname
process.chdir(dir)
import { $ } from "bun"

import pkg from "../package.json"

const dry = process.env["OPENCODE_DRY"] === "true"
const version = process.env["OPENCODE_VERSION"]!
const snapshot = process.env["OPENCODE_SNAPSHOT"] === "true"
const npmTag = snapshot ? "snapshot" : "latest"

console.log(`publishing ${version}`)

const { binaries } = await import("./build.ts")
{
  const name = `${pkg.name}-${process.platform}-${process.arch}`
  console.log(`smoke test: running dist/${name}/bin/opencode --version`)
  await $`./dist/${name}/bin/opencode --version`
}

await $`mkdir -p ./dist/${pkg.name}`
await $`cp -r ./bin ./dist/${pkg.name}/bin`
await $`cp ./script/preinstall.mjs ./dist/${pkg.name}/preinstall.mjs`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name + "-ai",
      bin: {
        [pkg.name]: `./bin/${pkg.name}`,
      },
      scripts: {
        preinstall: "node ./preinstall.mjs",
        postinstall: "node ./postinstall.mjs",
      },
      version,
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)
if (!dry) {
  for (const [name] of Object.entries(binaries)) {
    await $`cd dist/${name} && chmod 777 -R . && bun publish --access public --tag ${npmTag}`
  }
  await $`cd ./dist/${pkg.name} && bun publish --access public --tag ${npmTag}`
}

if (!snapshot) {
  for (const key of Object.keys(binaries)) {
    await $`cd dist/${key}/bin && zip -r ../../${key}.zip *`
  }
}
