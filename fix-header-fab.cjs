const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix header right-side info
const headerOld = `                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <div className="relative flex items-center">`;

const headerNew = `                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <div className="relative flex items-center">`;

const headerEndOld = `                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                    <button onClick={() => setIsSearchExpanded(true)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-1" title="Search"><Search size={16} /></button>
                    <button onClick={handleShowTypeSelector} className="hidden md:flex p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1" title="New Task"><Plus size={16} /></button>
                  </div>`;

const headerEndNew = `                      <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                      <button onClick={() => setIsSearchExpanded(true)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-1" title="Search"><Search size={16} /></button>
                      <button onClick={handleShowTypeSelector} className="hidden md:flex p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1" title="New Task"><Plus size={16} /></button>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 pr-2 text-[9.5px] font-semibold text-slate-450 dark:text-slate-500 whitespace-nowrap overflow-hidden">
                      <span>{filteredTasks.length} {activeTab === "sql" ? "sql" : "funcs"}</span>
                      <span className="text-slate-300 dark:text-slate-800">•</span>
                      <span className="capitalize">{filter}</span>
                    </div>
                  </div>`;

// 2. Fix the FAB menus to remove the Close buttons and update the toggles.
const fabOld = `{/* Create Speed Dial Animated Options (SQL Query, Edge Function, Close) */}
          <AnimatePresence>
            {isCreateSpeedDialOpen && (
              <>
                {/* 1. SQL Query Task Button */}`;

const fabNew = `{/* Create Speed Dial Animated Options (SQL Query, Edge Function) */}
          <AnimatePresence>
            {isCreateSpeedDialOpen && (
              <>
                {/* 1. SQL Query Task Button */}`;

const fabCloseOld1 = `{/* 3. Close Create Speed Dial Button */}
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
                </motion.div>`;

const fabCloseNew1 = ``; // Remove the close button

const fabCloseOld2 = `{/* 3. Close Data Actions Menu Button */}
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
                </motion.div>`;

const fabCloseNew2 = ``;

let newContent = content.replace(headerOld, headerNew);
newContent = newContent.replace(headerEndOld, headerEndNew);
newContent = newContent.replace(fabOld, fabNew);
newContent = newContent.replace(fabCloseOld1, fabCloseNew1);
newContent = newContent.replace(fabCloseOld2, fabCloseNew2);

fs.writeFileSync('src/App.tsx', newContent);
console.log("Replaced successfully");
