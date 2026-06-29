function Menu({ page, setPage, deconnexion }) {

  return (

    <aside className="sidebar">

      <h2>OCF-EST</h2>

      <p>Gestion CFA</p>

      <button
        className={
          page === "dashboard"
            ? "active"
            : ""
        }
        onClick={() =>
          setPage("dashboard")
        }
      >
        📋 Tableau de bord
      </button>

      <button
        className={
          page === "nouveau"
            ? "active"
            : ""
        }
        onClick={() =>
          setPage("nouveau")
        }
      >
        ➕ Nouvelle inscription
      </button>

      <button
  className={
    page === "relance"
      ? "active"
      : ""
  }
  onClick={() =>
    setPage("relance")
  }
>
  ⚠ Dossiers à relancer
</button>

<button
  className={
    page === "finalisees"
      ? "active"
      : ""
  }
  onClick={() =>
    setPage("finalisees")
  }
>
  📁 Candidatures finalisées
</button>

<button
  className={
    page === "sauvegarde"
      ? "active"
      : ""
  }
  onClick={() =>
    setPage("sauvegarde")
  }
>
  💾 Sauvegarde
</button>

      <button
        onClick={deconnexion}
        className="logout-menu"
      >
        🚪 Déconnexion
      </button>

    </aside>

  );

}

export default Menu;