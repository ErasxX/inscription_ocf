import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import NouveauCandidat from "./pages/NouveauCandidat";
import Login from "./pages/Login";
import Menu from "./components/Menu";
import DossiersRelance from "./pages/DossiersRelance";
import CandidaturesFinalisees from "./pages/CandidaturesFinalisees";
import Sauvegarde from "./pages/Sauvegarde";
import FinSaisie from "./pages/FinSaisie";
import Toast from "./components/Toast";
import ScrollTopButton from "./components/ScrollTopButton";

function App() {

  const [page, setPage] = useState("dashboard");
  const [dashboardKey, setDashboardKey] = useState(0);

  const [user, setUser] = useState(() => {

    const userStocke =
      sessionStorage.getItem("user");

    if (!userStocke) {
      return null;
    }

    try {
      return JSON.parse(userStocke);
    } catch (error) {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      return null;
    }

  });

  const notifier = (message, type = "info") => {

    if (window.showToast) {
      window.showToast(message, type);
    }

  };

  const nettoyerSession = () => {

    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");

  };

  const changerPage = (nouvellePage) => {

    if (nouvellePage === "dashboard") {
      setDashboardKey(prev => prev + 1);
    }

    setPage(nouvellePage);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  };

  const deconnexion = () => {

    nettoyerSession();

    setUser(null);
    setPage("dashboard");
    setDashboardKey(prev => prev + 1);

    notifier("Déconnexion réussie", "success");

  };

  const terminerSaisie = () => {

    nettoyerSession();

    setUser(null);
    setPage("fin-saisie");

  };

  const retourConnexionDepuisFinSaisie = () => {

    nettoyerSession();

    setUser(null);
    setPage("dashboard");

  };

  if (page === "fin-saisie") {

    return (
      <>
        <Toast />

        <FinSaisie
          setUser={retourConnexionDepuisFinSaisie}
        />
      </>
    );

  }

  if (!user) {

    return (
      <>
        <Toast />

        <Login
          setUser={(userConnecte) => {

            const roleConnecte =
              userConnecte?.role ||
              sessionStorage.getItem("role") ||
              "admin";

            setUser({
              ...userConnecte,
              role: roleConnecte
            });

            if (roleConnecte === "saisie") {
              setPage("nouveau");
            } else {
              setPage("dashboard");
              setDashboardKey(prev => prev + 1);
            }

          }}
        />
      </>
    );

  }

  const role =
    user.role ||
    sessionStorage.getItem("role") ||
    "admin";

  const estSaisie =
    role === "saisie";

  const estAdmin =
    role === "admin";

  if (estSaisie) {

  return (

    <>

      <Toast />
      <ScrollTopButton />

      <div className="app">

        <main className="content">

          <div className="saisie-top-bar">

            <button
              className="saisie-logout-btn"
              onClick={deconnexion}
            >
              Se déconnecter
            </button>

          </div>

          <NouveauCandidat
            apresCreation={terminerSaisie}
          />

        </main>

      </div>

    </>

  );

}

  if (!estAdmin) {

    nettoyerSession();

    return (
      <>
        <Toast />

        <Login setUser={setUser} />
      </>
    );

  }

  return (

    <>

      <Toast />
      <ScrollTopButton />

      <div className="app">

        <Menu
          page={page}
          setPage={changerPage}
          deconnexion={deconnexion}
        />

        <main className="content">

          {page === "dashboard" && (
            <Dashboard key={dashboardKey} />
          )}

          {page === "nouveau" && (
            <NouveauCandidat />
          )}

          {page === "relance" && (
            <DossiersRelance />
          )}

          {page === "finalisees" && (
            <CandidaturesFinalisees />
          )}

          {page === "sauvegarde" && (
            <Sauvegarde />
          )}

          {![
            "dashboard",
            "nouveau",
            "relance",
            "finalisees",
            "sauvegarde"
          ].includes(page) && (
            <Dashboard key={dashboardKey} />
          )}

        </main>

      </div>

    </>

  );

}

export default App;