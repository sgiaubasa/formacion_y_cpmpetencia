"use client";

import { ProfileSignature } from "@/components/ProfileSignature";
import { saveProfileSignature } from "./acciones";

export function ProfileSignatureWrapper(props: {
  profileId: number,
  roleName: 'RRHH' | 'GerenteArea' | 'GerenteGeneral',
  roleTitle: string,
  existingSignature?: string | null,
  existingDate?: Date | null,
  existingEmail?: string | null,
  canSign: boolean,
}) {
  const handleSave = async (role: string, signatureData: string) => {
    try {
      await saveProfileSignature(props.profileId, role, signatureData);
      alert("Firma guardada correctamente.");
    } catch (e: any) {
      alert("Error al guardar la firma: " + e.message);
    }
  };

  return <ProfileSignature {...props} onSave={handleSave} />;
}
