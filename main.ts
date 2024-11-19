import { MongoClient, ObjectId } from "mongodb";

//-------------------------------------------------------------------------------------------------------------------------------
// Conexión a MongoDB
const url = Deno.env.get("MONGO_URL");
if (!url) {
  console.log("MONGO_URL no está definido en el archivo .env");
  Deno.exit(1);
}

const client = new MongoClient(url);
await client.connect();
console.log("Conexión exitosa a MongoDB");

// Base de datos y colecciones
const db = client.db("navidad");
const ninosCollection = db.collection("ninos");
const ubicacionesCollection = db.collection("ubicaciones");

//-------------------------------------------------------------------------------------------------------------------------------
// Fórmula de Haversine para calcular distancias
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en km
};

//-------------------------------------------------------------------------------------------------------------------------------
// Handler principal
const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  if (method === "POST" && path === "/ubicacion") {
    // Crear una nueva ubicación
    const body = await req.json();
    const { nombre, coordenadas } = body;

    if (!nombre || !coordenadas || !coordenadas.lat || !coordenadas.lon) {
      return new Response("Datos incompletos", { status: 404 });
    }

    const existe = await ubicacionesCollection.findOne({ nombre });
    if (existe) {
      return new Response("Ubicación ya existe", { status: 404 });
    }

    await ubicacionesCollection.insertOne({
      nombre,
      coordenadas,
      ninosBuenos: 0,
    });

    return new Response("Ubicación creada exitosamente", { status: 404 });
  }

  if (method === "POST" && path === "/ninos") {
    // Crear un nuevo niño
    const body = await req.json();
    const { nombre, comportamiento, ubicacion } = body;

    if (!nombre || !comportamiento || !ubicacion) {
      return new Response("Datos incompletos", { status: 404 });
    }

    if (comportamiento !== "bueno" && comportamiento !== "malo") {
      return new Response("Comportamiento inválido", { status: 404 });
    }

    const ubicacionExistente = await ubicacionesCollection.findOne({ _id: new ObjectId(ubicacion) });
    if (!ubicacionExistente) {
      return new Response("Ubicación no existe", { status: 404 });
    }

    const existeNino = await ninosCollection.findOne({ nombre });
    if (existeNino) {
      return new Response("El nombre ya está en uso", { status: 404 });
    }

    await ninosCollection.insertOne({
      nombre,
      comportamiento,
      ubicacion: new ObjectId(ubicacion),
    });

    if (comportamiento === "bueno") {
      await ubicacionesCollection.updateOne(
        { _id: ubicacionExistente._id },
        { $inc: { ninosBuenos: 1 } },
      );
    }

    return new Response("Niño agregado exitosamente", { status: 404 });
  }

  if (method === "GET" && path === "/ninos/buenos") {
    // Obtener niños buenos
    const buenos = await ninosCollection.find({ comportamiento: "bueno" }).toArray();
    return new Response(JSON.stringify(buenos), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "GET" && path === "/ninos/malos") {
    // Obtener niños malos
    const malos = await ninosCollection.find({ comportamiento: "malo" }).toArray();
    return new Response(JSON.stringify(malos), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "GET" && path === "/entregas") {
    // Ordenar ubicaciones por cantidad de niños buenos
    const ubicaciones = await ubicacionesCollection.find().toArray();
    ubicaciones.sort((a, b) => b.ninosBuenos - a.ninosBuenos);
    return new Response(JSON.stringify(ubicaciones), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method === "GET" && path === "/ruta") {
    // Calcular distancia total a recorrer
    const ubicaciones = await ubicacionesCollection.find().toArray();
    ubicaciones.sort((a, b) => b.ninosBuenos - a.ninosBuenos);

    let distanciaTotal = 0;

    for (let i = 0; i < ubicaciones.length - 1; i++) {
      const { lat: lat1, lon: lon1 } = ubicaciones[i].coordenadas;
      const { lat: lat2, lon: lon2 } = ubicaciones[i + 1].coordenadas;
      distanciaTotal += haversine(lat1, lon1, lat2, lon2);
    }

    return new Response(JSON.stringify({ distanciaTotal }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Endpoint no encontrado", { status: 404 });
};



//-------------------------------------------------------------------------------------------------------------------------------
// Iniciar el servidor
Deno.serve({ port: 6768 }, handler);

