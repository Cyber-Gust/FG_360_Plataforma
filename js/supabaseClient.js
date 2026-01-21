// js/supabaseClient.js

if (!supabaseUrl || !supabaseKey) {
  alert("Configure supabaseUrl e supabaseKey no config.js!");
  throw new Error("Supabase não configurado.");
}

window.supabaseClient =
  window.supabaseClient || window.supabase.createClient(supabaseUrl, supabaseKey);

// (opcional) se você quiser manter compatibilidade com código antigo:
window.supabase = window.supabaseClient;
