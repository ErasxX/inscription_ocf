import { useEffect, useState } from "react";
import ModifierCandidat from "./ModifierCandidat";
import { jsPDF } from "jspdf";
import { apiFetch } from "../utils/api";

const API_URL =
  `http://${window.location.hostname}:3001`;

function FicheCandidat({ candidat, retour, refresh }) {

  const [modeEdition, setModeEdition] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [fichier, setFichier] = useState(null);
  const [historique, setHistorique] = useState([]);

  const [statut, setStatut] = useState(
    candidat.statut || "En attente"
  );

  const [typeDocument, setTypeDocument] = useState("CV");

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }

  };

  const estFormationAEPE =
    (candidat.code || "").includes("AEPE") ||
    (candidat.libelle || "").includes("AEPE") ||
    (candidat.code || "").includes("IEPE") ||
    (candidat.libelle || "").includes("IEPE");

  const documentsObligatoires = [
    "CV",
    "Carte identité",
    "Carte vitale",
    "Diplôme",
    "Photo",
    ...(estFormationAEPE
      ? ["JDC / recensement"]
      : [])
  ];

  const documentsPresents =
    documents.map(d => d.type_document);

  const documentsManquants =
    documentsObligatoires.filter(
      doc => !documentsPresents.includes(doc)
    );

  useEffect(() => {

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant"
    });

    chargerDocuments();
    chargerHistorique();

  }, [candidat]);

  const chargerDocuments = async () => {

    try {

      const response = await fetch(
        `${API_URL}/documents/${candidat.id}`
      );

      if (!response.ok) {
        notifier("Erreur chargement documents", "error");
        return;
      }

      const data = await response.json();

      setDocuments(data);

    } catch (error) {

      notifier("Impossible de charger les documents", "error");

    }

  };

  const chargerHistorique = async () => {

    try {

      const response = await fetch(
        `${API_URL}/historique/${candidat.id}`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setHistorique(data);

    } catch (error) {

      console.log("Historique non chargé");

    }

  };

  const ajouterHistorique = async (action) => {

    try {

      await apiFetch(
  "/historique",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      candidat_id: candidat.id,
      action: action
    })
  }
);

      chargerHistorique();

    } catch (error) {

      console.log("Historique non enregistré");

    }

  };

  const envoyerDocument = async () => {

    if (!fichier) {
      notifier("Choisis un fichier avant d'envoyer", "warning");
      return;
    }

    try {

      const formData = new FormData();

      formData.append("candidat_id", candidat.id);
      formData.append("type_document", typeDocument);
      formData.append("document", fichier);

      const response = await apiFetch(
  "/documents",
  {
    method: "POST",
    body: formData
  }
);

      const result = await response.json();

      if (!response.ok) {
        notifier(
          result.message ||
          "Erreur lors de l'ajout du document",
          "error"
        );
        return;
      }

      if (result.statut) {
        setStatut(result.statut);
      }

      await chargerDocuments();

      setFichier(null);

      await ajouterHistorique(
        `Document ajouté : ${typeDocument}`
      );

      if (refresh) {
        refresh();
      }

      notifier(
        `Document ajouté. Statut : ${result.statut || "mis à jour"}`,
        "success"
      );

    } catch (error) {

      notifier(
        "Impossible de contacter le serveur",
        "error"
      );

    }

  };

  const supprimerDocument = async (
    documentId,
    typeDocumentSupprime
  ) => {

    const confirmation = window.confirm(
      "Supprimer ce document ?"
    );

    if (!confirmation) return;

    try {

      const response = await apiFetch(
  `/documents/${documentId}`,
  {
    method: "DELETE"
  }
);

      const result = await response.json();

      if (!response.ok) {
        notifier(
          result.message ||
          "Erreur lors de la suppression",
          "error"
        );
        return;
      }

      if (result.statut) {
        setStatut(result.statut);
      }

      await chargerDocuments();

      await ajouterHistorique(
        `Document supprimé : ${typeDocumentSupprime}`
      );

      if (refresh) {
        refresh();
      }

      notifier("Document supprimé", "success");

    } catch (error) {

      notifier(
        "Impossible de supprimer le document",
        "error"
      );

    }

  };

  const changerStatut = async (nouveauStatut) => {

    try {

      const response = await apiFetch(
  `/candidats/${candidat.id}/statut`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      statut: nouveauStatut
    })
  }
);

      const result = await response.json();

      if (!response.ok) {
        notifier(
          result.message ||
          "Erreur lors du changement de statut",
          "error"
        );
        return;
      }

      setStatut(nouveauStatut);

      await ajouterHistorique(
        `Statut modifié : ${nouveauStatut}`
      );

      if (refresh) {
        refresh();
      }

      notifier("Statut mis à jour", "success");

    } catch (error) {

      notifier(
        "Impossible de modifier le statut",
        "error"
      );

    }

  };

  const preparerRelance = async () => {

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
      `Relance préparée - Documents manquants : ${documentsManquants.join(", ")}`
    );

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(candidat.email)}` +
      `&su=${encodeURIComponent(sujet)}` +
      `&body=${encodeURIComponent(corps)}`;

    window.open(gmailUrl, "_blank");

  };

    const genererPDF = async () => {

    try {

      const doc = new jsPDF("p", "mm", "a4");

      const safe = (value) => {
        if (value === null || value === undefined || value === "") {
          return "-";
        }

        return String(value);
      };

      const couperTexte = (texte, max = 120) => {
        const valeur = safe(texte);

        if (valeur.length <= max) {
          return valeur;
        }

        return valeur.slice(0, max) + "...";
      };

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const margin = 14;
      let y = 18;

      const dateDuJour =
        new Date().toLocaleDateString("fr-FR");

      const addHeader = (titre, sousTitre = "") => {

        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, pageWidth, 25, "F");

        doc.setFillColor(245, 130, 32);
        doc.rect(0, 0, 10, 25, "F");

        doc.setFillColor(215, 25, 32);
        doc.rect(10, 0, 4, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);

        doc.text(
          titre,
          pageWidth / 2,
          11,
          {
            align: "center"
          }
        );

        doc.setFontSize(9);

        doc.text(
          sousTitre || "OCF-EST",
          pageWidth / 2,
          19,
          {
            align: "center"
          }
        );

        doc.setTextColor(0, 0, 0);

        y = 35;

      };

      const addFooter = (page) => {

        doc.setDrawColor(245, 130, 32);

        doc.line(
          margin,
          285,
          pageWidth - margin,
          285
        );

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        doc.text(
          "OCF-EST - Dossier d'inscription",
          margin,
          291
        );

        doc.text(
          `Page ${page}/2`,
          pageWidth - margin,
          291,
          {
            align: "right"
          }
        );

        doc.setTextColor(0, 0, 0);

      };

      const section = (titre) => {

        doc.setFillColor(255, 243, 232);

        doc.roundedRect(
          margin,
          y - 5,
          pageWidth - margin * 2,
          8,
          2,
          2,
          "F"
        );

        doc.setFillColor(245, 130, 32);

        doc.rect(
          margin,
          y - 5,
          5,
          8,
          "F"
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(20, 20, 20);

        doc.text(
          titre,
          margin + 8,
          y
        );

        y += 9;

      };

      const ligne = (label, value, x = margin, largeurLabel = 48) => {

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");

        doc.text(
          `${label} :`,
          x,
          y
        );

        doc.setFont("helvetica", "normal");

        const texte =
          doc.splitTextToSize(
            safe(value),
            pageWidth - x - largeurLabel - margin
          );

        doc.text(
          texte,
          x + largeurLabel,
          y
        );

        y += Math.max(5.5, texte.length * 4.2);

      };

      const ligneCourte = (label, value, x, yFixe, largeur = 75) => {

        doc.setFontSize(8.3);
        doc.setFont("helvetica", "bold");

        doc.text(
          `${label} :`,
          x,
          yFixe
        );

        doc.setFont("helvetica", "normal");

        const texte =
          doc.splitTextToSize(
            safe(value),
            largeur
          );

        doc.text(
          texte,
          x + 34,
          yFixe
        );

      };

      const blocTexte = (label, value, max = 180) => {

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");

        doc.text(
          `${label} :`,
          margin,
          y
        );

        y += 5;

        doc.setFont("helvetica", "normal");

        const texte =
          doc.splitTextToSize(
            couperTexte(value, max),
            pageWidth - margin * 2
          );

        doc.text(
          texte,
          margin,
          y
        );

        y += Math.max(8, texte.length * 4.2 + 3);

      };

      const ligneSeparateur = () => {
        y += 2;
        doc.setDrawColor(230, 220, 210);
        doc.line(
          margin,
          y,
          pageWidth - margin,
          y
        );
        y += 6;
      };

      const documentsPresentsTexte =
        documentsPresents.length === 0
          ? "Aucun"
          : documentsPresents.join(", ");

      const documentsManquantsTexte =
        documentsManquants.length === 0
          ? "Aucun"
          : documentsManquants.join(", ");

      // =========================
      // PAGE 1
      // =========================

      addHeader(
        "DOSSIER D’INSCRIPTION CFA",
        `${safe(candidat.nom)} ${safe(candidat.prenom)}`
      );

      section("Informations principales");

      const yInfos = y;

      ligneCourte(
        "Nom",
        candidat.nom,
        margin,
        yInfos,
        55
      );

      ligneCourte(
        "Prénom",
        candidat.prenom,
        110,
        yInfos,
        55
      );

      ligneCourte(
        "Téléphone",
        candidat.telephone,
        margin,
        yInfos + 7,
        55
      );

      ligneCourte(
        "Email",
        candidat.email,
        110,
        yInfos + 7,
        65
      );

      ligneCourte(
        "Naissance",
        candidat.date_naissance,
        margin,
        yInfos + 14,
        55
      );

      ligneCourte(
        "Ville",
        candidat.ville,
        110,
        yInfos + 14,
        55
      );

      y = yInfos + 26;

      ligneSeparateur();

      section("Coordonnées");

      ligne("Adresse", candidat.adresse);
      ligne("Code postal", candidat.code_postal);
      ligne("Ville", candidat.ville);
      ligne("Nationalité", candidat.nationalite);

      ligneSeparateur();

      section("Formation demandée");

      ligne("Formation", candidat.code);
      ligne("Intitulé", candidat.libelle);
      ligne("Situation actuelle", candidat.situation_actuelle);
      ligne("Dernière classe", candidat.derniere_classe);
      ligne("Dernier diplôme obtenu", candidat.dernier_diplome_obtenu);
      ligne("Établissement", candidat.nom_etablissement);

      ligneSeparateur();

      section("État du dossier");

      ligne(
        "Statut",
        documentsManquants.length === 0
          ? "Dossier complet"
          : "Dossier incomplet"
      );

      ligne("Documents présents", documentsPresentsTexte);
      ligne("Documents manquants", documentsManquantsTexte);

      ligneSeparateur();

      section("Responsable légal / contact");

      ligne("Nom", candidat.representant_nom);
      ligne("Téléphone", candidat.representant_telephone);
      ligne("Email", candidat.representant_email);

      ligneSeparateur();

      section("Signature");

      ligne("Fait à", candidat.ville);
      ligne("Le", dateDuJour);

      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text(
        "Signature du candidat :",
        margin,
        y
      );

      y += 5;

      doc.rect(
        margin,
        y,
        pageWidth - margin * 2,
        22
      );

      addFooter(1);

      // =========================
      // PAGE 2
      // =========================

      doc.addPage();

      addHeader(
        "COMPLÉMENT DU DOSSIER",
        `${safe(candidat.nom)} ${safe(candidat.prenom)}`
      );

      section("Situation administrative");

      ligne("N° sécurité sociale", candidat.numero_securite_sociale);
      ligne("Permis B", candidat.permis_b);
      ligne("Véhiculé(e)", candidat.vehicule);
      ligne("Demandeur d’emploi", candidat.demandeur_emploi);
      ligne("Identifiant France Travail", candidat.identifiant_france_travail);
      ligne("Indemnités / RSA", candidat.indemnites);
      ligne("Étudiant", candidat.etudiant);
      ligne("Alternance déjà faite", candidat.alternance_deja_faite);
      ligne("Entreprise d’accueil", candidat.entreprise_accueil);
      ligne("Type de contrat", candidat.type_contrat);

      ligneSeparateur();

      section("Handicap et disponibilité");

      ligne("Situation de handicap", candidat.handicap);
      ligne("Besoin d’aménagement", candidat.amenagement_handicap);
      ligne("Disponible immédiatement", candidat.disponibilite_immediate);
      ligne("Date disponibilité", candidat.date_disponibilite);

      ligneSeparateur();

      section("Compétences informatiques");

      ligne("Word", candidat.niveau_word);
      ligne("Messagerie", candidat.niveau_messagerie);
      ligne("Réseaux sociaux", candidat.niveau_reseaux_sociaux);
      ligne("Excel", candidat.niveau_excel);
      ligne("PowerPoint", candidat.niveau_powerpoint);
      ligne("Autre logiciel", candidat.autres_logiciels);
      ligne("Niveau autre logiciel", candidat.niveau_autres_logiciels);

      ligneSeparateur();

      section("Langues");

      ligne(
        candidat.langue_1 || "Langue 1",
        candidat.niveau_langue_1
      );

      ligne(
        candidat.langue_2 || "Langue 2",
        candidat.niveau_langue_2
      );

      ligne(
        candidat.langue_3 || "Langue 3",
        candidat.niveau_langue_3
      );

      ligneSeparateur();

      section("Analyse des besoins");

      blocTexte("Motivations", candidat.motivations, 170);
      blocTexte("Objectif formation", candidat.objectif_formation, 150);
      blocTexte("Compétences souhaitées", candidat.competences_souhaitees, 150);
      blocTexte("Contraintes", candidat.contraintes, 130);
      blocTexte("Autres informations", candidat.autres_infos, 130);

      ligneSeparateur();

      section("Suivi conseiller formation");

      ligne("Date entretien", candidat.date_entretien);
      ligne("Conseiller formation", candidat.conseiller_formation);
      ligne("Test français", candidat.test_francais);
      ligne("Test mathématiques", candidat.test_mathematiques);
      ligne("Test culture générale", candidat.test_culture_generale);
      blocTexte("Appréciation globale", candidat.appreciation_globale, 160);

      addFooter(2);

      await ajouterHistorique(
        "PDF dossier d'inscription généré"
      );

      doc.save(
        `Dossier_inscription_${safe(candidat.nom)}_${safe(candidat.prenom)}.pdf`
      );

      notifier("PDF généré avec succès", "success");

    } catch (error) {

      console.error(error);

      notifier(
        "Erreur lors de la génération du PDF",
        "error"
      );

    }

  };

  const Info = ({ label, value }) => (
    <p>
      <strong>{label} :</strong>{" "}
      {value || "-"}
    </p>
  );

  if (modeEdition) {

    return (
      <ModifierCandidat
        candidat={candidat}
        retour={() => {
          setModeEdition(false);
        }}
        refresh={() => {
          if (refresh) {
            refresh();
          }
        }}
      />
    );

  }

  return (

    <div className="fiche-page">

      <button
        className="back-btn"
        onClick={retour}
      >
        ← Retour
      </button>

      <div className="fiche-header">

        <div>
          <h1>
            {candidat.nom} {candidat.prenom}
          </h1>

          <p>
            Fiche candidat - OCF-EST
          </p>
        </div>

        <div className="fiche-statut">

          <span
            className={`badge badge-${statut
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {statut}
          </span>

          <select
            value={statut}
            onChange={(e) =>
              changerStatut(e.target.value)
            }
          >
            <option>En attente</option>
            <option>Incomplet</option>
            <option>Complet</option>
            <option>Valide</option>
            <option>Refuse</option>
          </select>

        </div>

      </div>

      <div className="fiche-actions">

        <button
          className="btn-edit"
          onClick={() =>
            setModeEdition(true)
          }
        >
          ✏ Modifier
        </button>

        <button
          className="btn-pdf"
          onClick={genererPDF}
        >
          📄 Générer PDF
        </button>

        <button
          className="btn-relance"
          onClick={preparerRelance}
        >
          📧 Préparer relance
        </button>

      </div>

      <div className="fiche-grid">

        <section className="fiche-card">

          <h2>Identité</h2>

          <Info label="Civilité" value={candidat.civilite} />
          <Info label="Nom" value={candidat.nom} />
          <Info label="Prénom" value={candidat.prenom} />
          <Info label="Date de naissance" value={candidat.date_naissance} />
          <Info label="Lieu de naissance" value={candidat.lieu_naissance} />
          <Info label="Nationalité" value={candidat.nationalite} />
          <Info label="N° sécurité sociale" value={candidat.numero_securite_sociale} />

        </section>

        <section className="fiche-card">

          <h2>Contact</h2>

          <Info label="Téléphone" value={candidat.telephone} />
          <Info label="Email" value={candidat.email} />
          <Info label="Adresse" value={candidat.adresse} />
          <Info label="Code postal" value={candidat.code_postal} />
          <Info label="Ville" value={candidat.ville} />

        </section>

        <section className="fiche-card">

          <h2>Formation</h2>

          <Info label="Formation" value={candidat.code} />
          <Info label="Intitulé" value={candidat.libelle} />
          <Info label="Situation actuelle" value={candidat.situation_actuelle} />
          <Info label="Dernière classe suivie" value={candidat.derniere_classe} />
          <Info label="Dernier diplôme obtenu" value={candidat.dernier_diplome_obtenu} />
          <Info label="Établissement" value={candidat.nom_etablissement} />

        </section>

        <section className="fiche-card">

          <h2>Situation détaillée</h2>

          <Info label="Permis B" value={candidat.permis_b} />
          <Info label="Véhiculé(e)" value={candidat.vehicule} />
          <Info label="Demandeur d’emploi" value={candidat.demandeur_emploi} />
          <Info label="Identifiant France Travail" value={candidat.identifiant_france_travail} />
          <Info label="Indemnités / RSA" value={candidat.indemnites} />
          <Info label="Étudiant" value={candidat.etudiant} />
          <Info label="Alternance déjà faite" value={candidat.alternance_deja_faite} />
          <Info label="Entreprise d’accueil" value={candidat.entreprise_accueil} />
          <Info label="Type de contrat" value={candidat.type_contrat} />

        </section>

        <section className="fiche-card">

          <h2>Handicap</h2>

          <Info label="Situation de handicap" value={candidat.handicap} />
          <Info label="Besoin d’aménagement" value={candidat.amenagement_handicap} />

        </section>

        <section className="fiche-card">

          <h2>Compétences informatiques</h2>

          <Info label="Word" value={candidat.niveau_word} />
          <Info label="Messagerie" value={candidat.niveau_messagerie} />
          <Info label="Réseaux sociaux" value={candidat.niveau_reseaux_sociaux} />
          <Info label="Excel" value={candidat.niveau_excel} />
          <Info label="PowerPoint" value={candidat.niveau_powerpoint} />
          <Info label="Autre logiciel" value={candidat.autres_logiciels} />
          <Info label="Niveau autre logiciel" value={candidat.niveau_autres_logiciels} />

        </section>

        <section className="fiche-card">

          <h2>Langues</h2>

          <Info label={candidat.langue_1 || "Langue 1"} value={candidat.niveau_langue_1} />
          <Info label={candidat.langue_2 || "Langue 2"} value={candidat.niveau_langue_2} />
          <Info label={candidat.langue_3 || "Langue 3"} value={candidat.niveau_langue_3} />

        </section>

        <section className="fiche-card">

          <h2>Analyse des besoins</h2>

          <Info label="Motivations" value={candidat.motivations} />
          <Info label="Objectif formation" value={candidat.objectif_formation} />
          <Info label="Compétences souhaitées" value={candidat.competences_souhaitees} />
          <Info label="Contraintes" value={candidat.contraintes} />
          <Info label="Autres infos" value={candidat.autres_infos} />

        </section>

        <section className="fiche-card">

          <h2>Disponibilité</h2>

          <Info label="Disponible immédiatement" value={candidat.disponibilite_immediate} />
          <Info label="Date disponibilité" value={candidat.date_disponibilite} />

        </section>

        <section className="fiche-card">

          <h2>Responsable légal / urgence</h2>

          <Info label="Nom" value={candidat.representant_nom} />
          <Info label="Téléphone" value={candidat.representant_telephone} />
          <Info label="Email" value={candidat.representant_email} />

        </section>

        <section className="fiche-card">

          <h2>Suivi conseiller</h2>

          <Info label="Date entretien" value={candidat.date_entretien} />
          <Info label="Conseiller formation" value={candidat.conseiller_formation} />
          <Info label="Test français" value={candidat.test_francais} />
          <Info label="Test mathématiques" value={candidat.test_mathematiques} />
          <Info label="Test culture générale" value={candidat.test_culture_generale} />
          <Info label="Appréciation globale" value={candidat.appreciation_globale} />

        </section>

        <section className="fiche-card">

          <h2>État du dossier</h2>

          {documentsManquants.length === 0 ? (

            <p className="dossier-ok">
              ✅ Tous les documents obligatoires sont présents.
            </p>

          ) : (

            <div className="missing-docs">

              <p className="dossier-warning">
                ⚠ Documents manquants :
              </p>

              <ul>
                {documentsManquants.map(doc => (
                  <li key={doc}>
                    ❌ {doc}
                  </li>
                ))}
              </ul>

            </div>

          )}

        </section>

      </div>

      <div className="fiche-bottom-grid">

        <section className="fiche-card">

          <h2>Documents</h2>

          {documents.length === 0 && (
            <p>Aucun document</p>
          )}

          <div className="documents-list">

            {documents.map(doc => (

              <div
                key={doc.id}
                className="document-item"
              >

                <span>
                  📄 {doc.type_document}
                </span>

                <div>

                  <a
                    href={`${API_URL}/uploads/${doc.fichier}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir
                  </a>

                  <button
                    onClick={() =>
                      supprimerDocument(
                        doc.id,
                        doc.type_document
                      )
                    }
                  >
                    🗑
                  </button>

                </div>

              </div>

            ))}

          </div>

          <div className="upload-box">

            <h3>Ajouter un document</h3>

            <select
              value={typeDocument}
              onChange={(e) =>
                setTypeDocument(e.target.value)
              }
            >
              <option>CV</option>
              <option>Carte identité</option>
              <option>Carte vitale</option>
              <option>Diplôme</option>
              <option>Photo</option>

              {estFormationAEPE && (
                <option>JDC / recensement</option>
              )}

            </select>

            <input
              type="file"
              onChange={(e) =>
                setFichier(e.target.files[0])
              }
            />

            <button onClick={envoyerDocument}>
              Envoyer
            </button>

          </div>

        </section>

        <section className="fiche-card">

          <h2>Historique</h2>

          {historique.length === 0 ? (

            <p>Aucune action enregistrée</p>

          ) : (

            <div className="historique-box">

              {historique.map(item => (

                <div
                  key={item.id}
                  className="historique-item"
                >

                  <strong>
                    {new Date(item.date_action).toLocaleString("fr-FR", {
                      timeZone: "Europe/Paris",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </strong>

                  <p>
                    {item.utilisateur} - {item.action}
                  </p>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>

    </div>

  );

}

export default FicheCandidat;