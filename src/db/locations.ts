import { db } from './index.ts';
import { savedLocations, users } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { getOrCreateUser } from './users.ts';

export async function getSavedLocations(uid: string, email: string) {
  try {
    const user = await getOrCreateUser(uid, email);
    return await db
      .select()
      .from(savedLocations)
      .where(eq(savedLocations.userId, user.id))
      .orderBy(desc(savedLocations.createdAt));
  } catch (error) {
    console.error("Database getSavedLocations failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function addSavedLocation(
  uid: string,
  email: string,
  data: {
    name: string;
    description?: string;
    category: string;
    lat: number;
    lng: number;
    placeId?: string;
    notes?: string;
  }
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const result = await db
      .insert(savedLocations)
      .values({
        userId: user.id,
        name: data.name,
        description: data.description || null,
        category: data.category,
        lat: data.lat,
        lng: data.lng,
        placeId: data.placeId || null,
        notes: data.notes || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database addSavedLocation failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteSavedLocation(uid: string, email: string, locationId: number) {
  try {
    const user = await getOrCreateUser(uid, email);
    await db
      .delete(savedLocations)
      .where(and(eq(savedLocations.id, locationId), eq(savedLocations.userId, user.id)));
    return { success: true };
  } catch (error) {
    console.error("Database deleteSavedLocation failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
