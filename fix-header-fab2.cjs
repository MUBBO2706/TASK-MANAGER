const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The problematic unclosed div is here:
const searchString = `                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <div className="relative flex items-center">`;
                      
// I will just replace it back to what it was:
const replaceBack = `                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <div className="relative flex items-center">`;

content = content.replace(searchString, replaceBack);

// Now let's do it cleanly for real this time:
const theTarget = `                  <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                    <div className="relative flex items-center">
                      <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}`;
                        
const replaceTarget = `                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <div className="relative flex items-center">
                        <button
                          onClick={() => setIsFilterOpen(!isFilterOpen)}`;

content = content.replace(theTarget, replaceTarget);

const theEndTarget = `                    </div>
                    
                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />

                    <button onClick={() => setIsSearchExpanded(true)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-1" title="Search"><Search size={16} /></button>
                    <button onClick={handleShowTypeSelector} className="hidden md:flex p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1" title="New Task"><Plus size={16} /></button>
                  </div>
                </motion.div>`;

const replaceEndTarget = `                    </div>
                    
                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />

                    <button onClick={() => setIsSearchExpanded(true)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ml-1" title="Search"><Search size={16} /></button>
                    <button onClick={handleShowTypeSelector} className="hidden md:flex p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ml-1" title="New Task"><Plus size={16} /></button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-0.5 pr-2 text-[9.5px] font-semibold text-slate-450 dark:text-slate-500 whitespace-nowrap overflow-hidden">
                    <span>{filteredTasks.length} {activeTab === "sql" ? "sql" : "funcs"}</span>
                    <span className="text-slate-300 dark:text-slate-800">•</span>
                    <span className="capitalize">{filter}</span>
                  </div>
                </div>
              </motion.div>`;

content = content.replace(theEndTarget, replaceEndTarget);
fs.writeFileSync('src/App.tsx', content);
