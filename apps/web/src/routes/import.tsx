import { createFileRoute } from "@tanstack/react-router";
import { ImportPage } from "@/components/takeout/import-page";

export const Route = createFileRoute("/import")({
  component: ImportPage,
});
