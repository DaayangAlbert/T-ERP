import { redirect } from "next/navigation";

// L'auth candidat est unifiée avec celle des autres comptes (login via la
// modale de la landing). On redirige les anciens liens / bookmarks vers /.
// La queryparam `?login=1` ouvre automatiquement la modale en mode connexion.
export default function CandidateLoginRedirect() {
  redirect("/?login=1");
}
