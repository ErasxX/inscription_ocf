const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const archiverModule = require("archiver");
const archiver = archiverModule.default || archiverModule;

require("./database");
const db = require("./database");

const app = express();

db.run(
  "ALTER TABLE utilisateurs ADD COLUMN role TEXT DEFAULT 'admin'",
  (err) => {
    if (
      err &&
      !String(err.message).includes("duplicate column name")
    ) {
      console.error("Erreur ajout colonne role :", err);
    }
  }
);

const SECRET_KEY =
  process.env.JWT_SECRET ||
  "ocf_est_secret_token_2026_dev";

const REQUIRED_DOCS_BASE = [
  "CV",
  "Carte identité",
  "Carte vitale",
  "Diplôme",
  "Photo"
];

const DOC_JDC =
  "JDC / recensement";

const STATUTS_AUTORISES = [
  "En attente",
  "Incomplet",
  "Complet",
  "Valide",
  "Refuse"
];

const TYPES_DOCUMENTS_AUTORISES = [
  ...REQUIRED_DOCS_BASE,
  DOC_JDC
];

const CHAMPS_CANDIDAT = [
  "civilite",
  "nom",
  "prenom",
  "date_naissance",
  "lieu_naissance",
  "nationalite",
  "adresse",
  "code_postal",
  "ville",
  "telephone",
  "email",
  "situation_actuelle",
  "representant_nom",
  "representant_telephone",
  "representant_email",
  "formation_id",

  "numero_securite_sociale",
  "permis_b",
  "vehicule",
  "demandeur_emploi",
  "identifiant_france_travail",
  "indemnites",
  "etudiant",
  "derniere_classe",
  "dernier_diplome_obtenu",
  "nom_etablissement",
  "alternance_deja_faite",
  "entreprise_accueil",
  "type_contrat",
  "handicap",
  "amenagement_handicap",
  "motivations",
  "objectif_formation",
  "competences_souhaitees",
  "contraintes",
  "autres_infos",
  "disponibilite_immediate",
  "date_disponibilite",
  "niveau_word",
  "niveau_messagerie",
  "niveau_reseaux_sociaux",
  "niveau_excel",
  "niveau_powerpoint",
  "autres_logiciels",
  "niveau_autres_logiciels",
  "langue_1",
  "niveau_langue_1",
  "langue_2",
  "niveau_langue_2",
  "langue_3",
  "niveau_langue_3",
  "date_entretien",
  "conseiller_formation",
  "test_francais",
  "test_mathematiques",
  "test_culture_generale",
  "appreciation_globale"
];

/* =====================================
   FONCTIONS DE SECURITE
===================================== */

function idValide(id) {
  return /^[0-9]+$/.test(String(id));
}

function texte(valeur) {
  if (typeof valeur !== "string") {
    return valeur;
  }

  return valeur.trim();
}

function valeurChamp(valeur) {
  if (valeur === undefined || valeur === null) {
    return null;
  }

  return texte(valeur);
}

function dateHeureFrance() {
  const maintenant = new Date();

  const dateFrance = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(maintenant);

  const valeurs = {};

  dateFrance.forEach(part => {
    valeurs[part.type] = part.value;
  });

  return `${valeurs.year}-${valeurs.month}-${valeurs.day} ${valeurs.hour}:${valeurs.minute}:${valeurs.second}`;
}

function erreurServeur(res, err) {
  console.error(err);

  return res.status(500).json({
    message: "Erreur serveur"
  });
}

function estFormationAEPE(candidat) {
  return (
    (candidat.code || "").includes("AEPE") ||
    (candidat.libelle || "").includes("AEPE") ||
    (candidat.code || "").includes("IEPE") ||
    (candidat.libelle || "").includes("IEPE")
  );
}

function getRequiredDocs(candidat) {
  return [
    ...REQUIRED_DOCS_BASE,
    ...(estFormationAEPE(candidat) ? [DOC_JDC] : [])
  ];
}

/* =====================================
   VALIDATION CANDIDAT
===================================== */

function emailValide(email) {

  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));

}

function uniquementChiffres(valeur) {

  return /^[0-9]+$/.test(String(valeur));

}

function texteSansChiffres(valeur) {

  if (!valeur) {
    return true;
  }

  return !/[0-9]/.test(String(valeur));

}

