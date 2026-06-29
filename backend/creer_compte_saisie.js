const bcrypt = require("bcryptjs");
const db = require("./database");

const username = "saisie";
const password = "saisie123";

const hash = bcrypt.hashSync(password, 10);

db.run(
  "ALTER TABLE utilisateurs ADD COLUMN role TEXT DEFAULT 'admin'",
  (err) => {

    if (
      err &&
      !String(err.message).includes("duplicate column name")
    ) {
      console.error(err);
      return;
    }

    db.get(
      "SELECT id FROM utilisateurs WHERE username = ?",
      [username],
      (err2, user) => {

        if (err2) {
          console.error(err2);
          return;
        }

        if (user) {

          db.run(
            `
            UPDATE utilisateurs
            SET password = ?, role = ?
            WHERE username = ?
            `,
            [
              hash,
              "saisie",
              username
            ],
            (err3) => {

              if (err3) {
                console.error(err3);
                return;
              }

              console.log("Compte saisie mis à jour !");
              console.log("Identifiant :", username);
              console.log("Mot de passe :", password);

            }
          );

          return;

        }

        db.run(
          `
          INSERT INTO utilisateurs (
            username,
            password,
            role
          )
          VALUES (?, ?, ?)
          `,
          [
            username,
            hash,
            "saisie"
          ],
          (err4) => {

            if (err4) {
              console.error(err4);
              return;
            }

            console.log("Compte saisie créé !");
            console.log("Identifiant :", username);
            console.log("Mot de passe :", password);

          }
        );

      }
    );

  }
);