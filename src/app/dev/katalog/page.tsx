import { notFound } from "next/navigation";
import { KatalogClient } from "./katalog-client";

export default function DevKatalogPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <KatalogClient />;
}
