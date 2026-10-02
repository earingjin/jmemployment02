
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
                                                                                                      