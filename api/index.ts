import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';
import { diffLines } from 'diff';

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
let memApiLogs: any[] = [];

// Interceptor middleware to capture and log external API requests and responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isApiRoute = req.url.startsWith('/api') && !req.url.startsWith('/api/logs');
  const isExportRoute = req.url.startsWith('/export.json');

  if (!isApiRoute && !isExportRoute) {
    return next();
  }

  // Filter out internal in-app requests:
  // ONLY external server/client calls (e.g. cURL, Python scripts, Postman, AI Agents, or calls with x-api-key / Authorization) are logged.
  let requestBodyCopy: any = null;
  if (req.body && typeof req.body === 'object') {
    try {
      requestBodyCopy = JSON.parse(JSON.stringify(req.body));
    } catch (_) {
      requestBodyCopy = req.body;
    }
  }

  const hasApiKey = Boolean(
    req.headers['x-api-key'] || 
    req.query?.api_key || 
    req.headers['authorization'] ||
    (requestBodyCopy && requestBodyCopy.apiKey) ||
    (requestBodyCopy && requestBodyCopy.api_key)
  );

  const isInAppHeader = req.headers['x-in-app'] === 'true' || req.headers['x-client-app'] === 'react-task-master';
  const secFetchSite = req.headers['sec-fetch-site'];
  const userAgent = ((req.headers['user-agent'] as string) || '').toLowerCase();
  
  const isExternalToolUserAgent = 
    userAgent.includes('curl') || 
    userAgent.includes('postman') || 
    userAgent.includes('insomnia') || 
    userAgent.includes('python') || 
    userAgent.includes('node-fetch') || 
    userAgent.includes('axios') || 
    userAgent.includes('http-client') || 
    userAgent.includes('got') ||
    userAgent.includes('agent') ||
    userAgent.includes('rest-client');

  // If it comes from the app itself via browser, it will have sec-fetch-site = same-origin
  const isBrowserInternal = secFetchSite === 'same-origin';

  // If it clearly has an in-app header OR is a browser internal fetch, it's internal.
  if (isInAppHeader || isBrowserInternal) {
    return next();
  }

  // A request is considered EXTERNAL if it has an API key OR an external tool user agent.
  const isExternal = hasApiKey || isExternalToolUserAgent;

  if (!isExternal) {
    return next();
  }

  const startTime = Date.now();
  const logId = crypto.randomUUID();
  
  const reqMethod = req.method;
  const reqEndpoint = req.originalUrl || req.url;
  const reqQuery = req.query || {};
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const rawUserAgent = (req.headers['user-agent'] as string) || 'Unknown External Client';

  // Make safe copy of request body
  let reqBodyCopy: any = requestBodyCopy;

  // Intercept outgoing response
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody: any = null;

  res.json = function (body: any) {
    responseBody = body;
    return originalJson.apply(this, arguments as any);
  };

  res.send = function (body: any) {
    if (responseBody === null) {
      try {
        responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (_) {
        responseBody = body;
      }
    }
    return originalSend.apply(this, arguments as any);
  };

  res.on('finish', async () => {
    try {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Extract action_type from endpoint
      let actionType: string = '';
      if (reqEndpoint.includes('/create-staging')) actionType = 'create_staging';
      else if (reqEndpoint.includes('/merge-staging')) actionType = 'merge_staging';
      else if (reqEndpoint.includes('/reject-staging')) actionType = 'reject_staging';
      else if (reqEndpoint.includes('/update-tasks')) actionType = 'update_tasks';
      else if (reqEndpoint.includes('/create-task')) actionType = 'create_task';
      else if (reqEndpoint.includes('/update-task')) actionType = 'update_task';
      else if (reqEndpoint.includes('/delete-task')) actionType = 'delete_task';
      else if (reqEndpoint.includes('/sync-task-diffs')) actionType = 'sync_diffs';
      else if (reqEndpoint.includes('/diff-details')) actionType = 'diff_details';
      else if (reqEndpoint.includes('/reorder-tasks')) actionType = 'reorder_tasks';
      else if (reqEndpoint.includes('/execute-sql')) actionType = 'execute_sql';
      else if (reqEndpoint.includes('/rollback')) actionType = 'rollback';
      else {
        const parts = req.path.split('/').filter(Boolean);
        actionType = parts[parts.length - 1] || 'api_call';
      }

      const projectId = reqBodyCopy?.projectId || reqBodyCopy?.project_id || reqBodyCopy?.stagingProjectId || (reqQuery?.projectId as string) || null;

      let errorMessage: string | null = null;
      if (statusCode >= 400 && responseBody) {
        errorMessage = responseBody?.error || responseBody?.message || (typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody));
      }

      // Build sanitized request headers map (masking secret keys)
      const sanitizedHeaders: Record<string, any> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (k === 'cookie') continue;
        if (k === 'authorization' || k === 'x-api-key' || k === 'apikey') {
          sanitizedHeaders[k] = typeof v === 'string' && v.length > 8 
            ? `${v.substring(0, 4)}...${v.substring(v.length - 4)}` 
            : '***';
        } else {
          sanitizedHeaders[k] = v;
        }
      }

      // Build changes summary including automatic Agent Notes, _meta & Test Context extraction
      let changesSummary: any = null;
      if (reqBodyCopy && typeof reqBodyCopy === 'object') {
        changesSummary = {};
        if (Array.isArray(reqBodyCopy.tasks)) {
          changesSummary.tasksCount = reqBodyCopy.tasks.length;
          changesSummary.action = actionType;
        } else if (reqBodyCopy.taskTitle || reqBodyCopy.title) {
          changesSummary.title = reqBodyCopy.taskTitle || reqBodyCopy.title;
          changesSummary.action = actionType;
        } else if (responseBody?.stagingProjectId) {
          changesSummary.stagingProjectId = responseBody.stagingProjectId;
          changesSummary.stagingProjectName = responseBody.stagingProjectName;
        }

        // Automatically extract agent notes / _meta / metadata / reasons / comments
        const agentNotes = 
          reqBodyCopy._meta ?? 
          reqBodyCopy.agent_notes ?? 
          reqBodyCopy.agentNotes ?? 
          reqBodyCopy.notes ?? 
          reqBodyCopy.metadata ?? 
          reqBodyCopy.reason ?? 
          reqBodyCopy.comment;

        if (agentNotes !== undefined) {
          changesSummary.agentNotes = agentNotes;
        }

        // Capture testing and agent metadata headers
        const testingBy = req.headers['x-testing-by'] || req.headers['x-agent-name'] || req.headers['x-agent-id'];
        const testName = req.headers['x-tracker-test-name'] || req.headers['x-test-name'];
        if (testingBy || testName) {
          changesSummary.agentHeader = {
            ...(testingBy ? { testingBy: String(testingBy) } : {}),
            ...(testName ? { testName: String(testName) } : {})
          };
        }

        if (Object.keys(changesSummary).length === 0) {
          changesSummary = null;
        }
      } else {
        const testingBy = req.headers['x-testing-by'] || req.headers['x-agent-name'] || req.headers['x-agent-id'];
        const testName = req.headers['x-tracker-test-name'] || req.headers['x-test-name'];
        if (testingBy || testName) {
          changesSummary = {
            agentHeader: {
              ...(testingBy ? { testingBy: String(testingBy) } : {}),
              ...(testName ? { testName: String(testName) } : {})
            }
          };
        }
      }

      const logEntry = {
        id: logId,
        created_at: startTime,
        endpoint: reqEndpoint,
        method: reqMethod,
        status_code: statusCode,
        duration_ms: durationMs,
        project_id: projectId,
        action_type: actionType,
        ip_address: ipAddress,
        user_agent: rawUserAgent,
        request_headers: sanitizedHeaders,
        request_query: reqQuery,
        request_body: reqBodyCopy,
        response_body: responseBody,
        error_message: errorMessage,
        changes_summary: changesSummary
      };

      // Store in memory for instant local retrieval
      memApiLogs.unshift(logEntry);
      if (memApiLogs.length > 200) memApiLogs = memApiLogs.slice(0, 200);

      // Persist to Supabase api_logs table asynchronously
      if (supabase) {
        supabase.from('api_logs').insert(logEntry).then(({ error }: any) => {
          if (error) {
            console.warn("[API Logs] Supabase insert warning:", error.message || error);
          }
        }).catch((err: any) => {
          console.warn("[API Logs] Supabase insert exception:", err);
        });
      }
    } catch (_) {}
  });

  next();
});

