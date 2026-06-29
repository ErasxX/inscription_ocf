const sqlite3 = require("sqlite3").verbose();

const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./ocf_est.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Base de données connectée");
  }
});

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS formations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      libelle TEXT NOT NULL
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO formations (id, code, libelle)
    VALUES
    (1, 'CAP EMP COM', 'Employé commercial'),
    (2, 'CAP AEPE', 'Accompagnant Éducatif Petite Enfance'),
    (3, 'CAP SC', 'Secrétaire comptable'),

    (4, 'BAC CDV', 'Conseiller de vente'),
    (5, 'BAC CDC', 'Conseiller commercial'),
    (6, 'BAC IEPE', 'Intervenant Éducatif Petite Enfance'),
    (7, 'BAC AMUM', 'Assistant Manager d''Unité Marchande'),

    (8, 'BAC +2 MEM', 'Manager d''établissement marchand'),
    (9, 'BAC +2 AD', 'Assistant de direction'),

    (10, 'BAC +3 REM', 'Responsable d''établissement marchand')
  `);

});

db.run(`
  CREATE TABLE IF NOT EXISTS candidats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    civilite TEXT,

    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,

    date_naissance TEXT,
    lieu_naissance TEXT,
    nationalite TEXT,

    adresse TEXT,
    code_postal TEXT,
    ville TEXT,

    telephone TEXT,
    email TEXT,

    situation_actuelle TEXT,
    dernier_diplome TEXT,

    representant_nom TEXT,
    representant_telephone TEXT,
    representant_email TEXT,

    formation_id INTEGER,

    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (formation_id)
    REFERENCES formations(id)
  )
`);



db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    candidat_id INTEGER,

    type_document TEXT,

    fichier TEXT,

    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (candidat_id)
    REFERENCES candidats(id)
  )
`);

db.run(
  `
  ALTER TABLE candidats
  ADD COLUMN statut TEXT DEFAULT 'En attente'
  `,
  (err) => {

    if (err) {

      console.log(
        "Colonne statut déjà existante"
      );

    } else {

      console.log(
        "Colonne statut ajoutée"
      );

    }

  }
);

db.run(
  `
  UPDATE candidats
  SET statut = 'En attente'
  WHERE statut IS NULL
  `
);

db.run(
  `
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
  `
);


/* =====================================
   UTILISATEURS ADMIN
===================================== */

db.run(
  `
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
  `
);

const motDePasseAdmin = bcrypt.hashSync(
  "ocfest2026",
  10
);

db.run(
  `
  INSERT OR IGNORE INTO utilisateurs
  (
    username,
    password
  )
  VALUES (?, ?)
  `,
  [
    "admin",
    motDePasseAdmin
  ]
);

/* =====================================
   HISTORIQUE
===================================== */

db.run(
  `
  CREATE TABLE IF NOT EXISTS historique (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidat_id INTEGER,
    action TEXT,
    utilisateur TEXT,
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidat_id) REFERENCES candidats(id)
  )
  `
);

module.exports = db;