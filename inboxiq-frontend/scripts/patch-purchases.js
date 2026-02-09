const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-purchases",
  "android",
  "build.gradle"
);

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");
  // Remove the hardcoded buildscript block that conflicts with root project AGP
  const patched = content.replace(
    /buildscript\s*\{[\s\S]*?\n\}/,
    "// buildscript removed by patch-purchases.js to avoid AGP version conflict"
  );
  if (patched !== content) {
    fs.writeFileSync(file, patched);
    console.log("Patched react-native-purchases: removed conflicting buildscript");
  }
}
