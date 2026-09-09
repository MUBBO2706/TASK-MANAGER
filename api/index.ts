import express from "express";
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(express.json({ limit: "50mb" }));

const sanitizeUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
};

let devKeys: any = {};
try {
  // @ts-ignore
  devKeys = await import('../src/lib/dev-keys.ts');
} catch (e) {
  // Ignore
}

const supabaseUrl = sanitizeUrl(process.env.VITE_SUPABASE_URL || devKeys.SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || devKeys.SUPABASE_SERVICE_KEY || 'placeholder-key';

let supabase: any;
try {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} catch (error) {
  console.warn("Supabase client failed to initialize:", error);
}

let memTasks: any[] = [];

// Middleware to check API key
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedKey = process.env.API_KEY || devKeys.API_KEY || "sk_sync_b4k92jdm10";
  
  if (apiKey !== expectedKey) {
    res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    return;
  }
  next();
};

// Helper to fetch tasks from Supabase
async function fetchTasksFromDB(projectId?: string) {
  try {
    let query = supabase.from('tasks').select('*');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    let { data, error } = await query
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
      console.warn("order_index column missing, falling back to created_at");
      let fallbackQuery = supabase.from('tasks').select('*');
      if (projectId) {
        fallbackQuery = fallbackQuery.eq('project_id', projectId);
      }
      const fallback = await fallbackQuery.order('created_at', { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    
    return data.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      sql: t.sql,
      functionCode: t.function_code,
      description: t.description,
      edgeFiles: t.edge_files,
      edgeSecrets: t.edge_secrets,
      status: t.status,
      folderId: t.folder_id,
      projectId: t.project_id,
      productionTaskId: t.production_task_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      orderIndex: t.order_index
    })) || [];
  } catch (error) {
    console.error("Error reading from Supabase:", error);
  }
  return memTasks;
}

// Initial fetch
fetchTasksFromDB().then((data) => {
  memTasks = data;
});

// Route handlers
app.get("/api/projects", checkApiKey, async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('id, name, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to list projects:", errDetails);
    res.status(500).json({ error: "Failed to list projects", details: errDetails });
  }
});

app.post("/api/ai/create-staging", checkApiKey, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const { data: projectData, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (projectError) throw projectError;
    if (!projectData) {
      return res.status(404).json({ error: "Original project not found" });
    }

    const newProjectId = crypto.randomUUID();
    const newProjectName = `${projectData.name} [STAGING]`;
    const newProject = { id: newProjectId, name: newProjectName, created_at: Date.now() };

    const { error: insertProjectError } = await supabase.from('projects').insert(newProject);
    if (insertProjectError) throw insertProjectError;

    const { data: sourceTasks, error: tasksError } = await supabase.from('tasks').select('*').eq('project_id', projectData.id);
    if (tasksError) throw tasksError;

    if (sourceTasks && sourceTasks.length > 0) {
      const duplicatedTasksParams = sourceTasks.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        project_id: newProjectId,
        production_task_id: t.id,
        created_at: Date.now(),
        updated_at: Date.now()
      }));

      const { error: insertTasksError } = await supabase.from('tasks').insert(duplicatedTasksParams);
      if (insertTasksError) throw insertTasksError;
    }

    res.json({ id: newProject.id, name: newProject.name });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to create staging project:", errDetails);
    res.status(500).json({ error: "Failed to create staging project", details: errDetails });
  }
});

