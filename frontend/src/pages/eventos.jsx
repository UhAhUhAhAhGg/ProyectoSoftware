import './eventos.css';
import { useState, useEffect } from "react";

const eventos = [
  {
    id: 1,
    titulo: "EL PALACIO SUENA",
    precio: "Bs. 70",
    fecha: "20/04/2026",
    lugar: "La Paz - Palacio Portales",
    imagen: "/eventos/evento1.jpeg"
  },
  {
    id: 2,
    titulo: "GRUPO FIRME",
    precio: "Bs. 400",
    fecha: "20/04/2026",
    lugar: "Santa Cruz - Estadio Real Santa Cruz",
    imagen: "/eventos/evento2.jpeg"
  },
  {
    id: 3,
    titulo: "ALADDIN EL MUSICAL",
    precio: "Bs. 120",
    fecha: "20/04/2026",
    lugar: "Cochabamba - Teatro Acha",
    imagen: "/eventos/evento3.jpeg"
  }
];

export default function EventosPage() {

  // 🔥 CARRUSEL INDEPENDIENTE
  const carrusel = [
    {
      imagen: "/eventos/bannertres.jpeg",
      titulo: "EX EMPLOYEE EXPERIENCE",
      descripcion: "La Paz - Palacio Portales"
    },
    {
      imagen: "/eventos/gmbanner.jpeg",
      titulo: "GRUPO FIRME",
      descripcion: "Santa Cruz - Estadio Real Santa Cruz"
    },
    {
      imagen: "/eventos/an banner.jpeg",
      titulo: "ALADDIN EL MUSICAL",
      descripcion: "Cochabamba - Teatro Acha"
    }
  ];

  const [index, setIndex] = useState(0);

  // 🔁 AUTO PLAY
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndex((prev) => (prev + 1) % carrusel.length);
    }, 3000);

    return () => clearInterval(intervalo);
  }, [carrusel.length]);

  return (
    <div className="container">

      {/* 🔥 CARRUSEL PRO */}
      <div className="carrusel">

        <img
          src={carrusel[index].imagen}
          alt={carrusel[index].titulo}
          className="carrusel-img fade"
        />

        {/* 🌫 Overlay */}
        <div className="overlay"></div>

        {/* 📝 TEXTO DINÁMICO */}
        <div className="carrusel-texto">
          <h2>{carrusel[index].titulo}</h2>
          <p>{carrusel[index].descripcion}</p>
        </div>

        {/* BOTONES */}
        <button
          className="prev"
          onClick={() =>
            setIndex((index - 1 + carrusel.length) % carrusel.length)
          }
        >
          ❮
        </button>

        <button
          className="next"
          onClick={() =>
            setIndex((index + 1) % carrusel.length)
          }
        >
          ❯
        </button>

        {/* ⚪ DOTS */}
        <div className="dots">
          {carrusel.map((_, i) => (
            <span
              key={i}
              className={i === index ? "dot active" : "dot"}
              onClick={() => setIndex(i)}
            ></span>
          ))}
        </div>

      </div>

      <h1 className="titulo">Eventos Disponibles</h1>

      {/* 🔥 TARJETAS */}
      <div className="grid">
        {eventos.map((evento) => (
          <div className="card" key={evento.id}>
            <div className="image-container">
              <img src={evento.imagen} alt={evento.titulo} />
              <span className="precio">{evento.precio}</span>
            </div>

            <div className="content">
              <h3>{evento.titulo}</h3>

              <div className="info">
                <p>📅 {evento.fecha}</p>
                <p>📍 {evento.lugar}</p>
              </div>

              <button className="btn">Ver evento</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

