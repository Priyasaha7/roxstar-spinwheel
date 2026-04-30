import z from "zod";

const create = z.object({
  entryFee: z.number().min(1, "Entry fee must be at least 1 coin"),
});

const objectId = z.object({
  id: z.string().length(24, "Invalid spin wheel ID"),
});

export default { create, objectId };