app.post("/api/ai/merge-staging", checkApiKey, async (req, res) => {
  try {
    const { stagingProjectId, prodProjectId, merges, isAll } = req.body;
    if (!stagingProjectId || !prodProjectId) {
      return res.status(400).json({ error: "stagingProjectId and prodProjectId are required" });
    }

    const { data: stagingTasks, error: stagingError } = await supabase.from('tasks').select('*').eq('project_id', stagingProjectId);
    if (stagingError) throw stagingError;

    if (merges && Array.isArray(merges)) {
      const dbPromises = merges.map(async (m: any) => {
        if (m.action === 'upsert' && m.stagingTaskId) {
          const task = stagingTasks?.find(t => t.id === m.stagingTaskId);
          if (!task) return null;
          const payload = {
            title: task.title,
            type: task.type,
            sql: task.sql,
            function_code: task.function_code,
            description: task.description,
            edge_files: task.edge_files,
            edge_secrets: task.edge_secrets,
            status: task.status,
            folder_id: task.folder_id,
            project_id: prodProjectId,
            order_index: task.order_index,
            updated_at: Date.now()
          };
          if (task.production_task_id) {
            return supabase.from('tasks').update(payload).eq('id', task.production_task_id);
          } else {
            // After inserting to prod, we need to link the staging task so next diff doesn't think it's added again!
            const newProdId = crypto.randomUUID();
            await supabase.from('tasks').insert({
              ...payload,
              id: newProdId,
              created_at: Date.now()
            });
            // Update staging task to point to the new production task
            return supabase.from('tasks').update({ production_task_id: newProdId }).eq('id', task.id);
          }
        }
        if (m.action === 'delete' && m.prodTaskId) {
           return supabase.from('tasks').delete().eq('id', m.prodTaskId);
        }
      });
      await Promise.all(dbPromises.filter(Boolean));
    } else {
      if (stagingTasks && stagingTasks.length > 0) {
        const upsertPromises = stagingTasks.map(async (task) => {
          const payload = {
            title: task.title,
            type: task.type,
            sql: task.sql,
            function_code: task.function_code,
            description: task.description,
            edge_files: task.edge_files,
            edge_secrets: task.edge_secrets,
            status: task.status,
            folder_id: task.folder_id,
            project_id: prodProjectId,
            order_index: task.order_index,
            updated_at: Date.now()
          };

          if (task.production_task_id) {
            return supabase.from('tasks').update(payload).eq('id', task.production_task_id);
          } else {
            return supabase.from('tasks').insert({
              ...payload,
              id: crypto.randomUUID(),
              created_at: Date.now()
            });
          }
        });

        await Promise.all(upsertPromises);
      }
    }

    if (isAll || !merges) {
      // Auto-delete the staging project and its tasks to clean up
      const { error: deleteTasksError } = await supabase.from('tasks').delete().eq('project_id', stagingProjectId);
      if (deleteTasksError) throw deleteTasksError;

      const { error: deleteProjectError } = await supabase.from('projects').delete().eq('id', stagingProjectId);
      if (deleteProjectError) throw deleteProjectError;
    }

    memTasks = await fetchTasksFromDB();

    res.json({ success: true, message: "Merge completed." });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to merge to production:", errDetails);
    res.status(500).json({ error: "Failed to merge to production", details: errDetails });
  }
});

app.post("/api/ai/reject-staging", checkApiKey, async (req, res) => {
  try {
    const { stagingProjectId, prodProjectId, rejects, isAll } = req.body;
    if (!stagingProjectId || !prodProjectId) {
      return res.status(400).json({ error: "stagingProjectId and prodProjectId are required" });
    }

    if (rejects && Array.isArray(rejects)) {
      const { data: prodTasks, error: prodError } = await supabase.from('tasks').select('*').eq('project_id', prodProjectId);
      if (prodError) throw prodError;

      const dbPromises = rejects.map(async (r: any) => {
        if (r.action === 'upsert' && r.stagingTaskId) {
          // This task was either modified or added in staging. We reject the change.
          const prodTask = prodTasks?.find(t => t.id === r.prodTaskId);
          if (prodTask) {
            // It was a modification. Revert staging task to prod state.
            const payload = {
              title: prodTask.title,
              type: prodTask.type,
              sql: prodTask.sql,
              function_code: prodTask.function_code,
              description: prodTask.description,
              edge_files: prodTask.edge_files,
              edge_secrets: prodTask.edge_secrets,
              status: prodTask.status,
              folder_id: prodTask.folder_id,
              order_index: prodTask.order_index,
              updated_at: Date.now()
            };
            return supabase.from('tasks').update(payload).eq('id', r.stagingTaskId);
          } else {
            // It was added in staging. Rejecting means we delete it from staging.
            return supabase.from('tasks').delete().eq('id', r.stagingTaskId);
          }
        }
        if (r.action === 'delete' && r.prodTaskId) {
          // This task was deleted in staging. Rejecting means we restore it in staging.
          const prodTask = prodTasks?.find(t => t.id === r.prodTaskId);
          if (prodTask) {
             const payload = {
                title: prodTask.title,
                type: prodTask.type,
                sql: prodTask.sql,
                function_code: prodTask.function_code,
                description: prodTask.description,
                edge_files: prodTask.edge_files,
                edge_secrets: prodTask.edge_secrets,
                status: prodTask.status,
                folder_id: prodTask.folder_id,
                project_id: stagingProjectId,
                production_task_id: prodTask.id,
                order_index: prodTask.order_index,
                created_at: Date.now(),
                updated_at: Date.now()
             };
             return supabase.from('tasks').insert({ ...payload, id: crypto.randomUUID() });
          }
        }
      });
      await Promise.all(dbPromises.filter(Boolean));
    }

    if (isAll || !rejects) {
      // Rejecting everything means we delete the staging project
      const { error: deleteTasksError } = await supabase.from('tasks').delete().eq('project_id', stagingProjectId);
      if (deleteTasksError) throw deleteTasksError;

      const { error: deleteProjectError } = await supabase.from('projects').delete().eq('id', stagingProjectId);
      if (deleteProjectError) throw deleteProjectError;
    }

    memTasks = await fetchTasksFromDB();

    res.json({ success: true, message: "Reject completed." });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to reject staging:", errDetails);
    res.status(500).json({ error: "Failed to reject staging", details: errDetails });
  }
});

