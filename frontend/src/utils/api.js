const API_URL =
  `http://${window.location.hostname}:3001`;

export async function apiFetch(route, options = {}) {

  const token =
    sessionStorage.getItem("token");

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_URL}${route}`,
    {
      ...options,
      headers
    }
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("role");

    if (window.showToast) {
      window.showToast(
        "Session expirée, reconnecte-toi.",
        "warning"
      );
    }

    setTimeout(() => {
      window.location.reload();
    }, 900);

    throw new Error("Session expirée");

  }

  return response;

}