const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const indexHtmlPath = path.join(distDir, "index.html");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
const cssMatch = indexHtml.match(/LiveEditor\.[A-Za-z0-9]+\.css/);

if (!cssMatch) {
  throw new Error("Could not find current LiveEditor CSS bundle in dist/index.html");
}

const cssPath = path.join(distDir, cssMatch[0]);
const css = fs.readFileSync(cssPath, "utf8");

const oldSnippet = ".editor-category-toolbar{align-items:flex-end;gap:.85rem;padding:.45rem .45rem 0;overflow-x:auto}.editor-category-group{gap:.85rem;padding:0}.editor-category-group .btn{border-width:2px;border-radius:1rem 1rem 0 0;min-width:auto;min-height:2.25rem;padding-inline:.95rem;font-size:.95rem;font-weight:700;transition:transform .12s,box-shadow .12s,opacity .12s;position:relative;top:0}.editor-category-group .btn.btn-outline-secondary{opacity:.78}.editor-category-group .btn.btn-outline-secondary:hover{opacity:1;transform:translateY(-1px)}.editor-category-group .btn.btn-primary{color:#0f2c2c;z-index:3;background-color:#38cccc;border-color:#38cccc;border-bottom-right-radius:0;border-bottom-left-radius:0;margin-bottom:-2px;top:2px;box-shadow:0 -.2rem .65rem #38cccc59}.editor-category-group .btn.btn-primary:before,.editor-category-group .btn.btn-primary:after{content:\"\";background-color:var(--bs-body-bg);pointer-events:none;width:1rem;height:1rem;position:absolute;bottom:-2px}.editor-category-group .btn.btn-primary:before{border-bottom:2px solid #38cccc;border-right:2px solid #38cccc;border-bottom-right-radius:1rem;left:-1rem}.editor-category-group .btn.btn-primary:after{border-bottom:2px solid #38cccc;border-left:2px solid #38cccc;border-bottom-left-radius:1rem;right:-1rem}.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary{color:#0f2c2c;background-color:#38cccc;border-color:#38cccc;box-shadow:0 -.2rem .8rem #38cccc6b}.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary:before,.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary:after{background-color:#323232}.editor-main-toolbar{z-index:2;background-color:var(--bs-body-bg);border:2px solid #38cccc;border-radius:1.2rem 1.2rem 0 0;margin-top:-2px;padding:.25rem .35rem .15rem;position:relative;box-shadow:0 .35rem 1rem #38cccc1f}.editor-toolbar.navbar-dark .editor-main-toolbar{background-color:#323232;border-color:#38cccc}";

const newSnippet = ".editor-category-toolbar{align-items:flex-end;gap:1rem;padding:.55rem .7rem 0;overflow-x:auto}.editor-category-group{gap:1rem;padding:0}.editor-category-group .btn{border-width:2px;border-top-left-radius:1.15rem;border-top-right-radius:1.15rem;border-bottom-left-radius:0;border-bottom-right-radius:0;min-width:auto;min-height:2.25rem;padding-inline:1.1rem;font-size:.95rem;font-weight:700;transition:transform .12s,box-shadow .12s,opacity .12s;position:relative;top:0}.editor-category-group .btn.btn-outline-secondary{opacity:.78}.editor-category-group .btn.btn-outline-secondary:hover{opacity:1;transform:translateY(-1px)}.editor-category-group .btn.btn-primary{color:#0f2c2c;z-index:3;background-color:#38cccc;border-color:#38cccc;border-bottom-left-radius:0;border-bottom-right-radius:0;margin-bottom:-4px;top:4px;box-shadow:0 -.2rem .65rem #38cccc59}.editor-category-group .btn.btn-primary:before,.editor-category-group .btn.btn-primary:after{content:\"\";pointer-events:none;background-color:var(--bs-body-bg);width:1.25rem;height:1.25rem;position:absolute;bottom:-4px}.editor-category-group .btn.btn-primary:before{left:-1.25rem;border-right:2px solid #38cccc;border-bottom:2px solid #38cccc;border-bottom-right-radius:1.25rem}.editor-category-group .btn.btn-primary:after{right:-1.25rem;border-left:2px solid #38cccc;border-bottom:2px solid #38cccc;border-bottom-left-radius:1.25rem}.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary{color:#0f2c2c;background-color:#38cccc;border-color:#38cccc;box-shadow:0 -.2rem .8rem #38cccc6b}.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary:before,.editor-toolbar.navbar-dark .editor-category-group .btn.btn-primary:after{background-color:#323232}.editor-main-toolbar{z-index:2;background-color:var(--bs-body-bg);border:2px solid #38cccc;border-radius:1.2rem 1.2rem 0 0;margin-top:-4px;padding:.25rem .35rem .15rem;position:relative;box-shadow:0 .35rem 1rem #38cccc1f}.editor-toolbar.navbar-dark .editor-main-toolbar{background-color:#323232;border-color:#38cccc}";

if (!css.includes(oldSnippet)) {
  throw new Error(`Expected toolbar CSS snippet not found in ${cssPath}`);
}

fs.writeFileSync(cssPath, css.replace(oldSnippet, newSnippet));
console.log(`Patched ${path.basename(cssPath)}`);