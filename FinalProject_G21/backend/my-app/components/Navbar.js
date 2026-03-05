import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <nav style={{ background: '#333', padding: '1rem', color: 'white' }}>
      <button onClick={() => router.push('/')}>首頁</button>
      <button onClick={() => router.push('/my-teams')}>我的組隊</button>
      <button onClick={() => router.push('/join')}>加入組隊</button>
      <button onClick={() => router.push('/applications')}>申請管理</button>
      <button onClick={() => router.push('/profile')}>個人資料</button>
      <button onClick={handleLogout} style={{ color: 'red' }}>登出</button>
    </nav>
  );
}