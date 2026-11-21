-- Contraintes d'intégrité financières : aucune valeur monétaire négative.
ALTER TABLE "Product" ADD CONSTRAINT "product_price_nonneg" CHECK ("priceCents" >= 0 AND "costPriceCents" >= 0 AND ("salePriceCents" IS NULL OR "salePriceCents" >= 0) AND ("compareAtCents" IS NULL OR "compareAtCents" >= 0));
ALTER TABLE "Product" ADD CONSTRAINT "product_vat_range" CHECK ("vatRateBps" >= 0 AND "vatRateBps" <= 10000);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_price_nonneg" CHECK (("priceCents" IS NULL OR "priceCents" >= 0) AND ("costPriceCents" IS NULL OR "costPriceCents" >= 0));
ALTER TABLE "CartItem" ADD CONSTRAINT "cartitem_qty_pos" CHECK ("quantity" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "order_amounts_nonneg" CHECK ("subtotalCents" >= 0 AND "discountCents" >= 0 AND "shippingCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0 AND "refundedCents" >= 0 AND "refundedCents" <= "totalCents");
ALTER TABLE "OrderItem" ADD CONSTRAINT "orderitem_amounts" CHECK ("quantity" > 0 AND "unitPriceCents" >= 0 AND "lineTotalCents" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_amount_nonneg" CHECK ("amountCents" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "refund_amount_pos" CHECK ("amountCents" > 0);
ALTER TABLE "Inventory" ADD CONSTRAINT "inventory_nonneg" CHECK ("quantity" >= 0 AND "reserved" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Coupon" ADD CONSTRAINT "coupon_value_nonneg" CHECK ("value" >= 0);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "shippingrate_nonneg" CHECK ("priceCents" >= 0);
