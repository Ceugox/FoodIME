-- Add READY value to OrderStatus enum (was missing from DB but present in schema)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY' AFTER 'PAID';
