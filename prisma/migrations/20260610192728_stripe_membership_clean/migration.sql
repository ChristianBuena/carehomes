-- CreateIndex
CREATE INDEX "Membership_stripeCustomerId_idx" ON "Membership"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Membership_stripeSubscriptionId_idx" ON "Membership"("stripeSubscriptionId");
