if (!supabaseUrl || !supabaseKey) {
  alert("Configure supabaseUrl e supabaseKey no config.js!");
  throw new Error("Supabase não configurado.");
}

window.supabaseClient =
  window.supabaseClient ||
  window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
