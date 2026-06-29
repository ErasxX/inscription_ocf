import { useState } from "react";

const API_URL =
  `http://${window.location.hostname}:3001`;

function Login({ setUser }) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const connexion = async (e) => {

    e.preventDefault();

    try {

      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

      const data = await response.json();

      if (response.ok) {

        sessionStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        sessionStorage.setItem(
          "token",
          data.token
        );

        sessionStorage.setItem(
          "role",
          data.user.role || "admin"
        );

        setUser(data.user);

      } else {

        alert(
          data.message || "Erreur de connexion"
        );

      }

    } catch (error) {

      console.error("Erreur connexion :", error);

      alert(
        "Impossible de contacter le serveur. Vérifie que le backend est lancé sur le port 3001."
      );

    }

  };

  return (

    <div className="login-page">

      <form
        className="login-card"
        onSubmit={connexion}
      >

        <h1>Connexion</h1>

        <p>
          Accès OCF-EST
        </p>

        <input
          type="text"
          placeholder="Identifiant"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button type="submit">
          Se connecter
        </button>

      </form>

    </div>

  );

}

export default Login;