import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const API_URL =
  `http://${window.location.hostname}:3001`;

const formInitial = {
  civilite: "",
  nom: "",
  prenom: "",
  date_naissance: "",
  lieu_naissance: "",
  nationalite: "",
  adresse: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
  situation_actuelle: "",
  representant_nom: "",
  representant_telephone: "",
  representant_email: "",
  formation_id: "",

  numero_securite_sociale: "",
  permis_b: "",
  vehicule: "",
  demandeur_emploi: "",
  identifiant_france_travail: "",
  indemnites: "",
  etudiant: "",
  derniere_classe: "",
  dernier_diplome_obtenu: "",
  nom_etablissement: "",
  alternance_deja_faite: "",
  entreprise_accueil: "",
  type_contrat: "",
  handicap: "",
  amenagement_handicap: "",
  motivations: "",
  objectif_formation: "",
  competences_souhaitees: "",
  contraintes: "",
  autres_infos: "",
  disponibilite_immediate: "",
  date_disponibilite: "",

  niveau_word: "",
  niveau_messagerie: "",
  niveau_reseaux_sociaux: "",
  niveau_excel: "",
  niveau_powerpoint: "",
  autres_logiciels: "",
  niveau_autres_logiciels: "",

  langue_1: "",
  niveau_langue_1: "",
  langue_2: "",
  niveau_langue_2: "",
  langue_3: "",
  niveau_langue_3: "",

  date_entretien: "",
  conseiller_formation: "",
  test_francais: "",
  test_mathematiques: "",
  test_culture_generale: "",
  appreciation_globale: ""
};

const FormContext = createContext(null);

const Aide = ({ children }) => (
  <small className="field-help">
    {children}
  </small>
);

const Input = ({
  label,
  champ,
  type = "text",
  placeholder = "",
  aide = "",
  obligatoire = false
}) => {

  const { form, changerChamp } =
    useContext(FormContext);

  const getInputMode = () => {

    if (
      champ === "telephone" ||
      champ === "representant_telephone" ||
      champ === "code_postal" ||
      champ === "numero_securite_sociale"
    ) {
      return "numeric";
    }

    if (
      champ === "test_francais" ||
      champ === "test_mathematiques" ||
      champ === "test_culture_generale"
    ) {
      return "decimal";
    }

    return undefined;

  };

  const getMaxLength = () => {

    if (
      champ === "telephone" ||
      champ === "representant_telephone"
    ) {
      return 10;
    }

    if (champ === "code_postal") {
      return 5;
    }

    if (champ === "numero_securite_sociale") {
      return 15;
    }

    if (
      champ === "nom" ||
      champ === "prenom" ||
      champ === "ville" ||
      champ === "lieu_naissance" ||
      champ === "nationalite"
    ) {
      return 80;
    }

    if (
      champ === "test_francais" ||
      champ === "test_mathematiques" ||
      champ === "test_culture_generale"
    ) {
      return 20;
    }

    return undefined;

  };

  return (

    <div className="field-block">

      <label>
        {label}{obligatoire ? " *" : ""}
      </label>

      <input
        type={type}
        value={form[champ] || ""}
        placeholder={placeholder}
        inputMode={getInputMode()}
        maxLength={getMaxLength()}
        onChange={(e) =>
          changerChamp(champ, e.target.value)
        }
      />

      {aide && <Aide>{aide}</Aide>}

    </div>

  );

};

const TextArea = ({
  label,
  champ,
  placeholder = "",
  aide = ""
}) => {

  const { form, changerChamp } =
    useContext(FormContext);

  return (

    <div className="field-block">

      <label>{label}</label>

      <textarea
        value={form[champ] || ""}
        placeholder={placeholder}
        onChange={(e) =>
          changerChamp(champ, e.target.value)
        }
      />

      {aide && <Aide>{aide}</Aide>}

    </div>

  );

};

const SelectOuiNon = ({
  label,
  champ,
  aide = ""
}) => {

  const { form, changerChamp } =
    useContext(FormContext);

  return (

    <div className="field-block">

      <label>{label}</label>

      <select
        value={form[champ] || ""}
        onChange={(e) =>
          changerChamp(champ, e.target.value)
        }
      >
        <option value="">Non renseigné</option>
        <option value="Oui">Oui</option>
        <option value="Non">Non</option>
      </select>

      {aide && <Aide>{aide}</Aide>}

    </div>

  );

};

