import { useEffect, useState } from "react";
import FicheCandidat from "./FicheCandidat";

const API_URL =
  `http://${window.location.hostname}:3001`;

function DossiersRelance() {

  const [candidats, setCandidats] = useState([]);
  const [documentsParCandidat, setDocumentsParCandidat] = useState({});
  const [candidatSelectionne, setCandidatSelectionne] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("Toutes");
  const [chargement, setChargement] = useState(true);

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
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
      ...(estFormationAEPE(candidat)
        ? ["JDC / recensement"]
        : [])
    ];

  };

  const chargerDonnees = async () => {

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

      const candidatsARelancer = data.filter(c =>
        (c.statut || "En attente") === "En attente" ||
        c.statut === "Incomplet"
      );

      const docsTemp = {};

      await Promise.all(
        candidatsARelancer.map(async (candidat) => {

          try {

            const docsResponse = await fetch(
              `${API_URL}/documents/${candidat.id}`
            );

            if (docsResponse.ok) {

              const docs = await docsResponse.json();

              docsTemp[candidat.id] = docs;

            } else {

              docsTemp[candidat.id] = [];

            }

          } catch {

            docsTemp[candidat.id] = [];

          }

        })
      );

      setDocumentsParCandidat(docsTemp);
      setCandidats(candidatsARelancer);

    } catch (error) {

      console.error("Erreur relances :", error);

      notifier(
        "Impossible de charger les dossiers à relancer",
        "error"
      );

    } finally {

      setChargement(false);

    }

  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const getDocumentsManquants = (candidat) => {

    const docs =
      documentsParCandidat[candidat.id] || [];

    const documentsPresents =
      docs.map(d => d.type_document);

    const documentsObligatoires =
      getDocumentsObligatoires(candidat);

    return documentsObligatoires.filter(
      doc => !documentsPresents.includes(doc)
    );

  };

  const ajouterHistorique = async (
    candidat,
    documentsManquants
  ) => {

    try {

      await fetch(
        `${API_URL}/historique`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${sessionStorage.getItem("token")}`
          },
          body: JSON.stringify({
            candidat_id: candidat.id,
            action:
              `Relance préparée - Documents manquants : ${documentsManquants.join(", ")}`
          })
        }
      );

    } catch (error) {

      console.log("Historique relance non enregistré");

    }

  };

  const preparerRelance = async (
    candidat,
    documentsManquants
  ) => {

    if (!candidat.email) {
      notifier("Aucune adresse email pour ce candidat", "warning");
      return;
    }

    if (documentsManquants.length === 0) {
      notifier("Le dossier est déjà complet", "info");
      return;
    }

    const sujet =
      "Dossier d'inscription incomplet - OCF-EST";

    const corps =
`Bonjour ${candidat.prenom || ""},

Votre dossier d'inscription à OCF-EST est actuellement incomplet.

Documents manquants :
${documentsManquants.map(doc => `- ${doc}`).join("\n")}

Merci de nous transmettre les pièces manquantes afin de finaliser votre dossier.

Cordialement,
OCF-EST`;

    const texteComplet =
`À : ${candidat.email}

Objet : ${sujet}

${corps}`;

    try {

      await navigator.clipboard.writeText(
        texteComplet
      );

      notifier(
        "Email de relance copié dans le presse-papier",
        "success"
      );

    } catch (error) {

      notifier(
        "Relance préparée, mais copie impossible",
        "warning"
      );

    }

    await ajouterHistorique(
      candidat,
      documentsManquants
    );

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(candidat.email)}` +
      `&su=${encodeURIComponent(sujet)}` +
      `&body=${encodeURIComponent(corps)}`;

    window.open(gmailUrl, "_blank");

  };

  const formationsDisponibles = [
    "Toutes",
    ...Array.from(
      new Set(
        candidats
          .map(c => c.code)
          .filter(Boolean)
      )
    )
  ];

  const aTelephone = (candidat) => {
    return candidat.telephone &&
      candidat.telephone.trim() !== "";
  };

  const candidatsFiltres = candidats
    .filter((candidat) => {

      const texte =
        `${candidat.nom || ""} ${candidat.prenom || ""} ${candidat.email || ""} ${candidat.telephone || ""} ${candidat.code || ""} ${candidat.libelle || ""}`
          .toLowerCase();

      const correspondRecherche =
        texte.includes(recherche.toLowerCase());

      const correspondFormation =
        filtreFormation === "Toutes" ||
        candidat.code === filtreFormation;

      return (
        correspondRecherche &&
        correspondFormation
      );

    })
    .sort((a, b) => {

      const manquantsA =
        getDocumentsManquants(a).length;

      const manquantsB =
        getDocumentsManquants(b).length;

      return manquantsB - manquantsA;

    });

  const totalDocumentsManquants =
    candidats.reduce((total, candidat) => {
      return total + getDocumentsManquants(candidat).length;
    }, 0);

  const totalSansEmail =
    candidats.filter(c => !c.email).length;

  const totalSansTelephone =
    candidats.filter(c => !aTelephone(c)).length;

  if (candidatSelectionne) {

    return (
      <FicheCandidat
        candidat={candidatSelectionne}
        retour={() => {
          setCandidatSelectionne(null);
          chargerDonnees();
        }}
        refresh={chargerDonnees}
      />
    );

  }

  return (

    <div className="container">

      <div className="header">

        <h1>⚠ Dossiers à relancer</h1>

        <p>
          Suivi des candidats avec dossier en attente ou incomplet
        </p>

      </div>

      <div className="dashboard-top">

        <div className="stat-card total">
          <span>📁</span>
          <div>
            <h3>{candidats.length}</h3>
            <p>Dossiers à relancer</p>
          </div>
        </div>


        <div className="stat-card attente">
          <span>📧</span>
          <div>
            <h3>{totalSansEmail}</h3>
            <p>Sans email</p>
          </div>
        </div>

        <div className="stat-card attente">
          <span>📞</span>
          <div>
            <h3>{totalSansTelephone}</h3>
            <p>Sans téléphone</p>
          </div>
        </div>

      </div>

      <div className="dashboard-actions">

        <button
          className="export-btn"
          onClick={() => {
            chargerDonnees();
            notifier("Dossiers actualisés", "success");
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

      <div className="filters">

        {formationsDisponibles.map((formation) => (

          <button
            key={formation}
            onClick={() =>
              setFiltreFormation(formation)
            }
            className={
              filtreFormation === formation
                ? "filter-active"
                : ""
            }
          >
            {formation}
          </button>

        ))}

      </div>

      {chargement && (

        <div className="empty-relance">
          Chargement des dossiers...
        </div>

      )}

      {!chargement && candidats.length === 0 && (

        <div className="empty-relance">
          ✅ Aucun dossier à relancer
        </div>

      )}

      {!chargement && candidats.length > 0 && candidatsFiltres.length === 0 && (

        <div className="empty-relance">
          Aucun dossier ne correspond à ta recherche
        </div>

      )}

      <div className="relance-grid">

        {candidatsFiltres.map(candidat => {

          const manquants =
            getDocumentsManquants(candidat);

          return (

            <div
              className="relance-card"
              key={candidat.id}
            >

              <div className="relance-card-header">

                <h3>
                  {candidat.nom} {candidat.prenom}
                </h3>

                <span
                  className={`badge badge-${(
                    candidat.statut || "En attente"
                  )
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {candidat.statut || "En attente"}
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
                📞 {candidat.telephone || "Téléphone non renseigné"}
              </p>

              {!aTelephone(candidat) && (

                <p className="dossier-warning">
                  ⚠ Numéro de téléphone manquant.
                </p>

              )}

              <p>
                ✉ {candidat.email || "Email non renseigné"}
              </p>

              {!candidat.email && (

                <p className="dossier-warning">
                  ⚠ Impossible de préparer une relance email sans adresse mail.
                </p>

              )}

              <div className="missing-docs">

                <strong>
                  Documents manquants :
                </strong>

                {manquants.length === 0 ? (

                  <p className="ok-doc">
                    Aucun document manquant
                  </p>

                ) : (

                  <ul>
                    {manquants.map(doc => (
                      <li key={doc}>
                        ❌ {doc}
                      </li>
                    ))}
                  </ul>

                )}

              </div>

              <div className="relance-actions">

                <button
                  className="btn-view"
                  onClick={() =>
                    setCandidatSelectionne(candidat)
                  }
                >
                  👁 Voir dossier
                </button>

                <button
                  className="btn-relance-small"
                  disabled={!candidat.email || manquants.length === 0}
                  onClick={() =>
                    preparerRelance(candidat, manquants)
                  }
                >
                  📧 Préparer relance
                </button>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}

export default DossiersRelance;