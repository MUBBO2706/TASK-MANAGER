fetch("http://localhost:3000/api/version-task-state?taskId=57b8fdeb-df41-4cb0-85c8-09e38c1c3489&versionIdBefore=78e80035-0f42-481f-be55-de74493a4d59&api_key=sk_sync_b4k92jdm10")
.then(r=>r.json())
.then(console.log);
