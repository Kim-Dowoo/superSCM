import { logout } from '@/app/(auth)/login/actions';

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button className="button" type="submit">로그아웃</button>
    </form>
  );
}
