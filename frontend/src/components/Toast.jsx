import { useEffect, useState } from "react";

function Toast() {

  const [toasts, setToasts] = useState([]);

  useEffect(() => {

    window.showToast = (message, type = "info") => {

      const id = Date.now() + Math.random();

      setToasts(prev => [
        ...prev,
        {
          id,
          message,
          type
        }
      ]);

      setTimeout(() => {

        setToasts(prev =>
          prev.filter(toast => toast.id !== id)
        );

      }, 3500);

    };

    return () => {
      delete window.showToast;
    };

  }, []);

  const fermerToast = (id) => {

    setToasts(prev =>
      prev.filter(toast => toast.id !== id)
    );

  };

  return (

    <div className="toast-container">

      {toasts.map(toast => (

        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
        >

          <span>
            {toast.type === "success" && "✅"}
            {toast.type === "error" && "❌"}
            {toast.type === "warning" && "⚠️"}
            {toast.type === "info" && "ℹ️"}
          </span>

          <p>
            {toast.message}
          </p>

          <button
            onClick={() =>
              fermerToast(toast.id)
            }
          >
            ×
          </button>

        </div>

      ))}

    </div>

  );

}

export default Toast;