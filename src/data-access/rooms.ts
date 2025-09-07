import { db } from "@/db";
import { Room, room } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

/**
 * Fetch all rooms, optionally filtered by tags search.
 * Note: don't pass an empty object to `where` — call findMany() without options instead.
 */
export async function getRooms(search?: string) {
  if (search && search.trim() !== "") {
    return await db.query.room.findMany({
      where: like(room.tags, `%${search}%`),
    });
  }

  // No filter — call findMany without `where`
  return await db.query.room.findMany();
}

/**
 * Fetch rooms for authenticated user
 */
export async function getUserRooms() {
  const session = await getSession();
  if (!session) throw new Error("User not authenticated");

  return await db.query.room.findMany({
    where: eq(room.userId, session.user.id),
  });
}

/**
 * Fetch a single room by id
 */
export async function getRoom(roomId: string) {
  return await db.query.room.findFirst({
    where: eq(room.id, roomId),
  });
}

/**
 * Delete room by id
 */
export async function deleteRoom(roomId: string) {
  await db.delete(room).where(eq(room.id, roomId));
}

/**
 * Create a room. We generate a UUID for `id` in code so we can reliably fetch the inserted row.
 */
export async function createRoom(
  roomData: Omit<Room, "id" | "userId">,
  userId: string
) {
  const id = uuidv4();
  await db.insert(room).values({
    id,
    userId,
    ...roomData,
  });

  const insertedRoom = await getRoom(id);
  if (!insertedRoom) throw new Error("Failed to fetch inserted room after create");
  return insertedRoom;
}

/**
 * Update room and return updated row
 */
export async function editRoom(roomData: Room) {
  await db.update(room).set(roomData).where(eq(room.id, roomData.id));
  const updatedRoom = await getRoom(roomData.id);
  if (!updatedRoom) throw new Error("Failed to fetch updated room after edit");
  return updatedRoom;
}
