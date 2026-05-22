import { rm } from "node:fs/promises"
import { glob } from "node:fs/promises"

const patterns = [
  "dist/a*",
  "dist/bat*",
  "dist/bicep*",
  "dist/c*.js",
  "dist/d*",
  "dist/ecl*",
  "dist/elixir*",
  "dist/f*",
  "dist/g*",
  "dist/h*",
  "dist/ini*",
  "dist/j*",
  "dist/k*",
  "dist/less*",
  "dist/liquid*",
  "dist/lua*",
  "dist/lexon*",
  "dist/m3*",
  "dist/mips*",
  "dist/msdax*",
  "dist/mysql*",
  "dist/obj*",
  "dist/p*",
  "dist/q*",
  "dist/r*",
  "dist/s*.*.js",
  "dist/t*",
  "dist/v*",
  "dist/w*",
  "dist/x*",
  "dist/y*"
]

const targets = new Set()

for (const pattern of patterns) {
  for await (const file of glob(pattern)) {
    targets.add(file)
  }
}

await Promise.all([...targets].map((target) => rm(target, { force: true, recursive: true })))