// GET /api/logs - Optimized list of API access logs (Lightweight metadata with pagination)
app.get('/api/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 30, 100);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);
    const search = (req.query.search as string || '').toLowerCase().trim();
    const method = (req.query.method as string || '').toUpperCase();
    const status = req.query.status as string;

    const lightweightCols = 'id, endpoint, method, status_code, duration_ms, project_id, action_type, ip_address, user_agent, created_at, error_message, changes_summary';

    if (supabase) {
      let query = supabase.from('api_logs').select(lightweightCols, { count: 'exact' }).order('created_at', { ascending: false });
      if (method && method !== 'ALL') {
        query = query.eq('method', method);
      }
      if (status === 'success') {
        query = query.gte('status_code', 200).lt('status_code', 400);
      } else if (status === 'error') {
        query = query.gte('status_code', 400);
      }

      query = query.range(offset, offset + limit - 1);
      const { data, count, error } = await query;
      if (error) {
        console.warn("[API Logs] Failed to query Supabase logs:", error.message || error);
      }
      if (!error && data) {
        let filtered = data;
        if (search) {
          filtered = filtered.filter((l: any) => 
            l.endpoint?.toLowerCase().includes(search) ||
            l.action_type?.toLowerCase().includes(search) ||
            l.method?.toLowerCase().includes(search) ||
            (l.project_id && l.project_id.toLowerCase().includes(search)) ||
            (l.error_message && l.error_message.toLowerCase().includes(search))
          );
        }
        const total = count !== null ? count : filtered.length;
        const hasMore = offset + data.length < (count ?? 0);
        return res.json({ logs: filtered, total, hasMore, source: 'supabase' });
      }
    }

    // Fallback to memory logs if DB table is empty or error
    let filteredMem = memApiLogs.map(l => ({
      id: l.id,
      endpoint: l.endpoint,
      method: l.method,
      status_code: l.status_code,
      duration_ms: l.duration_ms,
      project_id: l.project_id,
      action_type: l.action_type,
      ip_address: l.ip_address,
      user_agent: l.user_agent,
      created_at: l.created_at,
      error_message: l.error_message,
      changes_summary: l.changes_summary
    }));

    if (method && method !== 'ALL') {
      filteredMem = filteredMem.filter(l => l.method === method);
    }
    if (status === 'success') {
      filteredMem = filteredMem.filter(l => l.status_code >= 200 && l.status_code < 400);
    } else if (status === 'error') {
      filteredMem = filteredMem.filter(l => l.status_code >= 400);
    }
    if (search) {
      filteredMem = filteredMem.filter(l => 
        l.endpoint?.toLowerCase().includes(search) ||
        l.action_type?.toLowerCase().includes(search) ||
        l.method?.toLowerCase().includes(search) ||
        (l.project_id && l.project_id.toLowerCase().includes(search)) ||
        (l.error_message && l.error_message.toLowerCase().includes(search))
      );
    }

    const total = filteredMem.length;
    const paginated = filteredMem.slice(offset, offset + limit);
    const hasMore = offset + paginated.length < total;

    res.json({ logs: paginated, total, hasMore, source: 'memory' });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch logs", details: err?.message });
  }
});

// GET /api/logs/:id - Fetch complete log details on-demand (lazy payload inspection)
app.get('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check memory first
    const memLog = memApiLogs.find(l => l.id === id);
    if (memLog && memLog.request_body !== undefined) {
      return res.json({ log: memLog });
    }

    // Query Supabase for full record
    if (supabase) {
      const { data, error } = await supabase.from('api_logs').select('*').eq('id', id).single();
      if (!error && data) {
        return res.json({ log: data });
      }
    }

    if (memLog) {
      return res.json({ log: memLog });
    }

    res.status(404).json({ error: "API log not found" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch log details", details: err?.message });
  }
});

// DELETE /api/logs - Clear all API logs
app.delete('/api/logs', async (req, res) => {
  try {
    memApiLogs = [];
    if (supabase) {
      const { error } = await supabase.from('api_logs').delete().not('id', 'is', null);
      if (error) {
        console.error("Supabase delete all logs error:", error);
        throw error;
      }
    }
    res.json({ success: true, message: "API logs cleared successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear logs", details: err?.message });
  }
});

