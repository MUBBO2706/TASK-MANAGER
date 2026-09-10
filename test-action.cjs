const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const file = fs.readFileSync('.env.example', 'utf8');
const supabaseUrl = file.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = file.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('version_backups').select('id, action, description').eq('id', '78e80035-0f42-481f-be55-de74493a4d59').then(r => console.log(r.data));
