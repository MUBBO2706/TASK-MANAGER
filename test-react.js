const fs = require('fs');
let content = fs.readFileSync('src/components/version-control/VersionDetailView.tsx', 'utf8');
content = content.replace(
  'modifiedTaskDiffs.push({',
  'console.log("diff", newTask.id, !!oldCode, !!newCode, oldCode.length, newCode.length, fetchedTaskStates[newTask.id] ? "fetched" : "not");\n      modifiedTaskDiffs.push({'
);
fs.writeFileSync('src/components/version-control/VersionDetailView.tsx', content);
