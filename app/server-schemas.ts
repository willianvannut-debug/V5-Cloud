// ============================================================
// V5 FIBRA — Schemas de validacao (Zod) para Servidores MikroTik
// ============================================================
import { z } from 'zod'

export const serverCreateSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  ip_address: z
    .string()
    .min(7, 'IP invalido')
    .max(45, 'IP invalido')
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}$|^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Informe um IP valido (ex: 192.168.1.1) ou hostname'
    ),
  api_port: z.coerce
    .number()
    .int()
    .min(1, 'Porta minima: 1')
    .max(65535, 'Porta maxima: 65535')
    .default(8728),
  api_ssl: z.boolean().default(false),
  api_user: z
    .string()
    .min(1, 'Usuario obrigatorio')
    .max(100, 'Usuario muito longo'),
  api_password: z
    .string()
    .min(1, 'Senha obrigatoria')
    .max(200, 'Senha muito longa'),
  notes: z.string().max(500, 'Notas: maximo 500 caracteres').optional().or(z.literal('')),
})

export const serverUpdateSchema = serverCreateSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
})

export const testConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
})

export type ServerCreateInput = z.infer<typeof serverCreateSchema>
export type ServerUpdateInput = z.infer<typeof serverUpdateSchema>
export type TestConnectionInput = z.infer<typeof testConnectionSchema>