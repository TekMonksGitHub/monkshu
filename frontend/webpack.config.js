const fs=require("fs");
const path = require("path");
const glob = require("glob");

const mainFile = `./index.mjs`;

const $$js = fs.readFileSync('./framework/js/$$.js', "utf8");
fs.writeFileSync(mainFile, $$js+"\n\n");
const allFiles = [...glob.sync('./framework/**/*.mjs', {follow: true}).map(f=>"/"+f.toString()), 
  ...glob.sync('./apps/**/*.mjs', {follow: true}).map(f=>"/"+f.toString())];
for (const file of allFiles) fs.appendFileSync(mainFile, `import "${file}";\n`);

module.exports = {
    mode: "development",
    entry: allFiles,
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "webpack"),
    },
};