// DELETE /api/logs/:id - Delete single API log
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    memApiLogs = memApiLogs.filter(l => l.id !== id);
    if (supabase) {
      await supabase.from('api_logs').delete().eq('id', id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete log", details: err?.message });
  }
});

// Middleware to check API key
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedKey = process.env.API_KEY || devKeys.API_KEY || "sk_sync_b4k92jdm10";
  
  if (apiKey !== expectedKey) {
    res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Authentication failed: Invalid or missing API Key.",
      details: "Please provide a valid API key via the 'x-api-key' HTTP header or 'api_key' query parameter."
    });
    return;
  }
  next();
};

// Helper to fetch lightweight tasks (metadata only) from Supabase to prevent loading heavy sql / function code columns
async function fetchLightweightTasksFromDB(projectId?: string) {
  try {
    const columnsWithPreviews = 'id, title, type, description, status, folder_id, project_id, production_task_id, created_at, updated_at, order_index, sql_preview, function_code_preview, edge_files_preview';
    const columnsBasic = 'id, title, type, description, status, folder_id, project_id, production_task_id, created_at, updated_at, order_index';
    
    let usePreviews = true;
    let query = supabase.from('tasks').select(columnsWithPreviews);
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    let { data, error } = await query
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    // Fall back to basic columns if preview columns do not exist yet (to prevent query failures on old schema versions)
    if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('preview') || JSON.stringify(error).includes('column'))) {
      usePreviews = false;
      let fallbackQuery = supabase.from('tasks').select(columnsBasic);
      if (projectId) {
        fallbackQuery = fallbackQuery.eq('project_id', projectId);
      }
      const fallback = await fallbackQuery
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    // Fall back further if order_index is missing
    if (error && (error.code === 'PGRST204' || JSON.stringify(error).includes('order_index'))) {
      const activeColumns = usePreviews ? columnsWithPreviews : columnsBasic;
      let fallbackQuery2 = supabase.from('tasks').select(activeColumns);
      if (projectId) {
        fallbackQuery2 = fallbackQuery2.eq('project_id', projectId);
      }
      const fallback2 = await fallbackQuery2.order('created_at', { ascending: true });
      data = fallback2.data;
      error = fallback2.error;
    }

    if (error) throw error;
    
    return (data || []).map((t: any) => {
      let sqlVal = '';
      let funcCodeVal = '';
      let edgeFilesVal: any[] = [];

      if (usePreviews) {
        sqlVal = t.sql_preview || '';
        funcCodeVal = t.function_code_preview || '';
        if (t.edge_files_preview) {
          edgeFilesVal = [{ id: 'preview', name: 'Preview', code: t.edge_files_preview }];
        }
      }

      return {
        id: t.id,
        title: t.title,
        type: t.type,
        sql: sqlVal,
        functionCode: funcCodeVal,
        description: t.description,
        edgeFiles: edgeFilesVal,
        edgeSecrets: [],
        status: t.status,
        folderId: t.folder_id,
        projectId: t.project_id,
        productionTaskId: t.production_task_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        orderIndex: t.order_index,
        isContentFetched: false
      };
    }) || [];
  } catch (error) {
    console.error("Error reading lightweight tasks from Supabase:", error);
    return [];
  }
}

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

app.get("/api/projects/summary", checkApiKey, async (req, res) => {
  try {
    // 1. Try fetching from dynamic project_summaries view
    const { data: viewData, error: viewError } = await supabase
      .from('project_summaries')
      .select('*')
      .order('project_created_at', { ascending: false });

    if (!viewError && viewData) {
      const formatted = viewData.map((row: any) => ({
        id: row.project_id,
        name: row.project_name,
        createdAt: Number(row.project_created_at),
        totalTasks: Number(row.total_tasks || 0),
        sqlCount: Number(row.sql_count || 0),
        functionCount: Number(row.function_count || 0),
        ranCount: Number(row.ran_count || 0)
      }));
      return res.json(formatted);
    }

    // 2. Resilient fallback: Query projects + lightweight tasks fields if view not created yet
    const [projectsRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('id, name, created_at').order('created_at', { ascending: false }),
      supabase.from('tasks').select('id, type, status, project_id')
    ]);

    if (projectsRes.error) throw projectsRes.error;

    const projs = projectsRes.data || [];
    const tasks = tasksRes.data || [];

    const summaryMap: Record<string, { totalTasks: number; sqlCount: number; functionCount: number; ranCount: number }> = {};
    projs.forEach((p: any) => {
      summaryMap[p.id] = { totalTasks: 0, sqlCount: 0, functionCount: 0, ranCount: 0 };
    });

    tasks.forEach((t: any) => {
      if (!t.project_id || !summaryMap[t.project_id]) return;
      const s = summaryMap[t.project_id];
      s.totalTasks += 1;
      if (t.type === 'edge_function') {
        s.functionCount += 1;
      } else {
        s.sqlCount += 1;
      }
      if (t.status === 'ran') {
        s.ranCount += 1;
      }
    });

    const result = projs.map((p: any) => ({
      id: p.id,
      name: p.name,
      createdAt: Number(p.created_at),
      ...(summaryMap[p.id] || { totalTasks: 0, sqlCount: 0, functionCount: 0, ranCount: 0 })
    }));

    res.json(result);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch project summary:", errDetails);
    res.status(500).json({ error: "Failed to fetch project summary", details: errDetails });
  }
});

async function recordApiVersionBackup(params: {
  action: string;
  description: string;
  prodProjectId: string | null;
  stagingProjectId: string | null;
  stateBefore?: any;
  stateAfter?: any;
}) {
  try {
    await supabase.from('version_backups').insert({
      id: crypto.randomUUID(),
      action: params.action,
      description: params.description,
      prod_project_id: params.prodProjectId || null,
      staging_project_id: params.stagingProjectId || null,
      is_undone: false,
      state_before: params.stateBefore || {},
      state_after: params.stateAfter || {},
      created_at: Date.now()
    });
  } catch (err) {
    console.warn("Failed to record api version backup:", err);
  }
}

