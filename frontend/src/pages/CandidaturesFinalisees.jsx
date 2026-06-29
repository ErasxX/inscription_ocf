import { useEffect, useState } from "react";
import FicheCandidat from "./FicheCandidat";

const API_URL =
  `http://${window.location.hostname}:3001`;

function CandidaturesFinalisees() {

  const [candidats, setCandidats] = useState([]);
  const [candidatSelectionne, setCandidatSelectionne] = useState(null);
  const [filtre, setFiltre] = useState("Tous");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }

  };

  const chargerCandidats = async () => {

    try {

      setChargement(true);

      const response = await fetch(
        `${API_URL}/candidats`
      );

      if (!response.ok) {
        notifier("Erreur lors du chargement des candidats", "error");
        return;
      }

      const data = await response.json();

      const finalises = data.filter(c =>
        c.statut === "Valide" ||
        c.statut === "Refuse"
      );

      setCandidats(finalises);

    } catch (error) {

      console.error("Erreur candidatures finalisées :", error);

      notifier(
        "Impossible de charger les candidatures finalisées",
        "error"
      );

    } finally {

      setChargement(false);

    }

  };

  useEffect(() => {
    chargerCandidats();
  }, []);

  const candidatsFiltres = candidats.filter(c => {

    const texte =
      `${c.nom || ""} ${c.prenom || ""} ${c.email || ""} ${c.telephone || ""} ${c.code || ""} ${c.libelle || ""} ${c.statut || ""}`
        .toLowerCase();

    const correspondRecherche =
      texte.includes(recherche.toLowerCase());

    const correspondFiltre =
      filtre === "Tous" ||
      c.statut === filtre;

    return (
      correspondRecherche &&
      correspondFiltre
    );

  });

  const totalValides = candidats.filter(
    c => c.statut === "Valide"
  ).length;

  const totalRefuses = candidats.filter(
    c => c.statut === "Refuse"
  ).length;

  if (candidatSelectionne) {

    return (
      <FicheCandidat
        candidat={candidatSelectionne}
        retour={() => {
          setCandidatSelectionne(null);
          chargerCandidats();
        }}
        refresh={chargerCandidats}
      />
    );

  }

  return (

    <div className="finalisees-page">

      <div className="finalisees-header">

        <div>
          <h1>📁 Candidatures finalisées</h1>

          <p>
            Liste des dossiers validés ou refusés
          </p>
        </div>

      </div>

      <div className="finalisees-stats">

        <div className="finalisee-stat-card valide-card">
          <h2>{totalValides}</h2>
          <p>✅ Validés</p>
        </div>

        <div className="finalisee-stat-card refuse-card">
          <h2>{totalRefuses}</h2>
          <p>❌ Refusés</p>
        </div>

        <div className="finalisee-stat-card total-card">
          <h2>{candidats.length}</h2>
          <p>📁 Total finalisés</p>
        </div>

      </div>

      <div className="dashboard-actions">

        <button
          className="export-btn"
          onClick={() => {
            chargerCandidats();
            notifier("Candidatures finalisées actualisées", "success");
          }}
        >
          🔄 Actualiser
        </button>

      </div>

      <input
        className="search"
        type="text"
        placeholder="🔎 Rechercher par nom, prénom, email, téléphone ou formation..."
        value={recherche}
        onChange={(e) =>
          setRecherche(e.target.value)
        }
      />

      <div className="finalisees-filtres">

        <button
          className={filtre === "Tous" ? "active" : ""}
          onClick={() => setFiltre("Tous")}
        >
          Tous
        </button>

        <button
          className={filtre === "Valide" ? "active" : ""}
          onClick={() => setFiltre("Valide")}
        >
          Validés
        </button>

        <button
          className={filtre === "Refuse" ? "active" : ""}
          onClick={() => setFiltre("Refuse")}
        >
          Refusés
        </button>

      </div>

      {chargement && (

        <div className="empty-finalisees">
          Chargement des candidatures finalisées...
        </div>

      )}

      {!chargement && candidats.length === 0 && (

        <div className="empty-finalisees">
          Aucun dossier finalisé pour le moment
        </div>

      )}

      {!chargement && candidats.length > 0 && candidatsFiltres.length === 0 && (

        <div className="empty-finalisees">
          Aucun dossier ne correspond à ta recherche
        </div>

      )}

      {!chargement && candidatsFiltres.length > 0 && (

        <div className="finalisees-grid">

          {candidatsFiltres.map(candidat => (

            <div
              className="finalisee-card"
              key={candidat.id}
            >

              <div className="finalisee-card-header">

                <h3>
                  {candidat.nom} {candidat.prenom}
                </h3>

                <span
                  className={`badge badge-${(
                    candidat.statut || ""
                  )
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {candidat.statut}
                </span>

              </div>

              <p>
                🎓{" "}
                <strong>
                  {candidat.code || "Formation non renseignée"}
                </strong>
              </p>

              {candidat.libelle && (

                <p>
                  {candidat.libelle}
                </p>

              )}

              <p>
                📞 {candidat.telephone || "-"}
              </p>

              <p>
                ✉ {candidat.email || "-"}
              </p>

              <p>
                🗓 Dossier créé le :{" "}
                {candidat.date_creation
                  ? new Date(
                      candidat.date_creation
                    ).toLocaleDateString("fr-FR")
                  : "-"}
              </p>

              <button
                className="btn-view"
                onClick={() =>
                  setCandidatSelectionne(candidat)
                }
              >
                👁 Voir dossier
              </button>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}

export default CandidaturesFinalisees;