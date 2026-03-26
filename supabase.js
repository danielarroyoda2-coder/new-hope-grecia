import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rnprljszoiykpqknuekz.supabase.co";
const supabaseKey = "sb_publishable_ZGaw6GYI33V9jWGUEOeDfg_eveD6VW3";

export const supabase = createClient(supabaseUrl, supabaseKey);