app.post("/api/ai/create-staging", checkApiKey, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Missing required field 'projectId' in request body.",
        details: "Please provide the UUID of the production project you want to create a staging replica for."
      });
    }

    const { data: projectData, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (projectError || !projectData) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Project with ID '${projectId}' was not found in the database.`,
        details: "Verify that the project ID is valid and exists in your workspace."
      });
    }

    if (projectData.name.endsWith('[STAGING]')) {
      return res.status(400).json({
        success: false,
        error: "ALREADY_STAGING",
        message: `Project '${projectData.name}' is already a Staging environment.`,
        details: "You cannot create a staging replica of an existing staging project. Apply your changes directly to this staging project or merge it into production.",
        project: {
          id: projectData.id,
          name: projectData.name,
          isStaging: true
        }
      });
    }

    const targetStagingName = `${projectData.name} [STAGING]`;

    // Check if an existing staging branch already exists for this production project to prevent database clutter
    const { data: existingStaging } = await supabase
      .from('projects')
      .select('*')
      .eq('name', targetStagingName)
      .maybeSingle();

    if (existingStaging) {
      const { data: stagingTasks } = await supabase.from('tasks').select('id, type').eq('project_id', existingStaging.id);
      const stTasks = stagingTasks || [];
      return res.json({
        success: true,
        isReused: true,
        message: `Existing staging branch '${existingStaging.name}' found and ready for use.`,
        action: "reuse_staging",
        stagingProject: {
          id: existingStaging.id,
          name: existingStaging.name,
          createdAt: existingStaging.created_at,
          isStaging: true
        },
        sourceProject: {
          id: projectData.id,
          name: projectData.name
        },
        summary: {
          tasksCount: stTasks.length,
          sqlTasks: stTasks.filter((t: any) => t.type === 'sql' || !t.type).length,
          edgeFunctions: stTasks.filter((t: any) => t.type === 'edge_function').length
        },
        // Backward-compatibility properties
        id: existingStaging.id,
        name: existingStaging.name,
        stagingProjectId: existingStaging.id,
        stagingProjectName: existingStaging.name
      });
    }

    const newProjectId = crypto.randomUUID();
    const newProjectName = targetStagingName;
    const newProject = { id: newProjectId, name: newProjectName, created_at: Date.now() };

    const { error: insertProjectError } = await supabase.from('projects').insert(newProject);
    if (insertProjectError) throw insertProjectError;

    const { data: sourceTasks, error: tasksError } = await supabase.from('tasks').select('*').eq('project_id', projectData.id);
    if (tasksError) throw tasksError;

    let replicatedCount = 0;
    let sqlCount = 0;
    let functionCount = 0;

    if (sourceTasks && sourceTasks.length > 0) {
      replicatedCount = sourceTasks.length;
      sqlCount = sourceTasks.filter((t: any) => t.type === 'sql' || !t.type).length;
      functionCount = sourceTasks.filter((t: any) => t.type === 'edge_function').length;

      const duplicatedTasksParams = sourceTasks.map((t: any) => ({
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

    await recordApiVersionBackup({
      action: 'clone_project',
      description: `Created Staging Replica of "${projectData.name}" via AI`,
      prodProjectId: projectData.id,
      stagingProjectId: newProjectId,
      stateBefore: { projects: [projectData], tasks: sourceTasks || [] },
      stateAfter: { projects: [projectData, newProject], tasks: sourceTasks || [] }
    });

    res.json({
      success: true,
      message: `Staging branch '${newProjectName}' created successfully with ${replicatedCount} task(s) replicated.`,
      action: "create_staging",
      stagingProject: {
        id: newProject.id,
        name: newProject.name,
        createdAt: newProject.created_at,
        isStaging: true
      },
      sourceProject: {
        id: projectData.id,
        name: projectData.name
      },
      summary: {
        tasksReplicated: replicatedCount,
        sqlTasks: sqlCount,
        edgeFunctions: functionCount
      },
      // Backward-compatibility properties
      id: newProject.id,
      name: newProject.name,
      stagingProjectId: newProject.id,
      stagingProjectName: newProject.name
    });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to create staging project:", errDetails);
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "An error occurred while creating the staging project.",
      details: errDetails
    });
  }
});

app.post("/api/ai/merge-staging", checkApiKey, async (req, res) => {
  try {
    const { stagingProjectId, prodProjectId, merges, isAll } = req.body;
    if (!stagingProjectId || !prodProjectId) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Both 'stagingProjectId' and 'prodProjectId' are required in the request body.",
        details: { received: { stagingProjectId: stagingProjectId || null, prodProjectId: prodProjectId || null } }
      });
    }

    const [stagingProjRes, prodProjRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', stagingProjectId).single(),
      supabase.from('projects').select('*').eq('id', prodProjectId).single()
    ]);

    const stagingProjData = stagingProjRes.data;
    const prodProjData = prodProjRes.data;

    const { data: stagingTasks, error: stagingError } = await supabase.from('tasks').select('*').eq('project_id', stagingProjectId);
    if (stagingError) throw stagingError;

    let upsertedCount = 0;
    let deletedCount = 0;
    const appliedDetails: any[] = [];

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
          upsertedCount++;
          appliedDetails.push({ action: 'upsert', stagingTaskId: task.id, title: task.title, type: task.type });

          if (task.production_task_id) {
            return supabase.from('tasks').update(payload).eq('id', task.production_task_id);
          } else {
            const newProdId = crypto.randomUUID();
            await supabase.from('tasks').insert({
              ...payload,
              id: newProdId,
              created_at: Date.now()
            });
            return supabase.from('tasks').update({ production_task_id: newProdId }).eq('id', task.id);
          }
        }
        if (m.action === 'delete' && m.prodTaskId) {
          deletedCount++;
          appliedDetails.push({ action: 'delete', prodTaskId: m.prodTaskId });
          return supabase.from('tasks').delete().eq('id', m.prodTaskId);
        }
      });
      await Promise.all(dbPromises.filter(Boolean));
    } else {
      if (stagingTasks && stagingTasks.length > 0) {
        const upsertPromises = stagingTasks.map(async (task: any) => {
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
          upsertedCount++;
          appliedDetails.push({ action: 'upsert', stagingTaskId: task.id, title: task.title, type: task.type });

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

    const isStagingDeleted = Boolean(isAll || !merges);
    if (isStagingDeleted) {
      const { error: deleteTasksError } = await supabase.from('tasks').delete().eq('project_id', stagingProjectId);
      if (deleteTasksError) throw deleteTasksError;

      const { error: deleteProjectError } = await supabase.from('projects').delete().eq('id', stagingProjectId);
      if (deleteProjectError) throw deleteProjectError;
    }

    memTasks = await fetchTasksFromDB();

    await recordApiVersionBackup({
      action: 'merge',
      description: isAll ? `Merged all changes from staging into production` : `Merged ${appliedDetails.length} selected changes into production`,
      prodProjectId,
      stagingProjectId,
      stateBefore: {},
      stateAfter: {}
    });

    const targetProdName = prodProjData?.name || prodProjectId;
    const sourceStagingName = stagingProjData?.name || stagingProjectId;

    res.json({
      success: true,
      message: `Successfully merged ${upsertedCount + deletedCount} change(s) from '${sourceStagingName}' into '${targetProdName}'.`,
      action: "merge_staging",
      summary: {
        isAll: Boolean(isAll),
        totalChangesApplied: upsertedCount + deletedCount,
        tasksUpserted: upsertedCount,
        tasksDeleted: deletedCount,
        stagingProjectCleanedUp: isStagingDeleted,
        prodProjectId,
        prodProjectName: targetProdName,
        stagingProjectId,
        stagingProjectName: sourceStagingName
      },
      appliedChanges: appliedDetails
    });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to merge to production:", errDetails);
    res.status(500).json({
      success: false,
      error: "MERGE_FAILED",
      message: "An error occurred while merging staging changes into production.",
      details: errDetails
    });
  }
});

app.post("/api/ai/reject-staging", checkApiKey, async (req, res) => {
  try {
    const { stagingProjectId, prodProjectId, rejects, isAll } = req.body;
    if (!stagingProjectId || !prodProjectId) {
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Both 'stagingProjectId' and 'prodProjectId' are required in the request body.",
        details: { received: { stagingProjectId: stagingProjectId || null, prodProjectId: prodProjectId || null } }
      });
    }

    const [stagingProjRes, prodProjRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', stagingProjectId).single(),
      supabase.from('projects').select('*').eq('id', prodProjectId).single()
    ]);

    const stagingProjData = stagingProjRes.data;
    const prodProjData = prodProjRes.data;

    let rejectedCount = 0;
    const appliedRejections: any[] = [];

    if (rejects && Array.isArray(rejects)) {
      const { data: prodTasks, error: prodError } = await supabase.from('tasks').select('*').eq('project_id', prodProjectId);
      if (prodError) throw prodError;

      const dbPromises = rejects.map(async (r: any) => {
        if (r.action === 'upsert' && r.stagingTaskId) {
          const prodTask = prodTasks?.find(t => t.id === r.prodTaskId);
          rejectedCount++;
          if (prodTask) {
            appliedRejections.push({ action: 'revert_to_production', stagingTaskId: r.stagingTaskId, title: prodTask.title });
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
            appliedRejections.push({ action: 'delete_staging_addition', stagingTaskId: r.stagingTaskId });
            return supabase.from('tasks').delete().eq('id', r.stagingTaskId);
          }
        }
        if (r.action === 'delete' && r.prodTaskId) {
          const prodTask = prodTasks?.find(t => t.id === r.prodTaskId);
          if (prodTask) {
            rejectedCount++;
            appliedRejections.push({ action: 'restore_staging_task', prodTaskId: prodTask.id, title: prodTask.title });
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

    const isStagingDeleted = Boolean(isAll || !rejects);
    if (isStagingDeleted) {
      const { error: deleteTasksError } = await supabase.from('tasks').delete().eq('project_id', stagingProjectId);
      if (deleteTasksError) throw deleteTasksError;

      const { error: deleteProjectError } = await supabase.from('projects').delete().eq('id', stagingProjectId);
      if (deleteProjectError) throw deleteProjectError;
    }

    memTasks = await fetchTasksFromDB();

    await recordApiVersionBackup({
      action: 'reject',
      description: isAll ? `Rejected all staging changes` : `Rejected ${appliedRejections.length} staging change(s)`,
      prodProjectId,
      stagingProjectId,
      stateBefore: {},
      stateAfter: {}
    });

    const targetProdName = prodProjData?.name || prodProjectId;
    const sourceStagingName = stagingProjData?.name || stagingProjectId;

    res.json({
      success: true,
      message: isAll 
        ? `Successfully rejected all staging changes and cleaned up '${sourceStagingName}'.`
        : `Successfully rejected ${rejectedCount} staging change(s) for '${sourceStagingName}'.`,
      action: "reject_staging",
      summary: {
        isAll: Boolean(isAll),
        totalRejectionsApplied: isAll ? 'all' : rejectedCount,
        stagingProjectCleanedUp: isStagingDeleted,
        prodProjectId,
        prodProjectName: targetProdName,
        stagingProjectId,
        stagingProjectName: sourceStagingName
      },
      appliedRejections
    });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to reject staging:", errDetails);
    res.status(500).json({
      success: false,
      error: "REJECT_FAILED",
      message: "An error occurred while rejecting staging changes.",
      details: errDetails
    });
  }
});

app.get("/api/project-tasks-light", checkApiKey, async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  const projectIdsStr = req.query.projectIds as string;
  if (!projectIdsStr) {
    return res.status(400).json({ error: "projectIds is required" });
  }

  const projectIds = projectIdsStr.split(',');
  const allTasks: any[] = [];

  try {
    for (const pid of projectIds) {
      const tasks = await fetchLightweightTasksFromDB(pid);
      allTasks.push(...tasks);
    }

    res.json(allTasks);
  } catch (err) {
    console.error("Error fetching lightweight tasks:", err);
    res.status(500).json({ error: "Failed to fetch lightweight tasks" });
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
  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: "BAD_REQUEST",
      message: "Missing required query parameter 'projectId'.",
      details: "Please specify the projectId in the query string (e.g., /export.json?projectId=<PROJECT_UUID>) to export tasks for a specific project."
    });
  }

  const { data: projData, error: projError } = await supabase.from('projects').select('name').eq('id', projectId).single();
  if (projError || !projData) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      message: `Project with ID '${projectId}' was not found in the database.`,
      details: "Verify that the projectId is valid and exists."
    });
  }

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
    project: {
      id: projectId,
      name: projData.name
    },
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
      return res.status(400).json({
        success: false,
        error: "BAD_REQUEST",
        message: "Missing required field 'projectId' in request body.",
        details: "Please specify the project ID where the new task should be created."
      });
    }

    const { data: projData, error: projError } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (projError || !projData) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Project with ID '${projectId}' was not found in the database.`,
        details: "Verify that the projectId is correct and exists."
      });
    }

    // STRICT STAGING RULE: Do NOT allow writing directly to Production projects
    if (!projData.name.endsWith('[STAGING]')) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Direct task creation in Production project '${projData.name}' is forbidden.`,
        details: "Writes are strictly prohibited on production projects for data safety. You must create or use a [STAGING] branch, add your tasks there, and merge into production.",
        project: {
          id: projData.id,
          name: projData.name,
          isStaging: false
        },
        remediation: {
          step1: "POST /api/ai/create-staging with { projectId: '" + projData.id + "' } to get a stagingProjectId",
          step2: "POST /api/ai/write with the stagingProjectId",
          step3: "POST /api/ai/merge-staging to review and merge into production"
        }
      });
    }

    const taskType = type || 'sql';
    const taskTitle = title || 'AI Generated Task';
    const newTask = {
      id: crypto.randomUUID(),
      title: taskTitle,
      type: taskType,
      sql: sql || '',
      function_code: functionCode || '',
      description: description || 'Generated by AI',
      edge_files: edgeFiles || (taskType === 'edge_function' ? [{ id: crypto.randomUUID(), name: 'index.ts', code: '' }] : []),
      edge_secrets: edgeSecrets || [],
      status: 'pending',
      folder_id: null,
      project_id: projectId,
      created_at: Date.now(),
      updated_at: Date.now(),
      order_index: Date.now()
    };

    const { error } = await supabase.from('tasks').insert(newTask);
    if (error) throw error;

    await recordApiVersionBackup({
      action: 'create_task',
      description: `Created new ${taskType === 'edge_function' ? 'Edge Function' : 'SQL'} task "${taskTitle}" via AI`,
      prodProjectId: null,
      stagingProjectId: projectId,
      stateBefore: { projects: [], tasks: [] },
      stateAfter: { projects: [], tasks: [newTask] }
    });

    const responsePayload = {
      success: true,
      message: `Task '${taskTitle}' successfully created in staging project '${projData.name}'.`,
      action: "create_task",
      task: newTask,
      data: newTask,
      project: {
        id: projData.id,
        name: projData.name,
        isStaging: true
      },
      summary: {
        taskId: newTask.id,
        title: newTask.title,
        type: newTask.type,
        status: newTask.status,
        hasSql: Boolean(newTask.sql?.trim()),
        edgeFilesCount: newTask.type === 'edge_function' ? (newTask.edge_files?.length || 0) : 0,
        createdAt: newTask.created_at
      }
    };

    res.json(responsePayload);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to write task via AI API:", errDetails);
    res.status(500).json({
      success: false,
      error: "WRITE_FAILED",
      message: "An error occurred while creating the task.",
      details: errDetails
    });
  }
});

app.put("/api/ai/write/:taskId", checkApiKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, type, sql, functionCode, description, edgeFiles, edgeSecrets } = req.body;

    const { data: existingTask, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (taskError || !existingTask) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Task with ID '${taskId}' was not found in database.`,
        details: "Verify that the taskId exists before attempting an update."
      });
    }

    const { data: projData, error: projError } = await supabase.from('projects').select('*').eq('id', existingTask.project_id).single();
    if (projError || !projData) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Associated project '${existingTask.project_id}' was not found.`,
        details: "Task references a project that no longer exists in the database."
      });
    }

    // STRICT STAGING RULE: Do NOT allow direct updates to tasks in Production projects
    if (!projData.name.endsWith('[STAGING]')) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Direct modification of task '${existingTask.title || taskId}' in Production project '${projData.name}' is forbidden.`,
        details: "Task updates are strictly restricted to [STAGING] environments to protect production stability. Please create a staging replica of this project first, apply the updates in staging, and merge when ready.",
        task: {
          id: existingTask.id,
          title: existingTask.title,
          projectId: existingTask.project_id,
          projectName: projData.name
        },
        remediation: {
          step1: "POST /api/ai/create-staging with { projectId: '" + existingTask.project_id + "' } to get a staging replica",
          step2: "PUT /api/ai/write/<stagingTaskId> within the newly created staging replica",
          step3: "POST /api/ai/merge-staging to review diffs and merge into production"
        }
      });
    }

    const taskUpdates: any = { updated_at: Date.now() };
    if (title !== undefined) taskUpdates.title = title;
    if (type !== undefined) taskUpdates.type = type;
    if (sql !== undefined) taskUpdates.sql = sql;
    if (functionCode !== undefined) taskUpdates.function_code = functionCode;
    if (description !== undefined) taskUpdates.description = description;
    if (edgeFiles !== undefined) taskUpdates.edge_files = edgeFiles;
    if (edgeSecrets !== undefined) taskUpdates.edge_secrets = edgeSecrets;

    const { error } = await supabase.from('tasks').update(taskUpdates).eq('id', taskId);
    if (error) throw error;

    const finalTitle = taskUpdates.title || existingTask.title || 'Task';

    await recordApiVersionBackup({
      action: 'update_task',
      description: `Updated task "${finalTitle}" via AI`,
      prodProjectId: null,
      stagingProjectId: existingTask.project_id,
      stateBefore: { projects: [], tasks: [existingTask] },
      stateAfter: { projects: [], tasks: [{ id: taskId, ...existingTask, ...taskUpdates }] }
    });

    const modifiedFields = Object.keys(taskUpdates).filter(k => k !== 'updated_at');

    const responsePayload = {
      success: true,
      message: `Task '${finalTitle}' successfully updated in staging project '${projData.name}'.`,
      action: "update_task",
      taskId: taskId,
      task: { id: taskId, ...existingTask, ...taskUpdates },
      data: { id: taskId, ...existingTask, ...taskUpdates },
      project: {
        id: projData.id,
        name: projData.name,
        isStaging: true
      },
      summary: {
        fieldsModified: modifiedFields,
        updatedAt: taskUpdates.updated_at
      }
    };

    res.json(responsePayload);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to update task via AI API:", errDetails);
    res.status(500).json({
      success: false,
      error: "UPDATE_FAILED",
      message: "An error occurred while updating the task.",
      details: errDetails
    });
  }
});

