import { VersionBackup, SqlTask } from "../../types";

export interface BackupFieldInfo {
  type: "major" | "project_status" | "project_order" | "task_field" | "other";
  groupKey: string;
  fieldLabel?: string;
  taskTitle?: string;
  taskId?: string;
}

export interface ConsolidatedBackupGroup {
  id: string; // latestBackup.id
  groupKey: string;
  items: VersionBackup[]; // sorted descending: [0] is latest, [length - 1] is oldest
  latestBackup: VersionBackup;
  oldestBackup: VersionBackup;
  count: number;
  type: BackupFieldInfo["type"];
  fieldLabel?: string;
  taskTitle?: string;
  taskId?: string;
  displayTitle: string;
  displaySubtitle: string;
  timestamp: number;
}

/**
 * Extracts task ID and title from description if available.
 * Example descriptions generated in App.tsx:
 * - 'Updated title to "New Title"'
 * - 'Updated description of "Task Title"'
 * - 'Updated SQL in "Task Title"'
 * - 'Updated code in "Task Title"'
 * - 'Updated secrets in "Task Title"'
 * - 'Changed status of "Task Title" to ran'
 * - 'Updated "Task Title"'
 */
function extractTaskDetailsFromDescription(desc: string): { field?: string; title?: string } {
  if (!desc) return {};

  const titleMatch = desc.match(/"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : undefined;

  if (/^Updated title/i.test(desc) || /title/i.test(desc)) {
    return { field: "Title", title };
  }
  if (/^Updated description/i.test(desc) || /description/i.test(desc)) {
    return { field: "Description", title };
  }
  if (/^Updated SQL/i.test(desc) || /SQL/i.test(desc)) {
    return { field: "SQL Query", title };
  }
  if (/^Updated code/i.test(desc) || /code/i.test(desc)) {
    return { field: "Code", title };
  }
  if (/^Updated secrets/i.test(desc) || /secrets/i.test(desc)) {
    return { field: "Secrets", title };
  }
  if (/^Changed status/i.test(desc) || /status/i.test(desc)) {
    return { field: "Status", title };
  }

  return { title };
}

/**
 * Analyzes a backup snapshot to determine its scope, field, and grouping key.
 */
export function getBackupFieldInfo(backup: VersionBackup): BackupFieldInfo {
  const majorActions = [
    "merge",
    "reject",
    "create_task",
    "delete_task",
    "create_project",
    "delete_project",
    "clone_project",
    "import_tasks",
  ];

  // Major actions are strictly isolated and never consolidated
  if (majorActions.includes(backup.action)) {
    return {
      type: "major",
      groupKey: `major_${backup.id}`,
    };
  }

  const projectKey = backup.prodProjectId || "global";
  const desc = backup.description || "";

  // 1. Status changes (project-level consolidation)
  if (
    backup.action === "update_status" ||
    desc.toLowerCase().startsWith("changed status")
  ) {
    const { title } = extractTaskDetailsFromDescription(desc);
    return {
      type: "project_status",
      groupKey: `project_status_${projectKey}`,
      fieldLabel: "Status",
      taskTitle: title,
    };
  }

  // 2. Order changes (project-level consolidation)
  if (
    desc.toLowerCase().includes("reordered") ||
    desc.toLowerCase().includes("order")
  ) {
    return {
      type: "project_order",
      groupKey: `project_order_${projectKey}`,
      fieldLabel: "Order",
    };
  }

  // 3. Task field-level updates
  if (backup.action === "update_task") {
    const beforeTasks = backup.stateBefore?.tasks || [];
    const afterTasks = backup.stateAfter?.tasks || [];

    const beforeMap = new Map<string, SqlTask>();
    beforeTasks.forEach((t) => beforeMap.set(t.id, t));

    const changedTaskIds: string[] = [];
    const changedFields = new Set<string>();
    let foundTaskTitle: string | undefined;

    for (const afterTask of afterTasks) {
      const beforeTask = beforeMap.get(afterTask.id);
      if (beforeTask) {
        let taskChanged = false;

        if (beforeTask.title !== afterTask.title) {
          changedFields.add("title");
          taskChanged = true;
        }
        if (beforeTask.description !== afterTask.description) {
          changedFields.add("description");
          taskChanged = true;
        }
        if (beforeTask.sql !== afterTask.sql) {
          changedFields.add("sql");
          taskChanged = true;
        }
        if (
          beforeTask.functionCode !== afterTask.functionCode ||
          JSON.stringify(beforeTask.edgeFiles) !== JSON.stringify(afterTask.edgeFiles)
        ) {
          changedFields.add("code");
          taskChanged = true;
        }
        if (JSON.stringify(beforeTask.edgeSecrets) !== JSON.stringify(afterTask.edgeSecrets)) {
          changedFields.add("secrets");
          taskChanged = true;
        }
        if (beforeTask.status !== afterTask.status) {
          changedFields.add("status");
          taskChanged = true;
        }
        const beforeOrder = beforeTask.orderIndex !== undefined ? beforeTask.orderIndex : (beforeTask as any).order_index;
        const afterOrder = afterTask.orderIndex !== undefined ? afterTask.orderIndex : (afterTask as any).order_index;
        if (beforeOrder !== afterOrder) {
          changedFields.add("orderIndex");
          taskChanged = true;
        }

        if (taskChanged) {
          changedTaskIds.push(afterTask.id);
          foundTaskTitle = afterTask.title || beforeTask.title;
        }
      }
    }

    // Check if diff reveals project-level status or order change
    if (changedFields.size === 1 && changedFields.has("status")) {
      return {
        type: "project_status",
        groupKey: `project_status_${projectKey}`,
        fieldLabel: "Status",
        taskTitle: foundTaskTitle,
      };
    }

    if (changedFields.size === 1 && changedFields.has("orderIndex")) {
      return {
        type: "project_order",
        groupKey: `project_order_${projectKey}`,
        fieldLabel: "Order",
      };
    }

    // Single task field edit
    if (changedTaskIds.length === 1 && changedFields.size === 1) {
      const field = Array.from(changedFields)[0];
      const taskId = changedTaskIds[0];
      const fieldLabels: Record<string, string> = {
        title: "Title",
        description: "Description",
        sql: "SQL Query",
        code: "Code",
        secrets: "Secrets",
      };
      const fieldLabel = fieldLabels[field] || field;

      return {
        type: "task_field",
        groupKey: `task_${taskId}_${field}_${projectKey}`,
        fieldLabel,
        taskTitle: foundTaskTitle,
        taskId,
      };
    }

    // Fallback: If task details extracted from description
    const descInfo = extractTaskDetailsFromDescription(desc);
    if (descInfo.field) {
      const fieldKey = descInfo.field.toLowerCase().replace(/\s+/g, "_");
      const taskId = changedTaskIds[0] || (descInfo.title ? `bytitle_${descInfo.title}` : "task");
      return {
        type: "task_field",
        groupKey: `task_${taskId}_${fieldKey}_${projectKey}`,
        fieldLabel: descInfo.field,
        taskTitle: foundTaskTitle || descInfo.title,
        taskId,
      };
    }

    if (changedTaskIds.length === 1) {
      const taskId = changedTaskIds[0];
      const fieldsStr = Array.from(changedFields).sort().join("_");
      return {
        type: "task_field",
        groupKey: `task_${taskId}_${fieldsStr}_${projectKey}`,
        fieldLabel: "Properties",
        taskTitle: foundTaskTitle,
        taskId,
      };
    }
  }

  return {
    type: "other",
    groupKey: `other_${backup.id}`,
  };
}

/**
 * Groups backups strictly consecutively.
 * If user does Title -> Title -> Title, it becomes 1 consolidated snapshot.
 * If user then goes to Description -> Description, it becomes 1 consolidated snapshot.
 * If user then returns to Title -> Title, it becomes a NEW consolidated snapshot.
 * Previous snapshot is NEVER resumed.
 */
export function groupBackupsSequentially(backups: VersionBackup[]): ConsolidatedBackupGroup[] {
  const groups: ConsolidatedBackupGroup[] = [];
  let currentGroup: {
    groupKey: string;
    items: VersionBackup[];
    fieldInfo: BackupFieldInfo;
  } | null = null;

  for (const backup of backups) {
    const fieldInfo = getBackupFieldInfo(backup);

    // Major actions always get their own isolated group
    if (fieldInfo.type === "major") {
      if (currentGroup) {
        groups.push(buildGroup(currentGroup.groupKey, currentGroup.items, currentGroup.fieldInfo));
        currentGroup = null;
      }
      groups.push(buildGroup(fieldInfo.groupKey, [backup], fieldInfo));
      continue;
    }

    if (!currentGroup) {
      currentGroup = {
        groupKey: fieldInfo.groupKey,
        items: [backup],
        fieldInfo,
      };
    } else if (currentGroup.groupKey === fieldInfo.groupKey) {
      // Exactly consecutive edit on the same field/action: consolidate!
      currentGroup.items.push(backup);
    } else {
      // Field/action changed: finalize current group and start a new one!
      groups.push(buildGroup(currentGroup.groupKey, currentGroup.items, currentGroup.fieldInfo));
      currentGroup = {
        groupKey: fieldInfo.groupKey,
        items: [backup],
        fieldInfo,
      };
    }
  }

  if (currentGroup) {
    groups.push(buildGroup(currentGroup.groupKey, currentGroup.items, currentGroup.fieldInfo));
  }

  return groups;
}

function buildGroup(
  groupKey: string,
  items: VersionBackup[],
  fieldInfo: BackupFieldInfo
): ConsolidatedBackupGroup {
  const latestBackup = items[0];
  const oldestBackup = items[items.length - 1];
  const count = items.length;

  let displayTitle = latestBackup.description || "Database snapshot recorded";
  let displaySubtitle = "";

  if (count > 1) {
    if (fieldInfo.type === "task_field") {
      const taskName = fieldInfo.taskTitle ? `"${fieldInfo.taskTitle}"` : "Task";
      const field = fieldInfo.fieldLabel || "Field";
      displayTitle = `${taskName} • ${field} Updated`;
      displaySubtitle = `${count} consecutive ${field.toLowerCase()} edits consolidated`;
    } else if (fieldInfo.type === "project_status") {
      displayTitle = `Project Status Updated`;
      displaySubtitle = `${count} task status transitions consolidated`;
    } else if (fieldInfo.type === "project_order") {
      displayTitle = `Project Order Updated`;
      displaySubtitle = `${count} task reorder operations consolidated`;
    } else {
      displayTitle = `${latestBackup.description || "Updated"}`;
      displaySubtitle = `${count} consecutive updates consolidated`;
    }
  } else {
    displaySubtitle = new Date(latestBackup.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  return {
    id: latestBackup.id,
    groupKey,
    items,
    latestBackup,
    oldestBackup,
    count,
    type: fieldInfo.type,
    fieldLabel: fieldInfo.fieldLabel,
    taskTitle: fieldInfo.taskTitle,
    taskId: fieldInfo.taskId,
    displayTitle,
    displaySubtitle,
    timestamp: latestBackup.timestamp,
  };
}
