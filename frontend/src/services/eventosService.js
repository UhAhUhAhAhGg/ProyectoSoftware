// Simulación de base de datos local
const EVENTOS_STORAGE_KEY = 'ticketgo_eventos';

// Obtener eventos del localStorage
const getEventosStorage = () => {
  const eventos = localStorage.getItem(EVENTOS_STORAGE_KEY);
  return eventos ? JSON.parse(eventos) : [];
};

// Guardar eventos en localStorage
const guardarEventosStorage = (eventos) => {
  localStorage.setItem(EVENTOS_STORAGE_KEY, JSON.stringify(eventos));
};

// Datos de ejemplo con tipos de entrada
const eventosEjemplo = [
  {
    id: 1,
    nombre: 'Concierto de Rock',
    descripcion: 'La mejor banda de rock en vivo',
    fecha: '2024-04-15',
    hora: '20:00',
    ubicacion: 'Estadio Centenario',
    direccion: 'Av. Siempre Viva 123',
    ciudad: 'Buenos Aires',
    capacidad: 1000,
    boletosVendidos: 450,
    precio: 2500,
    imagen: 'https://via.placeholder.com/300x200?text=Rock',
    estado: 'activo',
    promotorId: 2,
    fechaCreacion: '2024-01-10',
    tiposEntrada: [
      {
        id: 101,
        nombre: 'General',
        descripcion: 'Acceso general al evento',
        precio: 2500,
        cupoMaximo: 600,
        cupoVendido: 300,
        estado: 'activo'
      },
      {
        id: 102,
        nombre: 'VIP',
        descripcion: 'Acceso preferencial con bebida incluida',
        precio: 5000,
        cupoMaximo: 200,
        cupoVendido: 80,
        estado: 'activo'
      },
      {
        id: 103,
        nombre: 'Platea',
        descripcion: 'Asiento numerado en platea',
        precio: 3500,
        cupoMaximo: 200,
        cupoVendido: 70,
        estado: 'activo'
      }
    ]
  },
  {
    id: 2,
    nombre: 'Festival de Jazz',
    descripcion: 'Noches de jazz al aire libre',
    fecha: '2024-05-20',
    hora: '19:30',
    ubicacion: 'Teatro Colón',
    direccion: 'Cerrito 628',
    ciudad: 'Buenos Aires',
    capacidad: 800,
    boletosVendidos: 120,
    precio: 1800,
    imagen: 'https://via.placeholder.com/300x200?text=Jazz',
    estado: 'activo',
    promotorId: 2,
    fechaCreacion: '2024-01-15',
    tiposEntrada: [
      {
        id: 201,
        nombre: 'General',
        descripcion: 'Acceso general',
        precio: 1800,
        cupoMaximo: 500,
        cupoVendido: 80,
        estado: 'activo'
      },
      {
        id: 202,
        nombre: 'Palco',
        descripcion: 'Palco con vista preferencial',
        precio: 3500,
        cupoMaximo: 300,
        cupoVendido: 40,
        estado: 'activo'
      }
    ]
  }
];

// Inicializar eventos si no existen
const inicializarEventos = () => {
  const eventos = getEventosStorage();
  if (eventos.length === 0) {
    guardarEventosStorage(eventosEjemplo);
  }
};
inicializarEventos();

