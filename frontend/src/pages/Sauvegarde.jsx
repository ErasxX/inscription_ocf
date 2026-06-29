import { useState } from "react";
import { apiFetch } from "../utils/api";

const API_URL =
  `http://${window.location.hostname}:3001`;

function Sauvegarde() {

  const [chargementDb, setChargementDb] = useState(false);
  const [chargementZip, setChargementZip] = useState(false);

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }

  };

  const telechargerFichier = async (
    route,
    nomFichier,
    messageErreur,
    messageSucces,
    typeChargement
  ) => {

    try {

      if (typeChargement === "db") {
        setChargementDb(true);
      }

      if (typeChargement === "zip") {
        setChargementZip(true);
      }

      notifier("Préparation de la sauvegarde...", "info");

      const response = await apiFetch(
  route,
  {
    method: "GET"
  }
);

      if (!response.ok) {
        notifier(messageErreur, "error");
        return;
      }

      const blob = await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const lien =
        document.createElement("a");

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      lien.href = url;
      lien.download =
        `${nomFichier}_${date}`;

      document.body.appendChild(lien);

      lien.click();

      lien.remove();

      window.URL.revokeObjectURL(url);

      notifier(messageSucces, "success");

    } catch (error) {

      console.error(error);

      notifier(messageErreur, "error");

    } finally {

      if (typeChargement === "db") {
        setChargementDb(false);
      }

      if (typeChargement === "zip") {
        setChargementZip(false);
      }

    }

  };

  const telechargerBackup = () => {

    telechargerFichier(
      "/backup",
      "sauvegarde_ocf_est.db",
      "Erreur lors du téléchargement de la sauvegarde",
      "Sauvegarde téléchargée avec succès",
      "db"
    );

  };

  const telechargerBackupComplet = () => {

    telechargerFichier(
      "/backup-complet",
      "sauvegarde_complete_ocf_est.zip",
      "Erreur lors du téléchargement de la sauvegarde complète",
      "Sauvegarde complète téléchargée avec succès",
      "zip"
    );

  };

  return (

    <div className="sauvegarde-page">

      <div className="sauvegarde-header">

        <h1>💾 Sauvegarde</h1>

        <p>
          Téléchargement d'une copie locale de la base de données OCF-EST.
        </p>

      </div>

      <div className="sauvegarde-grid">

        <section className="sauvegarde-card">

          <h2>📦 Base de données</h2>

          <p>
            Cette sauvegarde contient les candidats, les statuts,
            les formations, les documents enregistrés en base et
            l'historique des actions.
          </p>

          <button
            className="backup-btn"
            onClick={telechargerBackup}
            disabled={chargementDb || chargementZip}
          >
            {chargementDb
              ? "Téléchargement de la base..."
              : "💾 Télécharger la sauvegarde"}
          </button>

          <button
            className="backup-zip-btn"
            onClick={telechargerBackupComplet}
            disabled={chargementDb || chargementZip}
          >
            {chargementZip
              ? "Téléchargement du ZIP..."
              : "📦 Télécharger la sauvegarde complète ZIP"}
          </button>

        </section>

        <section className="sauvegarde-card info-backup">

          <h2>Informations</h2>

          <p>
            Le fichier téléchargé est une copie de la base SQLite.
          </p>

          <p>
            La sauvegarde complète ZIP contient aussi les fichiers envoyés par les candidats.
          </p>

          <p>
            Il est conseillé de faire une sauvegarde régulièrement et de la conserver dans un dossier sécurisé ou sur une clé USB.
          </p>

        </section>

      </div>

    </div>

  );

}

export default Sauvegarde;