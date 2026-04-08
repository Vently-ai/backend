-- AlterTable
ALTER TABLE `Diary` MODIFY `content` TEXT NOT NULL,
    MODIFY `summarizedContent` TEXT NULL;

-- AlterTable
ALTER TABLE `Message` MODIFY `content` TEXT NOT NULL;