export const eventosService = {
  // Obtener eventos disponibles para compradores
  getEventosDisponibles: () => {
    const eventos = getEventosStorage();
    return eventos.filter((e) => e.estado === 'activo');
  },

  // Obtener todos los eventos del promotor
  getEventosByPromotor: (promotorId) => {
    const eventos = getEventosStorage();
    return eventos.filter(e => e.promotorId === promotorId);
  },

  // Obtener un evento por ID
  getEventoById: (id) => {
    const eventos = getEventosStorage();
    return eventos.find(e => e.id === parseInt(id));
  },

  // Crear nuevo evento
  crearEvento: (eventoData, promotorId) => {
    const eventos = getEventosStorage();
    const nuevoEvento = {
      ...eventoData,
      id: Date.now(),
      promotorId,
      boletosVendidos: 0,
      estado: 'activo',
      fechaCreacion: new Date().toISOString().split('T')[0],
      tiposEntrada: [] // Inicializar sin tipos de entrada
    };
    eventos.push(nuevoEvento);
    guardarEventosStorage(eventos);
    return nuevoEvento;
  },

  // Actualizar evento
  actualizarEvento: (id, eventoData) => {
    const eventos = getEventosStorage();
    const index = eventos.findIndex(e => e.id === parseInt(id));
    if (index !== -1) {
      eventos[index] = { ...eventos[index], ...eventoData };
      guardarEventosStorage(eventos);
      return eventos[index];
    }
    return null;
  },

  // Eliminar evento (baja lógica)
  eliminarEvento: (id) => {
    const eventos = getEventosStorage();
    const index = eventos.findIndex(e => e.id === parseInt(id));
    if (index !== -1) {
      eventos[index].estado = 'cancelado';
      guardarEventosStorage(eventos);
      return true;
    }
    return false;
  },

  // Restaurar evento
  restaurarEvento: (id) => {
    const eventos = getEventosStorage();
    const index = eventos.findIndex(e => e.id === parseInt(id));
    if (index !== -1) {
      eventos[index].estado = 'activo';
      guardarEventosStorage(eventos);
      return true;
    }
    return false;
  },

  // ===== MÉTODOS PARA TIPOS DE ENTRADA =====

  // Obtener todos los tipos de entrada de un evento
  getTiposEntradaByEvento: (eventoId) => {
    const evento = eventosService.getEventoById(eventoId);
    return evento?.tiposEntrada || [];
  },

  // Obtener un tipo de entrada por ID
  getTipoEntradaById: (eventoId, tipoId) => {
    const evento = eventosService.getEventoById(eventoId);
    return evento?.tiposEntrada?.find(t => t.id === parseInt(tipoId));
  },

  // Crear nuevo tipo de entrada
  crearTipoEntrada: (eventoId, tipoData) => {
    const eventos = getEventosStorage();
    const eventoIndex = eventos.findIndex(e => e.id === parseInt(eventoId));
    
    if (eventoIndex !== -1) {
      if (!eventos[eventoIndex].tiposEntrada) {
        eventos[eventoIndex].tiposEntrada = [];
      }

      // Validar que no exceda la capacidad total del evento
      const sumaCuposActual = eventos[eventoIndex].tiposEntrada
        .filter(t => t.estado === 'activo')
        .reduce((sum, t) => sum + t.cupoMaximo, 0);
      
      if (sumaCuposActual + parseInt(tipoData.cupoMaximo) > eventos[eventoIndex].capacidad) {
        throw new Error('El cupo total de entradas no puede exceder la capacidad del evento');
      }

      const nuevoTipo = {
        ...tipoData,
        id: Date.now() + Math.floor(Math.random() * 1000),
        cupoVendido: 0,
        estado: 'activo'
      };

      eventos[eventoIndex].tiposEntrada.push(nuevoTipo);
      guardarEventosStorage(eventos);
      return nuevoTipo;
    }
    return null;
  },

  // Actualizar tipo de entrada
  actualizarTipoEntrada: (eventoId, tipoId, tipoData) => {
    const eventos = getEventosStorage();
    const eventoIndex = eventos.findIndex(e => e.id === parseInt(eventoId));
    
    if (eventoIndex !== -1) {
      const tipoIndex = eventos[eventoIndex].tiposEntrada?.findIndex(t => t.id === parseInt(tipoId));
      
      if (tipoIndex !== -1 && tipoIndex !== undefined) {
        const tipoActual = eventos[eventoIndex].tiposEntrada[tipoIndex];
        
        // Validar que no exceda la capacidad total (excepto para el mismo tipo)
        const otrosTipos = eventos[eventoIndex].tiposEntrada
          .filter((t, i) => i !== tipoIndex && t.estado === 'activo');
        
        const sumaOtrosCupos = otrosTipos.reduce((sum, t) => sum + t.cupoMaximo, 0);
        
        if (sumaOtrosCupos + parseInt(tipoData.cupoMaximo) > eventos[eventoIndex].capacidad) {
          throw new Error('El cupo total de entradas no puede exceder la capacidad del evento');
        }

        // No permitir reducir el cupo por debajo de lo ya vendido
        if (parseInt(tipoData.cupoMaximo) < tipoActual.cupoVendido) {
          throw new Error(`No puedes reducir el cupo por debajo de los boletos ya vendidos (${tipoActual.cupoVendido})`);
        }

        eventos[eventoIndex].tiposEntrada[tipoIndex] = {
          ...tipoActual,
          ...tipoData
        };
        
        guardarEventosStorage(eventos);
        return eventos[eventoIndex].tiposEntrada[tipoIndex];
      }
    }
    return null;
  },

  // Eliminar tipo de entrada (baja lógica)
  eliminarTipoEntrada: (eventoId, tipoId) => {
    const eventos = getEventosStorage();
    const eventoIndex = eventos.findIndex(e => e.id === parseInt(eventoId));
    
    if (eventoIndex !== -1) {
      const tipoIndex = eventos[eventoIndex].tiposEntrada?.findIndex(t => t.id === parseInt(tipoId));
      
      if (tipoIndex !== -1 && tipoIndex !== undefined) {
        // No permitir eliminar si ya tiene ventas
        if (eventos[eventoIndex].tiposEntrada[tipoIndex].cupoVendido > 0) {
          throw new Error('No se puede eliminar un tipo de entrada que ya tiene ventas');
        }

        eventos[eventoIndex].tiposEntrada[tipoIndex].estado = 'eliminado';
        guardarEventosStorage(eventos);
        return true;
      }
    }
    return false;
  },

  // Restaurar tipo de entrada
  restaurarTipoEntrada: (eventoId, tipoId) => {
    const eventos = getEventosStorage();
    const eventoIndex = eventos.findIndex(e => e.id === parseInt(eventoId));
    
    if (eventoIndex !== -1) {
      const tipoIndex = eventos[eventoIndex].tiposEntrada?.findIndex(t => t.id === parseInt(tipoId));
      
      if (tipoIndex !== -1 && tipoIndex !== undefined) {
        eventos[eventoIndex].tiposEntrada[tipoIndex].estado = 'activo';
        guardarEventosStorage(eventos);
        return true;
      }
    }
    return false;
  }
};