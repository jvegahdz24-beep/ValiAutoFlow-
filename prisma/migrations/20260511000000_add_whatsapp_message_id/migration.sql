-- Add whatsappMessageId column for efficient deduplication
-- WhatsApp wamid is unique per Meta message, enabling O(1) lookup
-- instead of JSON metadata string search

ALTER TABLE "messages" ADD COLUMN "whatsappMessageId" TEXT;

-- Create unique constraint on whatsappMessageId
-- NULL values are allowed (non-WhatsApp messages won't have this)
CREATE UNIQUE INDEX "messages_whatsappMessageId_key" ON "messages"("whatsappMessageId") WHERE "whatsappMessageId" IS NOT NULL;
