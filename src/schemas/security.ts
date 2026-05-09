import { z } from "zod";
import { Role, ContractType, UserStatus } from "@prisma/client";

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().max(30).optional(),
  role: z.nativeEnum(Role),
  position: z.string().max(80).optional(),
  category: z.string().max(40).optional(),
  contractType: z.nativeEnum(ContractType).optional(),
  hireDate: z.string().optional(), // YYYY-MM-DD
  // mot de passe initial : si vide, un email de reset sera envoyé
  password: z.string().min(8).max(100).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().max(30).optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  position: z.string().max(80).optional().nullable(),
  category: z.string().max(40).optional().nullable(),
  contractType: z.nativeEnum(ContractType).optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
