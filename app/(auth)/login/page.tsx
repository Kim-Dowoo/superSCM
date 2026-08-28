import LoginForm from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="page-content">
      <section className="panel">
        <span className="eyebrow">AUTH</span>
        <h1>superSCM 로그인</h1>
        <p>월간 발주계획 시스템을 이용하려면 로그인하세요.</p>
        <LoginForm next={typeof next === 'string' ? next : ''} />
      </section>
    </main>
  );
}
