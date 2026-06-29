function FinSaisie({ setUser }) {

  const retournerConnexion = () => {

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");

    if (typeof setUser === "function") {
      setUser();
      return;
    }

    window.location.reload();

  };

  return (

    <div className="login-page">

      <div className="login-card">

        <h1>✅ Candidat enregistré</h1>

        <p>
          Le candidat a bien été ajouté.
        </p>

        <p>
          Votre session est terminée.
        </p>

        <button onClick={retournerConnexion}>
          Retour à la connexion
        </button>

      </div>

    </div>

  );

}

export default FinSaisie;