import { useRouter } from "next/router";

export default function SubdomainPage() {
  const router = useRouter();
  const { subdomain } = router.query;

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Welcome, {subdomain}!</h1>
      <p>This is the user-specific page for the subdomain: {subdomain}</p>
    </div>
  );
}