app.delete("/api/ai/write/:taskId", checkApiKey, async (req, res) => {
  try {
    const { taskId } = req.params;

    // First fetch the task to get the project_id
    const { data: existingTask, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (taskError || !existingTask) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Task with ID '${taskId}' was not found in database.`,
        details: "Verify that the taskId exists before attempting deletion."
      });
    }

    // Now fetch the project to verify its name
    const { data: projData, error: projError } = await supabase.from('projects').select('*').eq('id', existingTask.project_id).single();
    if (projError || !projData) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: `Associated project '${existingTask.project_id}' was not found.`,
        details: "Task references a project that does not exist in the database."
      });
    }

    // STRICT STAGING RULE: Do NOT allow deleting tasks from Production projects
    if (!projData.name.endsWith('[STAGING]')) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Cannot delete task '${existingTask.title || taskId}' directly from Production project '${projData.name}'.`,
        details: "Direct task deletions are prohibited on production branches for data safety. Deletions are only permitted within [STAGING] environments. To delete this task, first create a staging replica (POST /api/ai/create-staging), delete the task inside the staging replica, and then merge into production (POST /api/ai/merge-staging).",
        task: {
          id: existingTask.id,
          title: existingTask.title,
          projectId: existingTask.project_id,
          projectName: projData.name
        },
        remediation: {
          step1: "POST /api/ai/create-staging with { projectId: '" + existingTask.project_id + "' }",
          step2: "DELETE /api/ai/write/<stagingTaskId> within the newly created staging branch",
          step3: "POST /api/ai/merge-staging to merge and apply the deletion to production"
        }
      });
    }

    // Proceed with deletion
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;

    await recordApiVersionBackup({
      action: 'delete_task',
      description: `Deleted task "${existingTask.title || 'Unknown'}" via AI`,
      prodProjectId: null,
      stagingProjectId: existingTask.project_id,
      stateBefore: { projects: [], tasks: [existingTask] },
      stateAfter: { projects: [], tasks: [] }
    });

    res.json({
      success: true,
      message: `Task '${existingTask.title || taskId}' was successfully deleted from staging project '${projData.name}'.`,
      action: "delete_task",
      deletedTask: {
        id: taskId,
        title: existingTask.title,
        type: existingTask.type,
        projectId: existingTask.project_id,
        projectName: projData.name
      },
      summary: {
        taskId,
        deletedAt: Date.now()
      }
    });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to delete task via AI API:", errDetails);
    res.status(500).json({
      success: false,
      error: "DELETE_FAILED",
      message: "An error occurred while deleting the task.",
      details: errDetails
    });
  }
});

