import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

  const SUPABASE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Supabase REST API 기본 연결 함수
    export async function supabaseRequest<T>(
      path: string,
        options: RequestInit = {}
        ): Promise<T> {
          if (!SUPABASE_URL || !SUPABASE_KEY) {
              throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
                }

                  const response = await fetch(
                      `${SUPABASE_URL}/rest/v1/${path}`,
                          {
                                ...options,
                                      headers: {
                                              apikey: SUPABASE_KEY,
                                                      'Content-Type': 'application/json',
                                                              ...options.headers,
                                                                    },
                                                                        }
                                                                          );

                                                                            if (!response.ok) {
                                                                                throw new Error(
                                                                                      `Supabase 요청 실패 (${response.status})`
                                                                                          );
                                                                                            }

                                                                                              if (response.status === 204) {
                                                                                                  return undefined as T;
                                                                                                    }

                                                                                                      return response.json() as Promise<T>;
                                                                                                      }


let authClient: SupabaseClient | undefined;

export function getSupabaseAuthClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  authClient ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return authClient;
}

export async function loginAdmin(username: string, password: string): Promise<void> {
  const client = getSupabaseAuthClient();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ username, password }),
    }
  );

  if (!response.ok) throw new Error('로그인 실패');

  const tokens: unknown = await response.json();
  if (
    !tokens || typeof tokens !== 'object' ||
    !('access_token' in tokens) || typeof tokens.access_token !== 'string' || !tokens.access_token ||
    !('refresh_token' in tokens) || typeof tokens.refresh_token !== 'string' || !tokens.refresh_token
  ) {
    throw new Error('로그인 실패');
  }

  const { data, error } = await client.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error || !data.session) throw new Error('로그인 실패');
}
