fetch("http://localhost:3000/api/version-backups?api_key=sk_sync_b4k92jdm10")
.then(r=>r.json())
.then(backups => {
  const ids = backups.slice(0, 3).map(b => b.id).join(',');
  return fetch(`http://localhost:3000/api/version-backup-detail?ids=${ids}&api_key=sk_sync_b4k92jdm10`);
})
.then(r=>r.json())
.then(details => {
  console.log(Object.keys(details).map(k => ({
    id: k,
    tasksModified: details[k].stateAfter?.tasks?.filter(t => t.wasCodeModified).map(t => t.id)
  })));
});