function nettoyerDonneesCandidat(donnees) {

  const donneesNettoyees = {};

  CHAMPS_CANDIDAT.forEach((champ) => {

    if (
      donnees[champ] === undefined ||
      donnees[champ] === null
    ) {
      donneesNettoyees[champ] = null;
      return;
    }

    if (typeof donnees[champ] === "string") {
      donneesNettoyees[champ] =
        donnees[champ].trim();
      return;
    }

    donneesNettoyees[champ] =
      donnees[champ];

  });

  return donneesNettoyees;

}

function validerCandidat(donnees) {

  const erreurs = [];

  const nom =
    texte(donnees.nom || "");

  const prenom =
    texte(donnees.prenom || "");

  const formationId =
    donnees.formation_id;

  if (!nom) {
    erreurs.push("Le nom est obligatoire");
  }

  if (!prenom) {
    erreurs.push("Le prénom est obligatoire");
  }

  if (!idValide(formationId)) {
    erreurs.push("La formation est obligatoire");
  }

  if (
    donnees.telephone &&
    (
      !uniquementChiffres(donnees.telephone) ||
      String(donnees.telephone).length !== 10
    )
  ) {
    erreurs.push("Le téléphone du candidat doit contenir exactement 10 chiffres");
  }

  if (
    donnees.representant_telephone &&
    (
      !uniquementChiffres(donnees.representant_telephone) ||
      String(donnees.representant_telephone).length !== 10
    )
  ) {
    erreurs.push("Le téléphone du représentant doit contenir exactement 10 chiffres");
  }

  if (
    donnees.code_postal &&
    (
      !uniquementChiffres(donnees.code_postal) ||
      String(donnees.code_postal).length !== 5
    )
  ) {
    erreurs.push("Le code postal doit contenir exactement 5 chiffres");
  }

  if (
    donnees.numero_securite_sociale &&
    (
      !uniquementChiffres(donnees.numero_securite_sociale) ||
      String(donnees.numero_securite_sociale).length !== 15
    )
  ) {
    erreurs.push("Le numéro de sécurité sociale doit contenir exactement 15 chiffres");
  }

  if (
    donnees.email &&
    !emailValide(donnees.email)
  ) {
    erreurs.push("L'adresse email du candidat n'est pas valide");
  }

  if (
    donnees.representant_email &&
    !emailValide(donnees.representant_email)
  ) {
    erreurs.push("L'adresse email du représentant n'est pas valide");
  }

  const champsSansChiffres = [
    "nom",
    "prenom",
    "ville",
    "lieu_naissance",
    "nationalite"
  ];

  champsSansChiffres.forEach((champ) => {

    if (!texteSansChiffres(donnees[champ])) {
      erreurs.push(`${champ} ne doit pas contenir de chiffres`);
    }

  });

  const champsTests = [
    "test_francais",
    "test_mathematiques",
    "test_culture_generale"
  ];

  champsTests.forEach((champ) => {

    if (
      donnees[champ] &&
      !/^[0-9/,.\s]+$/.test(String(donnees[champ]))
    ) {
      erreurs.push(`${champ} contient des caractères non autorisés`);
    }

  });

  return erreurs;

}

/* =====================================
   MIDDLEWARES
===================================== */

app.use(cors({
  origin: function(origin, callback) {

    if (!origin) {
      return callback(null, true);
    }

    const originsAutorisees = [
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ];

    const reseauLocal =
      /^http:\/\/192\.168\.\d+\.\d+:5173$/.test(origin) ||
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/.test(origin) ||
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/.test(origin);

    if (
      originsAutorisees.includes(origin) ||
      reseauLocal
    ) {
      return callback(null, true);
    }

    return callback(
      new Error("Origine non autorisée par CORS")
    );

  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
}));

app.use(express.json({
  limit: "2mb"
}));

app.use("/uploads", express.static("uploads"));

/* =====================================
   AUTH JWT
===================================== */

function verifierToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token manquant"
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token invalide"
    });
  }

  jwt.verify(
    token,
    SECRET_KEY,
    (err, decoded) => {

      if (err) {
        return res.status(403).json({
          message: "Accès refusé"
        });
      }

      req.user = decoded;
      next();

    }
  );

}

function autoriserRoles(...rolesAutorises) {

  return (req, res, next) => {

    const role =
      req.user?.role || "admin";

    if (!rolesAutorises.includes(role)) {
      return res.status(403).json({
        message: "Accès interdit pour ce rôle"
      });
    }

    next();

  };

}

/* =====================================
   RECALCUL STATUT
===================================== */

