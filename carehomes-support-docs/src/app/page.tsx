import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 40 }}>
      <h1>CareHomes MVP</h1>
      <p>System is running 🚀</p>

      <ul>
        <li>
          <Link href="/auth/signup">Signup</Link>
        </li>
        <li>
          <Link href="/auth/login">Login</Link>
        </li>
        <li>
          <Link href="/pricing">Pricing</Link>
        </li>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
      </ul>
    </main>
  );
}