const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables
const file = fs.readFileSync('.env', 'utf8');
const supabaseUrl = file.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = file.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('version_backups').select('id, action, state_before, state_after').eq('id', '78e80035-0f42-481f-be55-de74493a4d59');
  console.log("DB response keys for 78e80035:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("state_before tasks count:", data[0].state_before?.tasks?.length);
    console.log("state_after tasks count:", data[0].state_after?.tasks?.length);
    
    // Check if task 57b8f exists in both
    const tBefore = data[0].state_before?.tasks?.find(t => t.id === '57b8fdeb-df41-4cb0-85c8-09e38c1c3489');
    const tAfter = data[0].state_after?.tasks?.find(t => t.id === '57b8fdeb-df41-4cb0-85c8-09e38c1c3489');
    console.log("tBefore found:", !!tBefore, "sql length:", tBefore?.sql?.length);
    console.log("tAfter found:", !!tAfter, "sql length:", tAfter?.sql?.length);
  }
}
run();
