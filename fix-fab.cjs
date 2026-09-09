const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = '{/* FAB Speed Dial Stack - Strictly centered w-14 column */}';
const endMarker = '{/* Resize Handle */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers");
  process.exit(1);
}

const replacement = `{/* FAB Speed Dial Stack - Strictly Absolute Positioning */}
        <div className="md:hidden absolute bottom-20 right-6 z-50 pointer-events-none w-14 h-14">
          
          {/* Main Primary Add Task Button (Flat, No Glow/Shadow) */}
          <div className="absolute bottom-0 right-0 w-14 h-14 flex items-center justify-center pointer-events-auto z-10">
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(20);
                setIsFabSpeedDialOpen(false);
                setIsFabExportSubmenuOpen(false);
                setIsCreateSpeedDialOpen(!isCreateSpeedDialOpen);
              }}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full flex items-center justify-center transition-all cursor-pointer focus:outline-none"
              title={isCreateSpeedDialOpen ? "Close Create Menu" : "Create New Task"}
            >
              <Plus 
                size={26} 
                className={cn(
                  "transition-transform duration-300", 
                  isCreateSpeedDialOpen ? "rotate-45" : ""
                )} 
              />
            </button>
          </div>

          {/* Create Speed Dial Animated Options (SQL Query, Edge Function, Close) */}
          <AnimatePresence>
            {isCreateSpeedDialOpen && (
              <>
                {/* 1. SQL Query Task Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.03 }}
                  className="absolute bottom-[68px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    SQL Query
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleCreateTask("sql");
                      setIsCreateSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md"
                    title="Create SQL Query"
                  >
                    <Database size={19} />
                  </button>
                </motion.div>

                {/* 2. Edge Function Task Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.07 }}
                  className="absolute bottom-[124px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Edge Function
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      handleCreateTask("edge_function");
                      setIsCreateSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none shadow-md"
                    title="Create Edge Function"
                  >
                    <FileCode size={19} />
                  </button>
                </motion.div>

                {/* 3. Close Create Speed Dial Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.11 }}
                  className="absolute bottom-[180px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Close Menu
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(15);
                      setIsCreateSpeedDialOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-zinc-700 focus:outline-none shadow-md"
                    title="Close"
                  >
                    <X size={19} />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Consolidated Data Actions FAB Button */}
          <AnimatePresence>
            {!isCreateSpeedDialOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-[68px] right-[4px] w-12 h-12 flex items-center justify-center pointer-events-auto"
              >
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(25);
                    setIsCreateSpeedDialOpen(false);
                    setIsFabSpeedDialOpen(!isFabSpeedDialOpen);
                    if (isFabSpeedDialOpen) {
                      setIsFabExportSubmenuOpen(false);
                    }
                  }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer border focus:outline-none shadow-md",
                    isFabSpeedDialOpen
                      ? "bg-slate-900 dark:bg-zinc-800 text-blue-400 border-blue-500/40 ring-2 ring-blue-500/30"
                      : "bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 border-slate-700/50 dark:border-zinc-700/60"
                  )}
                  title={isFabSpeedDialOpen ? "Close Actions Menu" : "Project Data Actions (Import / Export)"}
                >
                  <ArrowUpDown 
                    size={20} 
                    className={cn(
                      "transition-transform duration-300", 
                      isFabSpeedDialOpen ? "rotate-180 scale-110 text-blue-400" : ""
                    )} 
                  />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data Actions Speed Dial Animated Options */}
          <AnimatePresence>
            {isFabSpeedDialOpen && !isCreateSpeedDialOpen && (
              <>
                {/* 1. Import FAB Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.03 }}
                  className="absolute bottom-[128px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Import Project (.json)
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      fileInputRef.current?.click();
                      setIsFabSpeedDialOpen(false);
                      setIsFabExportSubmenuOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    title="Import Project / Workspace (.json)"
                  >
                    <UploadCloud size={19} />
                  </button>
                </motion.div>

                {/* 2. Export FAB Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.07 }}
                  className="absolute bottom-[184px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  {/* Export Options Popover Menu */}
                  <AnimatePresence>
                    {isFabExportSubmenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full mr-3 bottom-0 w-60 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 flex flex-col p-1 font-sans overflow-hidden"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-900 mb-1">
                          Export Options
                        </div>
                        {activeProject && (
                          <button
                            onClick={() => {
                              handleExportProject(activeProject);
                              setIsFabExportSubmenuOpen(false);
                              setIsFabSpeedDialOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <Folder size={15} className="text-blue-500 shrink-0" />
                            <div className="truncate flex-1">
                              <div className="font-semibold truncate">Export "{activeProject.name}"</div>
                              <div className="text-[10px] text-slate-400">Single project JSON file</div>
                            </div>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleExportAllProjects();
                            setIsFabExportSubmenuOpen(false);
                            setIsFabSpeedDialOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <Layers size={15} className="text-purple-500 shrink-0" />
                          <div className="truncate flex-1">
                            <div className="font-semibold">Export All Projects</div>
                            <div className="text-[10px] text-slate-400">{projects.length} projects workspace backup</div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Export Options
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      setIsFabExportSubmenuOpen(!isFabExportSubmenuOpen);
                    }}
                    className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-white shadow-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    title="Export Options"
                  >
                    <DownloadCloud size={19} />
                  </button>
                </motion.div>

                {/* 3. Close Data Actions Menu Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25, delay: 0.11 }}
                  className="absolute bottom-[240px] right-0 w-14 h-11 flex items-center justify-center pointer-events-auto"
                >
                  <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-slate-700/50 dark:border-zinc-800 shadow-md backdrop-blur-sm pointer-events-none select-none whitespace-nowrap">
                    Close Menu
                  </span>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(15);
                      setIsFabSpeedDialOpen(false);
                      setIsFabExportSubmenuOpen(false);
                    }}
                    className="w-11 h-11 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-zinc-700 focus:outline-none"
                    title="Close"
                  >
                    <X size={19} />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync('src/App.tsx', newContent);
console.log("Successfully replaced FAB logic!");
