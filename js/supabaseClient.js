if (!supabaseUrl || !supabaseKey) {
  alert("Configure supabaseUrl e supabaseKey no config.js!");
  throw new Error("Supabase não configurado.");
}

// ✅ Não sobrescreve window.supabase (biblioteca)
window.supabaseClient =
  window.supabaseClient || window.supabase.createClient(supabaseUrl, supabaseKey);