const NiveauLogiciel = ({
  label,
  champ
}) => {

  const { form, changerChamp } =
    useContext(FormContext);

  return (

    <div className="field-block">

      <label>{label}</label>

      <select
        value={form[champ] || ""}
        onChange={(e) =>
          changerChamp(champ, e.target.value)
        }
      >
        <option value="">Non renseigné</option>
        <option value="Faible">Faible</option>
        <option value="Moyen">Moyen</option>
        <option value="Expert">Expert</option>
      </select>

      <Aide>
        Faible = bases limitées, Moyen = usage correct, Expert = très bonne maîtrise.
      </Aide>

    </div>

  );

};

const NiveauLangue = ({
  label,
  champ
}) => {

  const { form, changerChamp } =
    useContext(FormContext);

  return (

    <div className="field-block">

      <label>{label}</label>

      <select
        value={form[champ] || ""}
        onChange={(e) =>
          changerChamp(champ, e.target.value)
        }
      >
        <option value="">Non renseigné</option>
        <option value="A1-A2">A1-A2 - débutant</option>
        <option value="B1-B2">B1-B2 - intermédiaire</option>
        <option value="C1-C2">C1-C2 - avancé</option>
      </select>

      <Aide>
        A1-A2 = débutant, B1-B2 = niveau correct, C1-C2 = très bon niveau.
      </Aide>

    </div>

  );

};

