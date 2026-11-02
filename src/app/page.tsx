"use client";

import dynamic from "next/dynamic";

// Conversations live in localStorage, so the app renders only on the client.
const App = dynamic(() => import("@/components/App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="h-dvh bg-bg" />,
});

export default function Page() {
  return <App />;
}
