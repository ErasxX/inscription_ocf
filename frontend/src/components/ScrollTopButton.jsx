import { useEffect, useState } from "react";

function ScrollTopButton() {

  const [visible, setVisible] = useState(false);

  useEffect(() => {

    const verifierScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", verifierScroll);

    return () => {
      window.removeEventListener("scroll", verifierScroll);
    };

  }, []);

  const remonter = () => {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  };

  if (!visible) {
    return null;
  }

  return (

    <button
      className="scroll-top-btn"
      onClick={remonter}
      title="Remonter en haut"
    >
      ↑
    </button>

  );

}

export default ScrollTopButton;