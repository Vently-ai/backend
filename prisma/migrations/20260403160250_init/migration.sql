/*
  Warnings:

  - The primary key for the `Diary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Diary` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `Diary` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Diary` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `sessionId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`sessionId`);
