import { z } from "zod";

const COUNTRIES = ["FR", "BE", "LU", "CH", "MC", "DE", "ES", "IT", "NL", "PT", "AT", "IE"] as const;
export const SUPPORTED_COUNTRIES = COUNTRIES;

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Adresse requise").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().min(2, "Code postal requis").max(12),
  city: z.string().trim().min(1, "Ville requise").max(100),
  country: z.enum(COUNTRIES),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(200),
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    billing: addressSchema.optional(),
    shippingRateId: z.string().min(1, "Choisissez un mode de livraison"),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGV" }) }),
    customerNote: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.billingSameAsShipping || d.billing, { message: "Adresse de facturation requise", path: ["billing"] });
export type CheckoutInput = z.infer<typeof checkoutSchema>;
