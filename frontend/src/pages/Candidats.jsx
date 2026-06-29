import { useEffect, useState } from "react";

function Candidats() {

  const [candidats, setCandidats] = useState([]);

  useEffect(() => {

    fetch("http://10.54.136.146:3001/candidats")
      .then(res => res.json())
      .then(data => {
        setCandidats(data);
      });

  }, []);

  return (
    <div>

      <h2>Liste des candidats</h2>

      <table
        border="1"
        width="100%"
        cellPadding="10"
      >
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Formation</th>
          </tr>
        </thead>

        <tbody>

          {candidats.map((candidat) => (

            <tr key={candidat.id}>
              <td>{candidat.nom}</td>
              <td>{candidat.prenom}</td>
              <td>{candidat.code}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default Candidats;