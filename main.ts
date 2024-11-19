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

  

  return new Response("Endpoint no encontrado", { status: 404 });
};

//-------------------------------------------------------------------------------------------------------------------------------
// Iniciar el servidor
Deno.serve({ port: 6768 }, handler);
