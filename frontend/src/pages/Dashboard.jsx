import { useEffect, useState } from "react";
import FicheCandidat from "./FicheCandidat";
import { apiFetch } from "../utils/api";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const API_URL =
  `http://${window.location.hostname}:3001`;

function Dashboard() {

  const [candidats, setCandidats] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [candidatSelectionne, setCandidatSelectionne] = useState(null);

  const [stats, setStats] = useState([]);
  const [statsStatuts, setStatsStatuts] = useState([]);

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }

  };

  const COLORS = [
    "#1f4e79",
    "#28a745",
    "#ffc107",
    "#dc3545",
    "#6f42c1",
    "#17a2b8",
    "#fd7e14",
    "#20c997"
  ];

  const getStatutColor = (statut) => {

    switch (statut) {

      case "En attente":
        return "#ffc107";

      case "Incomplet":
        return "#fd7e14";

      case "Complet":
        return "#17a2b8";

      case "Valide":
        return "#28a745";

      case "Refuse":
        return "#dc3545";

      default:
        return "#6c757d";

    }

  };

  const chargerCandidats = () => {

    fetch(`${API_URL}/candidats`)
      .then(res => res.json())
      .then(data => setCandidats(data))
      .catch(() => {
        notifier("Erreur lors du chargement des candidats", "error");
      });

  };

  const chargerStats = () => {

    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {
        notifier("Erreur lors du chargement des statistiques", "error");
      });

  };

  const chargerStatsStatuts = () => {

    fetch(`${API_URL}/stats/statuts`)
      .then(res => res.json())
      .then(data => setStatsStatuts(data))
      .catch(() => {
        notifier("Erreur lors du chargement des statuts", "error");
      });

  };

  useEffect(() => {
    chargerCandidats();
    chargerStats();
    chargerStatsStatuts();
  }, []);

  const statsFormationsFiltrees =
    stats.filter(item =>
      Number(item.total) > 0
    );

  const statsStatutsFiltres =
    statsStatuts.filter(item =>
      Number(item.total) > 0
    );

  const afficherLabel = ({ value }) => {

    if (!value || Number(value) <= 0) {
      return "";
    }

    return value;

  };

  const candidatsFiltres = candidats.filter((c) => {

    const texte =
      `${c.nom || ""} ${c.prenom || ""} ${c.code || ""} ${c.libelle || ""} ${c.email || ""} ${c.telephone || ""} ${c.statut || ""}`
        .toLowerCase();

    const correspondRecherche =
      texte.includes(recherche.toLowerCase());

    const correspondStatut =
      filtreStatut === "Tous" ||
      (c.statut || "En attente") === filtreStatut;

    return correspondRecherche && correspondStatut;

  });

  const totalEnAttente = candidats.filter(
    c => (c.statut || "En attente") === "En attente"
  ).length;

  const totalIncomplet = candidats.filter(
    c => c.statut === "Incomplet"
  ).length;

  const totalComplet = candidats.filter(
    c => c.statut === "Complet"
  ).length;

  const supprimer = async (id) => {

    const confirmation = window.confirm(
      "Supprimer ce candidat ?"
    );

    if (!confirmation) return;

    try {

      const response = await apiFetch(
        `/candidats/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        notifier("Erreur lors de la suppression du candidat", "error");
        return;
      }

      notifier("Candidat supprimé avec succès", "success");

      chargerCandidats();
      chargerStats();
      chargerStatsStatuts();

    } catch (error) {

      if (error.message !== "Session expirée") {
        notifier("Impossible de contacter le serveur", "error");
      }

    }

  };

  const safe = (valeur) => {

    if (valeur === null || valeur === undefined) {
      return "";
    }

    return String(valeur);

  };

  const formatDate = (date) => {

    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleDateString("fr-FR");
    } catch {
      return date;
    }

  };

  const estFormationAEPE = (candidat) => {

    return (
      (candidat.code || "").includes("AEPE") ||
      (candidat.libelle || "").includes("AEPE") ||
      (candidat.code || "").includes("IEPE") ||
      (candidat.libelle || "").includes("IEPE")
    );

  };

  const getDocumentsObligatoires = (candidat) => {

    return [
      "CV",
      "Carte identité",
      "Carte vitale",
      "Diplôme",
      "Photo",
      ...(estFormationAEPE(candidat) ? ["JDC / recensement"] : [])
    ];

  };

  const getDocumentsManquants = async (candidat) => {

    try {

      const response = await fetch(
        `${API_URL}/documents/${candidat.id}`
      );

      const documents = await response.json();

      const documentsPresents =
        documents.map(d => d.type_document);

      const documentsObligatoires =
        getDocumentsObligatoires(candidat);

      const manquants =
        documentsObligatoires.filter(
          doc => !documentsPresents.includes(doc)
        );

      return manquants;

    } catch {

      return ["Erreur chargement documents"];

    }

  };

  const exporterExcel = async () => {

    if (candidatsFiltres.length === 0) {
      notifier("Aucun candidat à exporter", "warning");
      return;
    }

    try {

      const dateExport =
        new Date().toLocaleDateString("fr-FR");

      const heureExport =
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit"
        });

      const lignesCandidats =
        await Promise.all(
          candidatsFiltres.map(async (c) => {

            const documentsManquants =
              await getDocumentsManquants(c);

            return [
              safe(c.nom).toUpperCase(),
              safe(c.prenom),
              safe(c.code),
              safe(c.libelle),
              safe(c.statut || "En attente"),
              safe(c.telephone),
              safe(c.email),
              safe(c.situation_actuelle),
              safe(c.demandeur_emploi),
              safe(c.permis_b),
              safe(c.vehicule),
              safe(c.derniere_classe),
              safe(c.dernier_diplome_obtenu),
              safe(c.nom_etablissement),
              safe(c.disponibilite_immediate),
              formatDate(c.date_disponibilite),
              formatDate(c.date_entretien),
              safe(c.conseiller_formation),
              documentsManquants.length === 0
                ? "Aucun"
                : documentsManquants.join(", "),
              formatDate(c.date_creation)
            ];

          })
        );

      const donnees = [
        ["Export des candidatures OCF-EST"],
        [`Date d’export : ${dateExport} à ${heureExport}`],
        [`Nombre de candidats exportés : ${candidatsFiltres.length}`],
        [],
        [
          "Nom",
          "Prénom",
          "Formation",
          "Libellé formation",
          "Statut",
          "Téléphone",
          "Email",
          "Situation actuelle",
          "Demandeur emploi",
          "Permis B",
          "Véhiculé",
          "Dernière classe suivie",
          "Dernier diplôme obtenu",
          "Dernier établissement",
          "Disponibilité immédiate",
          "Date disponibilité",
          "Date entretien",
          "Conseiller formation",
          "Documents manquants",
          "Date création dossier"
        ],
        ...lignesCandidats
      ];

      const feuille =
        XLSX.utils.aoa_to_sheet(donnees);

      feuille["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: 19 }
        },
        {
          s: { r: 1, c: 0 },
          e: { r: 1, c: 19 }
        },
        {
          s: { r: 2, c: 0 },
          e: { r: 2, c: 19 }
        }
      ];

      feuille["!cols"] = [
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 35 },
        { wch: 15 },
        { wch: 16 },
        { wch: 28 },
        { wch: 22 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 24 },
        { wch: 28 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 45 },
        { wch: 18 }
      ];

      feuille["!autofilter"] = {
        ref: `A5:T${donnees.length}`
      };

      const classeur =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        classeur,
        feuille,
        "Candidatures"
      );

      const excelBuffer = XLSX.write(classeur, {
        bookType: "xlsx",
        type: "array"
      });

      const fichier = new Blob(
        [excelBuffer],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      );

      const dateFichier =
        new Date()
          .toISOString()
          .slice(0, 10);

      saveAs(
        fichier,
        `Export_Candidatures_OCF_EST_${dateFichier}.xlsx`
      );

      notifier("Export Excel généré avec succès", "success");

    } catch (error) {

      console.error(error);
      notifier("Erreur lors de la génération de l’export Excel", "error");

    }

  };

  if (candidatSelectionne) {

    return (
      <FicheCandidat
        candidat={candidatSelectionne}
        retour={() => {
          chargerCandidats();
          chargerStats();
          chargerStatsStatuts();
          setCandidatSelectionne(null);
        }}
        refresh={() => {
          chargerCandidats();
          chargerStats();
          chargerStatsStatuts();
        }}
      />
    );

  }

  return (

    <div className="container">

      <div className="header">

        <h1>
          Gestion des inscriptions CFA
        </h1>

        <p>
          OCF-EST
        </p>

      </div>

      <div className="dashboard-top">

        <div className="stat-card total">
          <span>📋</span>
          <div>
            <h3>{candidats.length}</h3>
            <p>Total dossiers</p>
          </div>
        </div>

        <div className="stat-card attente">
          <span>🟡</span>
          <div>
            <h3>{totalEnAttente}</h3>
            <p>En attente</p>
          </div>
        </div>

        <div className="stat-card incomplet">
          <span>🟠</span>
          <div>
            <h3>{totalIncomplet}</h3>
            <p>Incomplets</p>
          </div>
        </div>

        <div className="stat-card complet">
          <span>🔵</span>
          <div>
            <h3>{totalComplet}</h3>
            <p>Complets</p>
          </div>
        </div>

      </div>

      <div className="dashboard-actions">

        <button
          onClick={exporterExcel}
          className="export-btn"
        >
          📊 Export Excel
        </button>

      </div>

      <div className="charts-grid">

        <div className="chart-card">

          <h3>
            📊 Répartition des formations
          </h3>

          <div className="chart-box">

            {statsFormationsFiltrees.length === 0 ? (

              <div className="empty-chart">
                Aucune donnée à afficher
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={statsFormationsFiltrees}
                    dataKey="total"
                    nameKey="code"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={afficherLabel}
                  >

                    {statsFormationsFiltrees.map((entry, index) => (

                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />

                    ))}

                  </Pie>

                  <Tooltip />
                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

        <div className="chart-card">

          <h3>
            📊 Répartition des statuts
          </h3>

          <div className="chart-box">

            {statsStatutsFiltres.length === 0 ? (

              <div className="empty-chart">
                Aucune donnée à afficher
              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={statsStatutsFiltres}
                    dataKey="total"
                    nameKey="statut"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={afficherLabel}
                  >

                    {statsStatutsFiltres.map((entry, index) => (

                      <Cell
                        key={index}
                        fill={getStatutColor(entry.statut)}
                      />

                    ))}

                  </Pie>

                  <Tooltip />
                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            )}

          </div>

        </div>

      </div>

      <input
        className="search"
        type="text"
        placeholder="🔎 Rechercher un candidat..."
        value={recherche}
        onChange={(e) =>
          setRecherche(e.target.value)
        }
      />

      <div className="filters">

        {[
          "Tous",
          "En attente",
          "Incomplet",
          "Complet",
          "Valide",
          "Refuse"
        ].map((statut) => (

          <button
            key={statut}
            onClick={() =>
              setFiltreStatut(statut)
            }
            className={
              filtreStatut === statut
                ? "filter-active"
                : ""
            }
          >
            {statut}
          </button>

        ))}

      </div>

      <div className="cards">

        {candidatsFiltres.map(c => (

          <div
            className="card"
            key={c.id}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >

              <h3>
                {c.nom} {c.prenom}
              </h3>

              <span
                className={`badge badge-${(
                  c.statut || "En attente"
                )
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {c.statut || "En attente"}
              </span>

            </div>

            <p>
              🎓 <strong>
                {c.code || "Formation non renseignée"}
              </strong>
            </p>

            <p>
              📞 {c.telephone || "-"}
            </p>

            <p>
              ✉ {c.email || "-"}
            </p>

            <p>
              📅 {
                c.date_creation
                  ? new Date(
                      c.date_creation
                    ).toLocaleDateString("fr-FR")
                  : "-"
              }
            </p>

            <div className="actions">

              <button
                className="btn-view"
                onClick={() =>
                  setCandidatSelectionne(c)
                }
              >
                👁 Voir dossier
              </button>

              <button
                className="btn-delete"
                onClick={() =>
                  supprimer(c.id)
                }
              >
                🗑 Supprimer
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default Dashboard;