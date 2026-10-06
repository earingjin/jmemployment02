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
  const tokens = await requestAdminSession(username, password);
  const { data, error } = await client.auth.setSession(tokens);
  if (error || !data.session) throw new Error('로그인 실패');
}

async function requestAdminSession(username: string, password: string) {
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

  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}


export class PasswordChangeError extends Error {}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  confirmChange: () => boolean
): Promise<boolean> {
  const client = getSupabaseAuthClient();
  const { data: current, error: sessionError } = await client.auth.getSession();
  if (sessionError || !current.session) {
    throw new PasswordChangeError('로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.');
  }

  try {
    const tokens = await requestAdminSession('admin', currentPassword);
    // Verify the account before replacing the session with the fresh login.
    const { data: verified, error: verifyError } = await client.auth.getUser(tokens.access_token);
    if (verifyError || !verified.user || verified.user.id !== current.session.user.id) {
      throw new Error('재인증 실패');
    }
    const { data, error } = await client.auth.setSession(tokens);
    if (error || !data.session || data.session.user.id !== current.session.user.id) {
      throw new Error('재인증 실패');
    }
  } catch {
    throw new PasswordChangeError('현재 비밀번호를 확인해주세요.');
  }

  if (!confirmChange()) return false;

  try {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error || !data.user) throw new Error('변경 실패');
  } catch {
    throw new PasswordChangeError('비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  return true;
}