function recalculStatut(candidatId, callback) {

  if (!idValide(candidatId)) {
    if (callback) callback(null);
    return;
  }

  db.get(
    `
    SELECT
      c.statut,
      f.code,
      f.libelle
    FROM candidats c
    LEFT JOIN formations f
    ON c.formation_id = f.id
    WHERE c.id = ?
    `,
    [candidatId],
    (err, candidat) => {

      if (err || !candidat) {
        if (callback) callback(null);
        return;
      }

      if (
        candidat.statut === "Valide" ||
        candidat.statut === "Refuse"
      ) {
        if (callback) callback(candidat.statut);
        return;
      }

      db.all(
        `
        SELECT type_document
        FROM documents
        WHERE candidat_id = ?
        `,
        [candidatId],
        (err2, docs) => {

          if (err2) {
            if (callback) callback(null);
            return;
          }

          const documentsPresents =
            docs.map(d => d.type_document);

          const documentsObligatoires =
            getRequiredDocs(candidat);

          const dossierComplet =
            documentsObligatoires.every(doc =>
              documentsPresents.includes(doc)
            );

          let nouveauStatut = "En attente";

          if (documentsPresents.length > 0) {
            nouveauStatut = "Incomplet";
          }

          if (dossierComplet) {
            nouveauStatut = "Complet";
          }

          db.run(
            `
            UPDATE candidats
            SET statut = ?
            WHERE id = ?
            `,
            [nouveauStatut, candidatId],
            (err3) => {

              if (err3) {
                console.error(err3);
              }

              if (callback) {
                callback(nouveauStatut);
              }

            }
          );

        }
      );

    }
  );

}

/* =====================================
   MULTER SECURISE
===================================== */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {

    const extension =
      path.extname(file.originalname).toLowerCase();

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1E9) +
      extension;

    cb(null, uniqueName);

  }

});

const fileFilter = (req, file, cb) => {

  const typesAutorises = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!typesAutorises.includes(file.mimetype)) {
    return cb(
      new Error("Type de fichier non autorisé"),
      false
    );
  }

  cb(null, true);

};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

/* =====================================
   TEST
===================================== */

app.get("/", (req, res) => {
  res.send("Serveur OCF-EST opérationnel");
});

/* =====================================
   LOGIN
===================================== */

app.post("/login", (req, res) => {

  const username = texte(req.body.username);
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({
      message: "Identifiants manquants"
    });
  }

  db.get(
    `
    SELECT *
    FROM utilisateurs
    WHERE username = ?
    `,
    [username],
    (err, user) => {

      if (err) {
        return erreurServeur(res, err);
      }

      if (!user) {
        return res.status(401).json({
          message: "Identifiants incorrects"
        });
      }

      const passwordOk = bcrypt.compareSync(
        password,
        user.password
      );

      if (!passwordOk) {
        return res.status(401).json({
          message: "Identifiants incorrects"
        });
      }

      const role =
        user.role || "admin";

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role || "admin"
        },
        SECRET_KEY,
        {
          expiresIn: "8h"
        }
      );

      res.json({
        message: "Connexion réussie",
        token: token,
        user: {
          id: user.id,
          username: user.username,
          role: role
        }
      });

    }
  );

});

/* =====================================
   FORMATIONS
===================================== */

