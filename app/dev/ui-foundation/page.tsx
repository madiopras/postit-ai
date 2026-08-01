import { notFound } from "next/navigation";

import { FoundationDemo } from "@/components/untitled/foundation-demo";

export default function UiFoundationPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <FoundationDemo />;
}

