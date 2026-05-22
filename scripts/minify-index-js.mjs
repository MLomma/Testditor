import { stat, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "node:fs/promises"
import minify from "minify"

const files = []

for await (const file of glob("dist/**/index*.js")) {
  files.push(file)
}

await Promise.all(
  files.map(async (file) => {
    const before = (await stat(file)).size
    const minified = await minify(file)
    const tempFile = `${file}.min`

    await writeFile(tempFile, minified)

    const after = (await stat(tempFile)).size

    if (after < before) {
      await rename(tempFile, file)

      const reduction = before - after
      const percent = ((reduction / before) * 100).toFixed(2)

      console.log(`${path.normalize(file)} reduced from ${before} to ${after} bytes (${percent}% reduction)`)
      return
    }

    await rm(tempFile)
    console.log(`${path.normalize(file)} no reduction achieved, file size unchanged`)
  })
)