app.get("/formations", (req, res) => {

  db.all(
    `
    SELECT *
    FROM formations
    `,
    [],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

/* =====================================
   CANDIDATS
===================================== */

app.post("/candidats", verifierToken, autoriserRoles("admin", "saisie"), (req, res) => {

  const donneesCandidat =
    nettoyerDonneesCandidat(req.body);

  const erreursValidation =
    validerCandidat(donneesCandidat);

  if (erreursValidation.length > 0) {
    return res.status(400).json({
      message: erreursValidation[0],
      erreurs: erreursValidation
    });
  }

  const colonnes =
    CHAMPS_CANDIDAT.join(", ");

  const placeholders =
    CHAMPS_CANDIDAT.map(() => "?").join(", ");

  const valeurs =
    CHAMPS_CANDIDAT.map((champ) => {

      if (champ === "formation_id") {
        return donneesCandidat.formation_id;
      }

      return valeurChamp(donneesCandidat[champ]);

    });

  db.run(
    `
    INSERT INTO candidats (
      ${colonnes}
    )
    VALUES (
      ${placeholders}
    )
    `,
    valeurs,
    function(err) {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json({
        message: "Candidat créé",
        id: this.lastID
      });

    }
  );

});

app.get("/candidats", (req, res) => {

  db.all(
    `
    SELECT
      c.*,
      f.code,
      f.libelle
    FROM candidats c
    LEFT JOIN formations f
    ON c.formation_id = f.id
    `,
    [],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

app.delete("/candidats/:id", verifierToken, autoriserRoles("admin"), (req, res) => {

  const id = req.params.id;

  if (!idValide(id)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  db.run(
    `
    DELETE FROM candidats
    WHERE id = ?
    `,
    [id],
    function(err) {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json({
        message: "Candidat supprimé"
      });

    }
  );

});

app.put("/candidats/:id", verifierToken, autoriserRoles("admin"), (req, res) => {

  const id = req.params.id;

  if (!idValide(id)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  const donneesCandidat =
    nettoyerDonneesCandidat(req.body);

  const erreursValidation =
    validerCandidat(donneesCandidat);

  if (erreursValidation.length > 0) {
    return res.status(400).json({
      message: erreursValidation[0],
      erreurs: erreursValidation
    });
  }

  const champsUpdate =
    CHAMPS_CANDIDAT.map(champ => `${champ} = ?`).join(", ");

  const valeurs =
    CHAMPS_CANDIDAT.map((champ) => {

      if (champ === "formation_id") {
        return donneesCandidat.formation_id;
      }

      return valeurChamp(donneesCandidat[champ]);

    });

  valeurs.push(id);

  db.run(
    `
    UPDATE candidats
    SET
      ${champsUpdate}
    WHERE id = ?
    `,
    valeurs,
    function(err) {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json({
        message: "Candidat modifié"
      });

    }
  );

});

/* =====================================
   STATUT
===================================== */

app.put("/candidats/:id/statut", verifierToken, autoriserRoles("admin"), (req, res) => {

  const id = req.params.id;
  const { statut } = req.body;

  if (!idValide(id)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  if (!STATUTS_AUTORISES.includes(statut)) {
    return res.status(400).json({
      message: "Statut invalide"
    });
  }

  db.run(
    `
    UPDATE candidats
    SET statut = ?
    WHERE id = ?
    `,
    [statut, id],
    function(err) {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json({
        message: "Statut mis à jour"
      });

    }
  );

});

/* =====================================
   DOCUMENTS
===================================== */

app.post(
  "/documents",
  verifierToken,
  autoriserRoles("admin"),
  upload.single("document"),
  (req, res) => {

    const {
      candidat_id,
      type_document
    } = req.body;

    if (!idValide(candidat_id)) {
      return res.status(400).json({
        message: "ID candidat invalide"
      });
    }

    if (!TYPES_DOCUMENTS_AUTORISES.includes(type_document)) {
      return res.status(400).json({
        message: "Type de document invalide"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Aucun fichier envoyé"
      });
    }

    const fichier = req.file.filename;

    db.run(
      `
      INSERT INTO documents (
        candidat_id,
        type_document,
        fichier
      )
      VALUES (?, ?, ?)
      `,
      [
        candidat_id,
        type_document,
        fichier
      ],
      function(err) {

        if (err) {
          return erreurServeur(res, err);
        }

        recalculStatut(
          candidat_id,
          (nouveauStatut) => {

            res.json({
              message: "Document enregistré",
              statut: nouveauStatut
            });

          }
        );

      }
    );

  }
);

app.get("/documents/:candidatId", (req, res) => {

  const candidatId = req.params.candidatId;

  if (!idValide(candidatId)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  db.all(
    `
    SELECT *
    FROM documents
    WHERE candidat_id = ?
    `,
    [candidatId],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

app.delete("/documents/:id", verifierToken, autoriserRoles("admin"), (req, res) => {

  const documentId = req.params.id;

  if (!idValide(documentId)) {
    return res.status(400).json({
      message: "ID document invalide"
    });
  }

  db.get(
    `
    SELECT candidat_id, fichier
    FROM documents
    WHERE id = ?
    `,
    [documentId],
    (err, doc) => {

      if (err) {
        return erreurServeur(res, err);
      }

      if (!doc) {
        return res.status(404).json({
          message: "Document introuvable"
        });
      }

      const candidatId = doc.candidat_id;

      db.run(
        `
        DELETE FROM documents
        WHERE id = ?
        `,
        [documentId],
        function(err2) {

          if (err2) {
            return erreurServeur(res, err2);
          }

          const cheminFichier =
            path.join(__dirname, "uploads", doc.fichier);

          if (fs.existsSync(cheminFichier)) {

            fs.unlink(cheminFichier, (errSuppression) => {

              if (errSuppression) {
                console.error(
                  "Erreur suppression fichier :",
                  errSuppression
                );
              }

            });

          }

          recalculStatut(
            candidatId,
            (nouveauStatut) => {

              res.json({
                message: "Document supprimé",
                deleted: this.changes,
                statut: nouveauStatut
              });

            }
          );

        }
      );

    }
  );

});

/* =====================================
   STATS
===================================== */

app.get("/stats", (req, res) => {

  db.all(
    `
    SELECT
      f.code,
      COUNT(c.id) AS total
    FROM formations f
    LEFT JOIN candidats c
    ON c.formation_id = f.id
    GROUP BY f.id
    ORDER BY total DESC
    `,
    [],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

app.get("/stats/statuts", (req, res) => {

  db.all(
    `
    SELECT
      COALESCE(statut, 'En attente') AS statut,
      COUNT(*) AS total
    FROM candidats
    GROUP BY COALESCE(statut, 'En attente')
    ORDER BY total DESC
    `,
    [],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

/* =====================================
   HISTORIQUE
===================================== */

app.post("/historique", verifierToken, autoriserRoles("admin"), (req, res) => {

  const {
    candidat_id,
    action
  } = req.body;

  if (!idValide(candidat_id)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  if (!texte(action)) {
    return res.status(400).json({
      message: "Action invalide"
    });
  }

  const utilisateur =
    req.user?.username || "admin";

  const dateAction =
    dateHeureFrance();

  db.run(
    `
    INSERT INTO historique
    (
      candidat_id,
      action,
      utilisateur,
      date_action
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      candidat_id,
      texte(action).slice(0, 255),
      utilisateur,
      dateAction
    ],
    function(err) {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json({
        message: "Historique ajouté",
        id: this.lastID,
        date_action: dateAction
      });

    }
  );

});

app.get("/historique/:candidatId", (req, res) => {

  const candidatId = req.params.candidatId;

  if (!idValide(candidatId)) {
    return res.status(400).json({
      message: "ID candidat invalide"
    });
  }

  db.all(
    `
    SELECT *
    FROM historique
    WHERE candidat_id = ?
    ORDER BY date_action DESC
    `,
    [candidatId],
    (err, rows) => {

      if (err) {
        return erreurServeur(res, err);
      }

      res.json(rows);

    }
  );

});

/* =====================================
   GESTION ERREURS MULTER
===================================== */

app.use((err, req, res, next) => {

  if (err instanceof multer.MulterError) {

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Fichier trop volumineux. Maximum 5 Mo."
      });
    }

    return res.status(400).json({
      message: "Erreur lors de l'envoi du fichier"
    });

  }

  if (err.message === "Type de fichier non autorisé") {
    return res.status(400).json({
      message: "Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, WEBP."
    });
  }

  console.error(err);

  res.status(500).json({
    message: "Erreur serveur"
  });

});

/* =====================================
   BACKUP BASE DE DONNEES
===================================== */

app.get("/backup", verifierToken, autoriserRoles("admin"), (req, res) => {

  const cheminBase =
    path.join(__dirname, "ocf_est.db");

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  res.download(
    cheminBase,
    `sauvegarde_ocf_est_${date}.db`,
    (err) => {

      if (err) {
        console.error(err);

        if (!res.headersSent) {
          res.status(500).json({
            message: "Erreur lors de la sauvegarde"
          });
        }
      }

    }
  );

});

/* =====================================
   BACKUP COMPLET ZIP
===================================== */

app.get("/backup-complet", verifierToken, autoriserRoles("admin"), (req, res) => {

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  const nomFichier =
    `sauvegarde_complete_ocf_est_${date}.zip`;

  const cheminBase =
    path.join(__dirname, "ocf_est.db");

  const cheminUploads =
    path.join(__dirname, "uploads");

  if (!fs.existsSync(cheminBase)) {
    return res.status(404).json({
      message: "Base de données introuvable"
    });
  }

  res.setHeader(
    "Content-Type",
    "application/zip"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${nomFichier}"`
  );

  const archive = archiver("zip", {
    zlib: {
      level: 9
    }
  });

  archive.on("error", (err) => {
    console.error("Erreur archive :", err);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Erreur lors de la création du ZIP"
      });
    }
  });

  archive.pipe(res);

  archive.file(
    cheminBase,
    {
      name: "ocf_est.db"
    }
  );

  if (fs.existsSync(cheminUploads)) {
    archive.directory(
      cheminUploads,
      "uploads"
    );
  }

  archive.finalize();

});

/* =====================================
   SERVER
===================================== */

app.listen(3001, () => {
  console.log("Serveur démarré sur le port 3001");
});