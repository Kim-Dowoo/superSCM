'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/(auth)/login/actions';

const initialState: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction}>
      <input name="next" type="hidden" value={next} />
      <p>
        <label htmlFor="email">이메일</label>
        <br />
        <input autoComplete="email" id="email" name="email" required type="email" />
      </p>
      <p>
        <label htmlFor="password">비밀번호</label>
        <br />
        <input autoComplete="current-password" id="password" name="password" required type="password" />
      </p>
      {state.error ? <p className="text-critical" role="alert">{state.error}</p> : null}
      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
