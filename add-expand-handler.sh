sed -i '/const existingProjectIds = useMemo(/i \
  const handleExpandTaskForDiff = async (taskId: string, currentExpandedId: string | null, setter: React.Dispatch<React.SetStateAction<string | null>>, task1: SqlTask | undefined, task2: SqlTask | undefined) => {\n\
    const isExpanding = currentExpandedId !== taskId;\n\
    setter(isExpanding ? taskId : null);\n\
\n\
    if (isExpanding && versionGroup && versionGroup.length > 0) {\n\
      const needsFetch = (task1 && task1.isContentStripped) || (task2 && task2.isContentStripped);\n\
      if (needsFetch && !fetchedTaskStates[taskId]) {\n\
        try {\n\
          setLoadingTaskId(taskId);\n\
          const oldest = versionGroup[versionGroup.length - 1];\n\
          const latest = versionGroup[0];\n\
\n\
          const devKeysModules = import.meta.glob("../../lib/dev-keys.ts", { eager: true });\n\
          const devKeys: any = devKeysModules["../../lib/dev-keys.ts"] || {};\n\
          const apiKey = import.meta.env.VITE_API_KEY || devKeys.VITE_API_KEY || "sk_sync_b4k92jdm10";\n\
\n\
          let url = `/api/version-task-state?taskId=${taskId}&api_key=${apiKey}`;\n\
          if (task1) url += `&versionIdBefore=${oldest.id}`;\n\
          if (task2) url += `&versionIdAfter=${latest.id}`;\n\
\n\
          const res = await fetch(url);\n\
          if (res.ok) {\n\
            const data = await res.json();\n\
            setFetchedTaskStates(prev => ({ ...prev, [taskId]: data }));\n\
          }\n\
        } catch (err) {\n\
          console.error("Failed to fetch full task details", err);\n\
        } finally {\n\
          setLoadingTaskId(null);\n\
        }\n\
      }\n\
    }\n\
  };\n' src/components/version-control/VersionDetailView.tsx
