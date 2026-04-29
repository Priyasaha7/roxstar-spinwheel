import z from "zod";
import { Header } from "../../core/utils";
import { ZodAuthBearer } from "../../helpers/validator";

const apiKey = z.object({
  [Header.API_KEY]: z.string(),
});

const auth = z.object({
  authorization: ZodAuthBearer,
});

const signup = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const signin = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshToken = z.object({
  refreshToken: z.string().min(1),
});

export default { apiKey, auth, signup, signin, refreshToken };