// Version backups endpoint (Optimized to return only metadata, reducing initial egress by 99%)
app.get("/api/version-backups", checkApiKey, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('version_backups')
      .select('id, created_at, action, description, is_undone, prod_project_id, staging_project_id')
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
      stateBefore: null,
      stateAfter: null
    }));
    
    res.json(mapped);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch version backups:", errDetails);
    res.status(500).json({ error: "Failed to fetch version backups", details: errDetails });
  }
});

// Version backup detail endpoint (Lazy loaded on demand)
app.get("/api/version-backup-detail", checkApiKey, async (req, res) => {
  try {
    const idsString = req.query.ids as string;
    if (!idsString) {
      return res.status(400).json({ error: "ids parameter is required" });
    }
    const ids = idsString.split(',').filter(Boolean);
    if (ids.length === 0) {
      return res.json({});
    }
    
    const { data, error } = await supabase
      .from('version_backups')
      .select('id, state_before, state_after')
      .in('id', ids);
      
    if (error) throw error;
    
    const result = (data || []).reduce((acc: any, b: any) => {
      // Pre-calculate which tasks had their code modified before stripping
      const beforeTasks = b.state_before?.tasks || [];
      const afterTasks = b.state_after?.tasks || [];
      
      const modifiedCodeMap: Record<string, boolean> = {};
      
      afterTasks.forEach((afterTask: any) => {
         const beforeTask = beforeTasks.find((t: any) => t.id === afterTask.id);
         if (beforeTask) {
             const oldCode = (beforeTask.type === "edge_function" ? (beforeTask.functionCode || beforeTask.edgeFiles?.[0]?.code) : beforeTask.sql) || "";
             const newCode = (afterTask.type === "edge_function" ? (afterTask.functionCode || afterTask.edgeFiles?.[0]?.code) : afterTask.sql) || "";
             const oldFilesStr = JSON.stringify(beforeTask.edgeFiles || []);
             const newFilesStr = JSON.stringify(afterTask.edgeFiles || []);
             const oldSecretsStr = JSON.stringify(beforeTask.edgeSecrets || []);
             const newSecretsStr = JSON.stringify(afterTask.edgeSecrets || []);
             if (oldCode.trim() !== newCode.trim() || oldFilesStr !== newFilesStr || oldSecretsStr !== newSecretsStr) {
                 modifiedCodeMap[afterTask.id] = true;
             }
         }
      });
      
      // Strip heavy text payload from the JSONs to save network bandwidth (Lazy Loading for task code)
      const stripHeavyFields = (state: any) => {
        if (!state || !state.tasks) return state;
        return {
          ...state,
          tasks: state.tasks.map((t: any) => {
            const { sql, functionCode, edgeFiles, edgeSecrets, ...rest } = t;
            return {
              ...rest,
              // Add flags so the frontend knows it has been stripped but retains diff status
              isContentStripped: true,
              wasCodeModified: !!modifiedCodeMap[t.id]
            };
          })
        };
      };

      acc[b.id] = {
        stateBefore: stripHeavyFields(b.state_before),
        stateAfter: stripHeavyFields(b.state_after)
      };
      return acc;
    }, {});
    
    res.json(result);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch version backup details:", errDetails);
    res.status(500).json({ error: "Failed to fetch version backup details", details: errDetails });
  }
});

