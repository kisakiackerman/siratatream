import { MongoClient, ServerApiVersion, type Db } from "mongodb";

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoConnectPromise: Promise<MongoClient | null> | undefined;
  var _mongoLastHint: string | undefined;
}

const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || "siratstream";

function resolveMongoUri(): string | null {
  const rawUri = process.env.MONGODB_URI?.trim();
  if (!rawUri) {
    return null;
  }

  if (rawUri.includes("<db_password>")) {
    const dbPassword = process.env.MONGODB_PASSWORD?.trim();
    if (!dbPassword) {
      return null;
    }
    return rawUri.replace("<db_password>", encodeURIComponent(dbPassword));
  }

  return rawUri;
}

function classifyMongoError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
  if (msg.includes("tlsv1 alert internal error") || msg.includes("SSL alert number 80")) {
    return "Connexion TLS refusée par MongoDB Atlas (Alert 80). Ajoutez 0.0.0.0/0 dans MongoDB Atlas → Network Access (IP Access List) et vérifiez que le cluster est actif.";
  }
  if (msg.includes("Authentication failed") || msg.includes("bad auth")) {
    return "Échec d'authentification MongoDB Atlas. Vérifiez l'utilisateur et le mot de passe dans MONGODB_URI / MONGODB_PASSWORD.";
  }
  if (msg.includes("Server selection timed out") || msg.includes("ENOTFOUND")) {
    return "Serveur MongoDB Atlas inaccessible ou délai dépassé. Vérifiez Network Access (0.0.0.0/0) et l'URL du cluster.";
  }
  return "Connexion MongoDB Atlas indisponible pour le moment.";
}

export function isMongoConfigured(): boolean {
  return resolveMongoUri() !== null;
}

export async function connectToMongoDB(): Promise<MongoClient | null> {
  if (global._mongoClient) {
    return global._mongoClient;
  }

  if (global._mongoConnectPromise) {
    return global._mongoConnectPromise;
  }

  const uri = resolveMongoUri();
  if (!uri) {
    global._mongoLastHint = "MONGODB_URI non configurée.";
    return null;
  }

  global._mongoConnectPromise = (async () => {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      family: 4,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      global._mongoClient = client;
      global._mongoLastHint = undefined;
      console.log("You successfully connected to MongoDB!");
      return client;
    } catch (err) {
      const hint = classifyMongoError(err);
      global._mongoLastHint = hint;
      console.warn("[MongoDB Notice]", hint);
      try {
        await client.close();
      } catch {
        // Ignore cleanup errors
      }
      global._mongoClient = undefined;
      return null;
    } finally {
      global._mongoConnectPromise = undefined;
    }
  })();

  return global._mongoConnectPromise;
}

export async function getMongoDb(dbName: string = DEFAULT_DB_NAME): Promise<Db | null> {
  const client = await connectToMongoDB();
  if (!client) {
    return null;
  }
  return client.db(dbName);
}

export async function pingMongoDB(): Promise<{
  configured: boolean;
  connected: boolean;
  hint?: string;
}> {
  const configured = isMongoConfigured();
  if (!configured) {
    return {
      configured: false,
      connected: false,
      hint: "MONGODB_URI non configurée.",
    };
  }

  const client = await connectToMongoDB();
  if (!client) {
    return {
      configured: true,
      connected: false,
      hint: global._mongoLastHint,
    };
  }

  try {
    await client.db("admin").command({ ping: 1 });
    return { configured: true, connected: true };
  } catch (err) {
    const hint = classifyMongoError(err);
    global._mongoLastHint = hint;
    return {
      configured: true,
      connected: false,
      hint,
    };
  }
}

// Call this only when your application terminates
export async function disconnectFromMongoDB(): Promise<void> {
  global._mongoConnectPromise = undefined;
  if (global._mongoClient) {
    const clientToClose = global._mongoClient;
    global._mongoClient = undefined;
    await clientToClose.close();
  }
}
