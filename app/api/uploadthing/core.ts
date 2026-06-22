import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { getSession } from '@/lib/admin'

const f = createUploadthing()

export const ourFileRouter = {
  // Images used inside articles + cover images
  imageUploader: f({
    image: { maxFileSize: '8MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession()
      if (!session?.user?.id) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl }
    }),

  // Videos embedded in articles
  videoUploader: f({
    video: { maxFileSize: '256MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession()
      if (!session?.user?.id) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
