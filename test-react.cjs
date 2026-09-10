const fs = require('fs');
let content = fs.readFileSync('src/components/version-control/VersionDetailView.tsx', 'utf8');
content = content.replace(
  'modifiedTaskDiffs.push({',
  'console.log("diff task", newTask.id, "oldCodeLen:", oldCode?.length, "newCodeLen:", newCode?.length, "fetched:", !!fetchedTaskStates[newTask.id]);\n      modifiedTaskDiffs.push({'
);
fs.writeFileSync('src/components/version-control/VersionDetailView.tsx', content);