function NouveauCandidat({ apresCreation }) {

  const [formations, setFormations] = useState([]);
  const [form, setForm] = useState(formInitial);

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }

  };

  useEffect(() => {

    window.scrollTo(0, 0);

    fetch(`${API_URL}/formations`)
      .then(res => res.json())
      .then(data => setFormations(data))
      .catch(() => {
        notifier("Erreur lors du chargement des formations", "error");
      });

  }, []);

  const nettoyerValeurChamp = (champ, valeur) => {

    const seulementChiffres =
      valeur.replace(/\D/g, "");

    const seulementTexte =
      valeur.replace(/[0-9]/g, "");

    if (
      champ === "telephone" ||
      champ === "representant_telephone"
    ) {
      return seulementChiffres.slice(0, 10);
    }

    if (champ === "code_postal") {
      return seulementChiffres.slice(0, 5);
    }

    if (champ === "numero_securite_sociale") {
      return seulementChiffres.slice(0, 15);
    }

    if (
      champ === "test_francais" ||
      champ === "test_mathematiques" ||
      champ === "test_culture_generale"
    ) {
      return valeur
        .replace(/[^0-9/,.\s]/g, "")
        .slice(0, 20);
    }

    if (
      champ === "nom" ||
      champ === "prenom" ||
      champ === "ville" ||
      champ === "lieu_naissance" ||
      champ === "nationalite"
    ) {
      return seulementTexte;
    }

    return valeur;

  };

  const changerChamp = (champ, valeur) => {

    const valeurNettoyee =
      nettoyerValeurChamp(champ, valeur);

    setForm(prevForm => ({
      ...prevForm,
      [champ]: valeurNettoyee
    }));

  };

  const emailValide = (email) => {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  };

  const resetForm = () => {
    setForm({ ...formInitial });
    window.scrollTo(0, 0);
  };

  const enregistrer = async () => {

    if (!form.nom || !form.prenom || !form.formation_id) {
      notifier("Nom, prénom et formation sont obligatoires", "warning");
      return;
    }

    if (form.telephone && form.telephone.length !== 10) {
      notifier("Le numéro de téléphone doit contenir 10 chiffres", "warning");
      return;
    }

    if (
      form.representant_telephone &&
      form.representant_telephone.length !== 10
    ) {
      notifier("Le téléphone du représentant doit contenir 10 chiffres", "warning");
      return;
    }

    if (form.code_postal && form.code_postal.length !== 5) {
      notifier("Le code postal doit contenir 5 chiffres", "warning");
      return;
    }

    if (
      form.numero_securite_sociale &&
      form.numero_securite_sociale.length !== 15
    ) {
      notifier("Le numéro de sécurité sociale doit contenir 15 chiffres", "warning");
      return;
    }

    if (form.email && !emailValide(form.email)) {
      notifier("L'adresse email du candidat n'est pas valide", "warning");
      return;
    }

    if (
      form.representant_email &&
      !emailValide(form.representant_email)
    ) {
      notifier("L'adresse email du représentant n'est pas valide", "warning");
      return;
    }

    try {

      const response = await apiFetch(
  "/candidats",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(form)
  }
);

      if (response.ok) {

        if (typeof apresCreation === "function") {

          notifier("Candidat enregistré. Session terminée.", "success");

          setTimeout(() => {
            apresCreation();
          }, 800);

          return;

        }

        notifier("Candidat enregistré avec succès", "success");
        resetForm();

      } else {

        const result = await response.json();

        notifier(
          result.message ||
          "Erreur lors de l'enregistrement",
          "error"
        );

      }

    } catch (error) {

      console.error("Erreur enregistrement :", error);

      notifier(
        "Impossible de contacter le serveur",
        "error"
      );

    }

  };

  return (

    <FormContext.Provider value={{ form, changerChamp }}>

      <div className="inscription-page">

        <div className="inscription-header">

          <div>
            <h1>Nouvelle inscription</h1>
            <p>
              Création d'un nouveau dossier candidat - OCF-EST
            </p>
          </div>

        </div>

        <div className="inscription-grid">

          <section className="inscription-card">

            <h2>Identité du candidat</h2>

            <div className="field-block">
              <label>Civilité</label>

              <select
                value={form.civilite || ""}
                onChange={(e) =>
                  changerChamp("civilite", e.target.value)
                }
              >
                <option value="">Non renseigné</option>
                <option value="M">Monsieur</option>
                <option value="Mme">Madame</option>
              </select>
            </div>

            <Input
              label="Nom de famille"
              champ="nom"
              placeholder="Ex : DUPONT"
              obligatoire
            />

            <Input
              label="Prénom"
              champ="prenom"
              placeholder="Ex : Sarah"
              obligatoire
            />

            <Input
              label="Date de naissance"
              champ="date_naissance"
              type="date"
            />

            <Input
              label="Lieu de naissance"
              champ="lieu_naissance"
              placeholder="Ex : Strasbourg"
            />

            <Input
              label="Nationalité"
              champ="nationalite"
              placeholder="Ex : Française"
            />

            <Input
              label="Numéro de sécurité sociale"
              champ="numero_securite_sociale"
              placeholder="Ex : 199126712345678"
              aide="15 chiffres maximum, sans espaces. À remplir uniquement si le candidat l’a fourni."
            />

          </section>

          <section className="inscription-card">

            <h2>Coordonnées</h2>

            <Input
              label="Téléphone du candidat"
              champ="telephone"
              placeholder="Ex : 0612345678"
              aide="10 chiffres uniquement, sans espaces."
            />

            <Input
              label="Adresse e-mail du candidat"
              champ="email"
              type="email"
              placeholder="Ex : candidat@email.com"
            />

            <Input
              label="Adresse postale"
              champ="adresse"
              placeholder="Ex : 10 rue des Écoles"
            />

            <Input
              label="Code postal"
              champ="code_postal"
              placeholder="Ex : 67000"
              aide="5 chiffres uniquement."
            />

            <Input
              label="Ville"
              champ="ville"
              placeholder="Ex : Strasbourg"
            />

          </section>

          <section className="inscription-card">

            <h2>Formation demandée</h2>

            <div className="field-block">
              <label>Formation souhaitée *</label>

              <select
                value={form.formation_id || ""}
                onChange={(e) =>
                  changerChamp("formation_id", e.target.value)
                }
              >
                <option value="">Choisir une formation</option>

                {formations.map((f) => (

                  <option
                    key={f.id}
                    value={f.id}
                  >
                    {f.code} - {f.libelle}
                  </option>

                ))}

              </select>

              <Aide>
                Champ obligatoire : sélectionne la formation choisie par le candidat.
              </Aide>
            </div>

            <div className="field-block">
              <label>Situation actuelle du candidat</label>

              <select
                value={form.situation_actuelle || ""}
                onChange={(e) =>
                  changerChamp("situation_actuelle", e.target.value)
                }
              >
                <option value="">Non renseigné</option>
                <option value="Demandeur d’emploi">Demandeur d’emploi</option>
                <option value="Étudiant">Étudiant</option>
                <option value="Salarié">Salarié</option>
                <option value="Chef d’entreprise">Chef d’entreprise</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <Input
              label="Dernière classe suivie"
              champ="derniere_classe"
              placeholder="Ex : Terminale, BTS 1, CAP 2..."
            />

            <Input
              label="Dernier diplôme obtenu"
              champ="dernier_diplome_obtenu"
              placeholder="Ex : Brevet, CAP, Bac..."
              aide="Diplôme réellement obtenu par le candidat."
            />

            <Input
              label="Nom du dernier établissement"
              champ="nom_etablissement"
              placeholder="Ex : Lycée René Cassin"
            />

          </section>

          <section className="inscription-card">

            <h2>Situation administrative et mobilité</h2>

            <SelectOuiNon
              label="Titulaire du permis B"
              champ="permis_b"
              aide="Indique si le candidat possède le permis voiture."
            />

            <SelectOuiNon
              label="Candidat véhiculé"
              champ="vehicule"
              aide="Indique si le candidat peut se déplacer avec son propre véhicule."
            />

            <SelectOuiNon
              label="Inscrit à France Travail"
              champ="demandeur_emploi"
              aide="Anciennement Pôle emploi."
            />

            <Input
              label="Identifiant France Travail"
              champ="identifiant_france_travail"
              placeholder="Ex : identifiant indiqué sur l’espace France Travail"
              aide="À remplir seulement si le candidat est inscrit à France Travail."
            />

            <Input
              label="Indemnités / RSA / aides"
              champ="indemnites"
              placeholder="Ex : ARE, RSA, aucune, non renseigné..."
              aide="Précise les aides ou indemnités déclarées par le candidat."
            />

            <SelectOuiNon
              label="Candidat actuellement étudiant"
              champ="etudiant"
            />

            <Input
              label="Alternance déjà effectuée"
              champ="alternance_deja_faite"
              placeholder="Ex : Oui, 1 an en commerce / Non"
              aide="Permet de savoir si le candidat a déjà connu l’alternance."
            />

            <Input
              label="Entreprise d’accueil prévue"
              champ="entreprise_accueil"
              placeholder="Ex : Nom de l’entreprise si déjà trouvée"
              aide="À remplir si le candidat a déjà une entreprise pour l’alternance."
            />

            <Input
              label="Type de contrat envisagé"
              champ="type_contrat"
              placeholder="Ex : apprentissage, professionnalisation..."
            />

          </section>

          <section className="inscription-card">

            <h2>Handicap et aménagement</h2>

            <SelectOuiNon
              label="Le candidat déclare une situation de handicap"
              champ="handicap"
            />

            <SelectOuiNon
              label="Besoin d’un aménagement particulier"
              champ="amenagement_handicap"
              aide="Ex : aménagement d’examen, adaptation du poste, suivi particulier..."
            />

          </section>

          <section className="inscription-card">

            <h2>Compétences informatiques</h2>

            <NiveauLogiciel
              label="Niveau sur Word"
              champ="niveau_word"
            />

            <NiveauLogiciel
              label="Niveau en messagerie e-mail"
              champ="niveau_messagerie"
            />

            <NiveauLogiciel
              label="Niveau sur les réseaux sociaux"
              champ="niveau_reseaux_sociaux"
            />

            <NiveauLogiciel
              label="Niveau sur Excel"
              champ="niveau_excel"
            />

            <NiveauLogiciel
              label="Niveau sur PowerPoint"
              champ="niveau_powerpoint"
            />

            <Input
              label="Autre logiciel maîtrisé"
              champ="autres_logiciels"
              placeholder="Ex : Canva, Photoshop, logiciel métier..."
            />

            <NiveauLogiciel
              label="Niveau sur l’autre logiciel"
              champ="niveau_autres_logiciels"
            />

          </section>

          <section className="inscription-card">

            <h2>Langues</h2>

            <Input
              label="Langue 1"
              champ="langue_1"
              placeholder="Ex : Français"
            />

            <NiveauLangue
              label="Niveau langue 1"
              champ="niveau_langue_1"
            />

            <Input
              label="Langue 2"
              champ="langue_2"
              placeholder="Ex : Anglais"
            />

            <NiveauLangue
              label="Niveau langue 2"
              champ="niveau_langue_2"
            />

            <Input
              label="Langue 3"
              champ="langue_3"
              placeholder="Ex : Arabe, espagnol..."
            />

            <NiveauLangue
              label="Niveau langue 3"
              champ="niveau_langue_3"
            />

          </section>

          <section className="inscription-card">

            <h2>Analyse des besoins en formation</h2>

            <TextArea
              label="Motivations du candidat"
              champ="motivations"
              placeholder="Ex : Pourquoi le candidat souhaite intégrer cette formation ?"
              aide="Résume les raisons principales de sa candidature."
            />

            <TextArea
              label="Objectif à la fin de la formation"
              champ="objectif_formation"
              placeholder="Ex : obtenir un diplôme, trouver un emploi, évoluer professionnellement..."
            />

            <TextArea
              label="Compétences que le candidat souhaite développer"
              champ="competences_souhaitees"
              placeholder="Ex : communication, accompagnement, gestion, informatique..."
            />

            <TextArea
              label="Contraintes particulières"
              champ="contraintes"
              placeholder="Ex : horaires, transport, garde d’enfant, santé..."
            />

            <TextArea
              label="Autres informations utiles"
              champ="autres_infos"
              placeholder="Informations importantes non renseignées ailleurs."
            />

          </section>

          <section className="inscription-card">

            <h2>Disponibilité</h2>

            <SelectOuiNon
              label="Disponible immédiatement"
              champ="disponibilite_immediate"
            />

            <Input
              label="Date de disponibilité si non immédiate"
              champ="date_disponibilite"
              type="date"
              aide="À remplir si le candidat n’est pas disponible tout de suite."
            />

          </section>

          <section className="inscription-card">

            <h2>Responsable légal / personne à contacter</h2>

            <Input
              label="Nom du représentant ou contact d’urgence"
              champ="representant_nom"
              placeholder="Ex : parent, tuteur, personne à prévenir..."
            />

            <Input
              label="Téléphone du représentant / contact"
              champ="representant_telephone"
              placeholder="Ex : 0612345678"
              aide="10 chiffres uniquement, sans espaces."
            />

            <Input
              label="Email du représentant / contact"
              champ="representant_email"
              type="email"
              placeholder="Ex : parent@email.com"
            />

          </section>

          <section className="inscription-card">

            <h2>Suivi conseiller formation</h2>

            <Input
              label="Date de l’entretien"
              champ="date_entretien"
              type="date"
            />

            <Input
              label="Nom du conseiller formation"
              champ="conseiller_formation"
              placeholder="Ex : Nom du conseiller ayant reçu le candidat"
            />

            <Input
              label="Résultat du test de français"
              champ="test_francais"
              placeholder="Ex : 12/20"
              aide="Chiffres, virgule, point et slash autorisés."
            />

            <Input
              label="Résultat du test de mathématiques"
              champ="test_mathematiques"
              placeholder="Ex : 10/20"
              aide="Chiffres, virgule, point et slash autorisés."
            />

            <Input
              label="Résultat du test de culture générale"
              champ="test_culture_generale"
              placeholder="Ex : 14/20"
              aide="Chiffres, virgule, point et slash autorisés."
            />

            <TextArea
              label="Appréciation globale du conseiller"
              champ="appreciation_globale"
              placeholder="Avis général sur le profil, le projet et la motivation du candidat."
            />

          </section>

          <section className="inscription-card inscription-summary">

            <h2>Validation du dossier</h2>

            <p>
              Vérifie les informations principales avant d'enregistrer le dossier.
            </p>

            <div className="summary-box">

              <p>
                <strong>Candidat :</strong>{" "}
                {form.nom || "-"} {form.prenom || ""}
              </p>

              <p>
                <strong>Formation :</strong>{" "}
                {
                  formations.find(
                    f => String(f.id) === String(form.formation_id)
                  )?.code || "-"
                }
              </p>

              <p>
                <strong>Email :</strong>{" "}
                {form.email || "-"}
              </p>

            </div>

            <button
              className="save-candidat-btn"
              onClick={enregistrer}
            >
              ✅ Enregistrer le candidat
            </button>

            <button
              className="reset-candidat-btn"
              onClick={() => {
                resetForm();
                notifier("Formulaire réinitialisé", "info");
              }}
            >
              Réinitialiser
            </button>

          </section>

        </div>

      </div>

    </FormContext.Provider>

  );

}

export default NouveauCandidat;