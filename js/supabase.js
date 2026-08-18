/* =========================================
   MEP EAD
   SUPABASE.JS
========================================= */

const SUPABASE_URL =
    "https://ajftqcfxuphmwghimmlq.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZnRxY2Z4dXBobXdnaGltbWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjE4NTEsImV4cCI6MjEwMjAzNzg1MX0.0oSPcGnXYWEjLZZ-J_Dponr_X3qbI-1n_cohgqMxYg4";


/* =========================================
   CRIAR CLIENTE
========================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

window.supabaseClient = supabaseClient;


/* =========================================
   TESTE
========================================= */

console.log(
    "%cMEP EAD",
    "color:#ff2020;font-size:22px;font-weight:900;"
);

console.log(
    "%cSupabase conectado.",
    "color:#4ade80;font-size:13px;"
);