import { createClient } from "@supabase/supabase-js";

// Replace with your actual credentials
const SUPABASE_URL = "https://gmbzzgozabzggkfuobbc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYnp6Z296YWJ6Z2drZnVvYmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE4NDMsImV4cCI6MjA3NzI1Nzg0M30.UiBZQNCBH2G0qIyvwCM1-fsY4v6Xn95uk17DrzF5tC8";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("🔄 Testing Supabase connection...");

  // We'll call a simple API endpoint that doesn't require a specific table
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("❌ Connection failed:", error.message);
  } else {
    console.log("✅ Supabase is reachable and credentials are valid!");
  }
}

testConnection();
