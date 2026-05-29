import Link from "next/link";
import TemplateEditor from "@/components/admin/TemplateEditor";

export default function NovoTemplatePage() {
  return (
    <div>
      <Link
        href="/admin/templates"
        className="text-xs font-semibold text-txt-2 hover:underline"
      >
        ← Templates
      </Link>
      <h1 className="mb-5 mt-2 text-lg font-bold">Novo template</h1>
      <TemplateEditor />
    </div>
  );
}
