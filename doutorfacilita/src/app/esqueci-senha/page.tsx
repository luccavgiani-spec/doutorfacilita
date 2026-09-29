import type { Metadata } from "next";
import EsqueciSenhaForm from "./EsqueciSenhaForm";

export const metadata: Metadata = { title: "Esqueci minha senha" };

// Rota pública: não exige nem redireciona sessão.
export default function EsqueciSenhaPage() {
  return <EsqueciSenhaForm />;
}
