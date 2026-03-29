// Không cần @supabase/supabase-js
// Supabase OAuth hoạt động qua URL redirect thuần

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || "https://sautvlazbocyvirdzuvl.supabase.co";

// Redirect sang Google OAuth
export const signInWithGoogle = () => {
  const redirectTo = encodeURIComponent(`${window.location.origin}/auth/callback`);
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
};

// Redirect sang Facebook OAuth
export const signInWithFacebook = () => {
  const redirectTo = encodeURIComponent(`${window.location.origin}/auth/callback`);
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=facebook&redirect_to=${redirectTo}`;
};

// Parse access_token từ URL hash sau khi Supabase redirect về
// Supabase trả: /auth/callback#access_token=xxx&token_type=bearer&...
export const parseTokenFromHash = () => {
  const hash   = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token"),
    error:       params.get("error"),
    errorDesc:   params.get("error_description"),
  };
};