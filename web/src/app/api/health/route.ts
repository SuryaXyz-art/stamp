import { json, route } from "@/lib/server/api";
import { features } from "@/lib/server/env";

/** Which backend features are on, so the UI can hide what isn't configured. */
export const GET = route({ bucket: "read" }, async () => json(features()));
