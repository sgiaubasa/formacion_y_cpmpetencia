import { getAllOnlineForms } from "@/lib/onlineForms";
import { ResponderFormClient } from "./ResponderFormClient";

export default async function ResponderFormPage({
  params
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const allForms = await getAllOnlineForms();
  const form = allForms.find((f) => f.id === formId);

  if (!form) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center", padding: "2rem" }}>
        <img src="/logo.png" alt="AUBASA" style={{ width: "160px", marginBottom: "1rem" }} />
        <h2 style={{ color: "#1b365d" }}>Formulario no encontrado</h2>
        <p style={{ color: "#64748b" }}>
          El enlace del cuestionario al que intentás acceder no existe o ya no se encuentra disponible.
        </p>
      </div>
    );
  }

  return <ResponderFormClient form={form} />;
}
