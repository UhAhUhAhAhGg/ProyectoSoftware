import './eventos.css';

const eventos = [
  {
    id: 1,
    titulo: "EL PALACIO SUENA",
    precio: "Bs. 70",
    fecha: "20/04/2026",
    lugar: "La Paz - Palacio Portales",
    imagen: "frontend/public/eventos/evento1.jpeg"
  },
  {
    id: 2,
    titulo: "GRUPO FIRME",
    precio: "Bs. 400",
    fecha: "20/04/2026",
    lugar: "Santa Cruz  - Estadio Real Santa Cruz",
    imagen: "frontend/public/eventos/evento2.jpeg"
  },
  {
    id: 3,
    titulo: "ALADDIN EL MUSICAL",
    precio: "Bs. 120",
    fecha: "20/04/2026",
    lugar: "Cochabamba - Teatro Acha",
    imagen: "frontend/public/eventos/evento3.jpeg"
  }
];


export default function EventosPage() {
  return (
    <div className="eventos-container">
      <h1 className="titulo">Eventos</h1>

      <div className="grid">
        {eventos.map((evento) => (
          <div className="card" key={evento.id}>
            <img src={evento.imagen} alt={evento.titulo} />

            <div className="card-content">
              <div className="card-header">
                <h3>{evento.titulo}</h3>
                <span>{evento.precio}</span>
              </div>

              <div className="card-info">
                <p>{evento.fecha}</p>
                <p>{evento.lugar}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}