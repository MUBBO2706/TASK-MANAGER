fetch("http://localhost:3000/api/version-backup-detail?ids=78e80035-0f42-481f-be55-de74493a4d59&api_key=sk_sync_b4k92jdm10")
.then(r=>r.json())
.then(j => {
  const b = j["78e80035-0f42-481f-be55-de74493a4d59"];
  console.log("Has stateBefore:", !!b.stateBefore);
  console.log("Tasks in stateBefore:", b.stateBefore?.tasks?.length);
  const t = b.stateBefore?.tasks?.find(t => t.id === "57b8fdeb-df41-4cb0-85c8-09e38c1c3489");
  console.log("Found task:", !!t);
});
