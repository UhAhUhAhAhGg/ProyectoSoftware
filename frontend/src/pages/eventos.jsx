import './eventos.css';

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
    lugar: "Santa Cruz  - Estadio Real Santa Cruz",
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
  return (
    <div className="container">
      <h1 className="titulo">Eventos Disponibles</h1>

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