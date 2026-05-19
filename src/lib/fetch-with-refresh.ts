/**
 * Wrapper de fetch côté client qui rejoue automatiquement la requête
 * après un appel à POST /api/auth/refresh si une réponse 401 est reçue.
 *
 * Pourquoi : l'access cookie a une durée de vie courte (15 min par
 * défaut) tandis que le refresh cookie dure 7 jours. Sans ce wrapper,
 * l'utilisateur reste sur la page mais ses mutations échouent
 * silencieusement dès que les 15 minutes sont écoulées, alors qu'on
 * pourrait rafraîchir le cookie de manière transparente.
 *
 * La logique est volontairement simple : un seul retry, pas de file
 * d'attente partagée. Si deux requêtes échouent simultanément avec 401,
 * on déclenchera deux refresh — ce n'est pas optimal mais sans impact
 * fonctionnel (le 2e refresh écrasera juste le cookie avec une nouvelle
 * valeur valide).
 */

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Libère la promesse après un court délai pour absorber les
      // requêtes parallèles qui auraient pu déclencher un second refresh.
      setTimeout(() => {
        refreshInFlight = null;
      }, 100);
    }
  })();
  return refreshInFlight;
}

export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshed = await tryRefresh();
  if (!refreshed) return res;

  // Retry une fois avec les nouveaux cookies
  return fetch(input, init);
}