// Fetch full task details for a single task inside a specific version backup
app.get("/api/version-task-state", checkApiKey, async (req, res) => {
  try {
    const { versionIdBefore, versionIdAfter, taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const fetchSingleTaskState = async (versionId: any, isBefore: boolean) => {
      if (!versionId) return null;
      try {
        const r = await supabase.rpc('get_version_task_state', { 
          version_id: versionId, 
          target_task_id: taskId, 
          is_before: isBefore 
        });
        if (!r.error && r.data) {
          return r.data;
        }
      } catch (_) {}

      // Fallback: fetch state directly from version_backups row
      try {
        const fieldName = isBefore ? 'state_before' : 'state_after';
        const { data, error } = await supabase
          .from('version_backups')
          .select(fieldName)
          .eq('id', versionId)
          .single();
        if (!error && data && data[fieldName]?.tasks) {
          const matched = data[fieldName].tasks.find((t: any) => t.id === taskId);
          return matched || null;
        }
      } catch (_) {}
      return null;
    };

    const [stateBefore, stateAfter] = await Promise.all([
      fetchSingleTaskState(versionIdBefore, true),
      fetchSingleTaskState(versionIdAfter, false)
    ]);

    res.json({ stateBefore, stateAfter });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch version task state:", errDetails);
    res.status(500).json({ error: "Failed to fetch version task state", details: errDetails });
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

app.get("/api/diff-summary", checkApiKey, async (req, res) => {
  try {
    const { stagingProjectId, prodProjectId } = req.query;
    if (!stagingProjectId || !prodProjectId) {
      return res.status(400).json({ error: "stagingProjectId and prodProjectId are required" });
    }

    const [prodTasks, stagingTasks] = await Promise.all([
      fetchTasksFromDB(prodProjectId as string),
      fetchTasksFromDB(stagingProjectId as string)
    ]);

    const prodTaskMap = new Map<string, any>(prodTasks.map(t => [t.id, t]));
    const stagingParentMap = new Map<string, any>();
    stagingTasks.forEach(st => {
      if (st.productionTaskId) stagingParentMap.set(st.productionTaskId, st);
    });

    const items: any[] = [];

    // Find Added and Modified
    stagingTasks.forEach(st => {
      if (!st.productionTaskId || !prodTaskMap.has(st.productionTaskId)) {
        // Added
        const content = st.type === "edge_function" ? 
           (st.edgeFiles?.map((f: any) => f.code).join('\n') || '') + '\n' + (st.edgeSecrets?.map((s: any) => s.key + '=' + s.value).join('\n') || '') 
           : (st.sql || '');
        const lines = content.trim() ? content.split('\n').length : 0;
        items.push({
          id: st.id,
          title: st.title || "Untitled",
          type: st.type || 'sql',
          status: "added",
          prodTaskId: null,
          stagingTaskId: st.id,
          additions: lines,
          deletions: 0,
          updatedAt: st.updatedAt
        });
      } else {
        // Check Modified
        const pt = prodTaskMap.get(st.productionTaskId)!;
        let isModified = false;
        let stStr = '';
        let ptStr = '';

        if (st.type === 'edge_function') {
           const stFilesStr = JSON.stringify(st.edgeFiles?.map((f: any) => ({ n: f.name, c: f.code })) || []);
           const ptFilesStr = JSON.stringify(pt.edgeFiles?.map((f: any) => ({ n: f.name, c: f.code })) || []);
           if (stFilesStr !== ptFilesStr) isModified = true;
           
           const stSecretsStr = JSON.stringify(st.edgeSecrets?.map((s: any) => ({ k: s.key, v: s.value })) || []);
           const ptSecretsStr = JSON.stringify(pt.edgeSecrets?.map((s: any) => ({ k: s.key, v: s.value })) || []);
           if (stSecretsStr !== ptSecretsStr) isModified = true;
           
           stStr = (st.edgeFiles?.map((f: any) => f.code).join('\n') || '') + '\n' + (st.edgeSecrets?.map((s: any) => s.key + '=' + s.value).join('\n') || '');
           ptStr = (pt.edgeFiles?.map((f: any) => f.code).join('\n') || '') + '\n' + (pt.edgeSecrets?.map((s: any) => s.key + '=' + s.value).join('\n') || '');
        } else {
           if (st.sql !== pt.sql) isModified = true;
           stStr = st.sql || '';
           ptStr = pt.sql || '';
        }

        if (isModified) {
          const diffResult = diffLines(ptStr, stStr);
          let additions = 0;
          let deletions = 0;
          diffResult.forEach(part => {
            if (part.added) additions += part.count || 0;
            else if (part.removed) deletions += part.count || 0;
          });

          items.push({
            id: st.id,
            title: st.title || "Untitled",
            type: st.type || 'sql',
            status: "modified",
            prodTaskId: pt.id,
            stagingTaskId: st.id,
            additions,
            deletions,
            updatedAt: st.updatedAt
          });
        }
      }
    });

    // Find Deleted
    prodTasks.forEach(pt => {
      if (!stagingParentMap.has(pt.id)) {
        const content = pt.type === "edge_function" ? 
           (pt.edgeFiles?.map((f: any) => f.code).join('\n') || '') + '\n' + (pt.edgeSecrets?.map((s: any) => s.key + '=' + s.value).join('\n') || '') 
           : (pt.sql || '');
        const lines = content.trim() ? content.split('\n').length : 0;
        items.push({
          id: pt.id,
          title: pt.title || "Untitled",
          type: pt.type || 'sql',
          status: "deleted",
          prodTaskId: pt.id,
          stagingTaskId: null,
          additions: 0,
          deletions: lines,
          updatedAt: pt.updatedAt
        });
      }
    });

    res.json(items);
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to generate diff summary:", errDetails);
    res.status(500).json({ error: "Failed to generate diff summary", details: errDetails });
  }
});

app.get("/api/diff-detail", checkApiKey, async (req, res) => {
  try {
    const { prodTaskId, stagingTaskId } = req.query;
    let prodTask: any = null;
    let stagingTask: any = null;

    const queries: Promise<any>[] = [];
    if (prodTaskId) {
      queries.push(supabase.from('tasks').select('*').eq('id', prodTaskId).single().then((res: any) => res.data));
    } else {
      queries.push(Promise.resolve(null));
    }

    if (stagingTaskId) {
      queries.push(supabase.from('tasks').select('*').eq('id', stagingTaskId).single().then((res: any) => res.data));
    } else {
      queries.push(Promise.resolve(null));
    }

    const [prodData, stagingData] = await Promise.all(queries);

    const mapTask = (t: any) => {
      if (!t) return null;
      return {
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
      };
    };

    res.json({
      prodTask: mapTask(prodData),
      stagingTask: mapTask(stagingData)
    });
  } catch (err) {
    const errDetails = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Failed to fetch diff details:", errDetails);
    res.status(500).json({ error: "Failed to fetch diff details", details: errDetails });
  }
});

export default app;
