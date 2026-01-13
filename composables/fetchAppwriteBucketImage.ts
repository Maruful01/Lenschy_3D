export const useAppwrite = () => {
  const config = useRuntimeConfig();

  const getAppwriteImageUrl = (id: string) => {
    if (!id) return "";
    return `https://fra.cloud.appwrite.io/v1/storage/buckets/${config.public.APPWRITE_PRESCRIPTION_BUCKET}/files/${id}/view?project=${config.public.APPWRITE_PROJECT_ID}`;
  };

  return { getAppwriteImageUrl };
};
