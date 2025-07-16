-- CreateTable
CREATE TABLE "default_prompts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mcp_server_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "arguments" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mcp_server_id" UUID NOT NULL,
    "uri" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mime_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_prompts_mcp_server_id_name_key" ON "default_prompts"("mcp_server_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "default_resources_mcp_server_id_uri_key" ON "default_resources"("mcp_server_id", "uri");

-- AddForeignKey
ALTER TABLE "default_prompts" ADD CONSTRAINT "default_prompts_mcp_server_id_fkey" FOREIGN KEY ("mcp_server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_resources" ADD CONSTRAINT "default_resources_mcp_server_id_fkey" FOREIGN KEY ("mcp_server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
