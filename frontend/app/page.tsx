import Link from "next/link";

export default function Home() {
  return (
    <div>
      <main>
        <h1>Welcome to the Home Page</h1>
        <Link href="/products">Go to Products Page</Link>
      </main>
    </div>
  );
}