app.get("/api/content", checkApiKey, async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const data = await fetchTasksFromDB();
  memTasks = data;
  res.json(data);
});

// Realtime listeners are now handled client-side via Supabase Channels
// But we keep the endpoint for legacy reasons or basic polling
app.get("/api/listen", checkApiKey, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendData = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Initial send
  sendData(memTasks);

  // Note: We don't implement a long-lived watch here because clients 
  // should use Supabase Realtime directly. This is a fallback.
  const interval = setInterval(async () => {
    const data = await fetchTasksFromDB();
    if (JSON.stringify(data) !== JSON.stringify(memTasks)) {
      memTasks = data;
      sendData(data);
    }
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

app.get("/export.json", checkApiKey, async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const data = await fetchTasksFromDB(projectId);
  memTasks = data;
  const sortedTasks = [...data].sort((a: any, b: any) => {
    if (a.orderIndex !== undefined && a.orderIndex !== null && b.orderIndex !== undefined && b.orderIndex !== null) {
      return a.orderIndex - b.orderIndex;
    }
    if (a.orderIndex !== undefined && a.orderIndex !== null) return -1;
    if (b.orderIndex !== undefined && b.orderIndex !== null) return 1;
    return b.createdAt - a.createdAt;
  });
  
  const structuredExport = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    metadata: {
      totalTasks: sortedTasks.length,
      sqlTasksCount: sortedTasks.filter(t => t.type === 'sql' || !t.type).length,
      edgeFunctionsCount: sortedTasks.filter(t => t.type === 'edge_function').length,
    },
    sql_queries: sortedTasks
      .filter(t => t.type === 'sql' || !t.type)
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        sql: t.sql,
        createdAt: t.createdAt
      })),
    edge_functions: sortedTasks
      .filter(t => t.type === 'edge_function')
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        files: t.edgeFiles || [],
        secrets: t.edgeSecrets || [],
        createdAt: t.createdAt
      })),
    _raw_tasks: sortedTasks
  };
  
  res.json(structuredExport);
});

app.post("/api/ai/write", checkApiKey, async (req, res) => {
  try {
    const { projectId, title, type, sql, functionCode, description, edgeFiles, edgeSecrets } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const { data: projData } = await supabase.from('projects').select('name').eq('id', projectId).single();
    if (!projData) return res.status(404).json({ error: "Project not found" });

    let targetProjectId = projectId;
    let autoStaged = false;
    let newProjectName = "";

    if (!projData.name.endsWith('[STAGING]')) {
        // Auto-create staging project to prevent direct prod changes!
        targetProjectId = crypto.randomUUID();
        newProjectName = `${projData.name} [STAGING]`;
        await supabase.from('projects').insert({ id: targetProjectId, name: newProjectName, created_at: Date.now() });

        const { data: sourceTasks } = await supabase.from('tasks').select('*').eq('project_id', projectId);
        if (sourceTasks && sourceTasks.length > 0) {
            const duplicated = sourceTasks.map(t => ({
                ...t,
                id: crypto.randomUUID(),
                project_id: targetProjectId,
                production_task_id: t.id,
                created_at: Date.now(),
                updated_at: Date.now()
            }));
            await supabase.from('tasks').insert(duplicated);
        }
        autoStaged = true;
    }

    const newTask = {
      id: crypto.randomUUID(),
      title: title || 'AI Generated Task',
      type: type || 'sql',
      sql: sql || '',
      function_code: functionCode || '',
      description: description || 'Generated by AI',
      edge_files: edgeFiles || (type === 'edge_function' ? [{ id: crypto.randomUUID(), name: 'index.ts', code: '' }] : []),
      edge_secrets: edgeSecrets || [],
      status: 'pending',
      folder_id: null,
      project_id: targetProjectId, // Use the target project ID!
      created_at: Date.now(),
      updated_at: Date.now(),
      order_index: Date.now()
    };

    const { error } = await supabase.from('tasks').insert(newTask);

    if (error) throw error;

    if (autoStaged) {
      return res.json({ 
        success: true, 
        task: newTask,
        message: "Acknowledged: You attempted to write to a Production project. The app automatically created a Staging project for you to make changes safely.",
        stagingProject: {
          id: targetProjectId,
          name: newProjectName
        }
      });
    }

    res.json({ success: true, task: newTask });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to write task via AI API:", errDetails);
    res.status(500).json({ error: "Failed to write task", details: errDetails });
  }
});

app.put("/api/ai/write/:taskId", checkApiKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, type, sql, functionCode, description, edgeFiles, edgeSecrets } = req.body;

    const { data: existingTask } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
    if (!existingTask) return res.status(404).json({ error: "Task not found" });

    const { data: projData } = await supabase.from('projects').select('name').eq('id', existingTask.project_id).single();
    if (!projData) return res.status(404).json({ error: "Project not found" });

    let targetTaskId = taskId;
    let autoStaged = false;
    let newProjectName = "";
    let targetProjectId = existingTask.project_id;

    if (!projData.name.endsWith('[STAGING]')) {
        targetProjectId = crypto.randomUUID();
        newProjectName = `${projData.name} [STAGING]`;
        await supabase.from('projects').insert({ id: targetProjectId, name: newProjectName, created_at: Date.now() });

        const { data: sourceTasks } = await supabase.from('tasks').select('*').eq('project_id', existingTask.project_id);
        if (sourceTasks && sourceTasks.length > 0) {
            const duplicated = sourceTasks.map((t: any) => {
                const newId = crypto.randomUUID();
                if (t.id === taskId) {
                   targetTaskId = newId;
                }
                return {
                    ...t,
                    id: newId,
                    project_id: targetProjectId,
                    production_task_id: t.id,
                    created_at: Date.now(),
                    updated_at: Date.now()
                };
            });
            await supabase.from('tasks').insert(duplicated);
        }
        autoStaged = true;
    }

    const taskUpdates: any = { updated_at: Date.now() };
    if (title !== undefined) taskUpdates.title = title;
    if (type !== undefined) taskUpdates.type = type;
    if (sql !== undefined) taskUpdates.sql = sql;
    if (functionCode !== undefined) taskUpdates.function_code = functionCode;
    if (description !== undefined) taskUpdates.description = description;
    if (edgeFiles !== undefined) taskUpdates.edge_files = edgeFiles;
    if (edgeSecrets !== undefined) taskUpdates.edge_secrets = edgeSecrets;

    const { error } = await supabase.from('tasks').update(taskUpdates).eq('id', targetTaskId);

    if (error) throw error;

    if (autoStaged) {
      return res.json({ 
        success: true, 
        message: "Acknowledged: You attempted to modify a Production project. The app automatically created a Staging project for you to make changes safely.",
        stagingProject: {
          id: targetProjectId,
          name: newProjectName
        },
        newTaskId: targetTaskId
      });
    }

    res.json({ success: true });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to update task via AI API:", errDetails);
    res.status(500).json({ error: "Failed to update task", details: errDetails });
  }
});

// Version backups endpoint
app.get("/api/version-backups", checkApiKey, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('version_backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error && error.code !== '42P01') throw error;
    
    const mapped = (data || []).map((b: any) => ({
      id: b.id,
      timestamp: b.created_at,
      action: b.action,
      description: b.description,
      isUndone: b.is_undone,
      prodProjectId: b.prod_project_id,
      stagingProjectId: b.staging_project_id,
      stateBefore: b.state_before,
      stateAfter: b.state_after
    }));
    
    res.json(mapped);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch version backups:", errDetails);
    res.status(500).json({ error: "Failed to fetch version backups", details: errDetails });
  }
});

// Sync endpoint (optional, since client can now talk to Supabase directly)
app.post("/api/sync", checkApiKey, async (req, res) => {
  try {
    const partialTasks = req.body;
    
    // Merge partial updates into memTasks for rapid update
    if (Array.isArray(partialTasks)) {
      partialTasks.forEach((pt: any) => {
        const index = memTasks.findIndex((mt: any) => mt.id === pt.id);
        if (index !== -1) {
            memTasks[index] = { ...memTasks[index], ...pt };
        } else if (pt.id) {
            memTasks.push(pt);
        }
      });
    }

    // Fire off a background refresh to ensure consistency
    fetchTasksFromDB().then(data => { memTasks = data; }).catch(console.error);
    
    res.json({ success: true });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to sync data to memory:", errDetails);
    res.status(500).json({ error: "Failed to sync data", details: errDetails });
  }
});

export default app;
